import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceDomainEvent } from '../domain/attendance.events';

const STREAK_ACHIEVEMENTS: Array<{ days: number; key: string; icon: string }> = [
  { days: 3,   key: 'STREAK_3',   icon: 'flame' },
  { days: 7,   key: 'STREAK_7',   icon: 'flame' },
  { days: 30,  key: 'STREAK_30',  icon: 'flame' },
  { days: 100, key: 'STREAK_100', icon: 'trophy' },
];

function dateOnly(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysBetween(a: Date, b: Date): number {
  const ms = dateOnly(a).getTime() - dateOnly(b).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

/**
 * Tracks "consecutive days with a completed visit" per user.
 *
 *  - handleEvent(CHECK_OUT_COMPLETED) bumps the streak when the visit is on a
 *    new day; if the last visit was yesterday → +1, if today → unchanged,
 *    otherwise → reset to 1.
 *  - The nightly cron resets streaks for anyone whose last visit was >= 2
 *    days ago, so the UI always shows the current truth.
 *  - When a milestone is hit (3/7/30/100), a matching Achievement is awarded.
 */
@Injectable()
export class StreakService {
  private readonly logger = new Logger(StreakService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleEvent(event: AttendanceDomainEvent): Promise<void> {
    if (event.type !== 'CHECK_OUT_COMPLETED') return;
    const today = dateOnly(event.occurredAt);

    const xp = await this.prisma.xpProgress.findUnique({
      where: { userId: event.userId },
    });

    let nextCurrent: number;
    if (!xp || !xp.lastVisitDate) {
      nextCurrent = 1;
    } else {
      const diff = daysBetween(today, xp.lastVisitDate);
      if (diff === 0) {
        // same day — already counted
        return;
      } else if (diff === 1) {
        nextCurrent = xp.currentStreak + 1;
      } else {
        nextCurrent = 1;
      }
    }

    const nextLongest = Math.max(xp?.longestStreak ?? 0, nextCurrent);

    await this.prisma.xpProgress.upsert({
      where: { userId: event.userId },
      create: {
        userId: event.userId,
        currentStreak: nextCurrent,
        longestStreak: nextLongest,
        lastVisitDate: today,
      },
      update: {
        currentStreak: nextCurrent,
        longestStreak: nextLongest,
        lastVisitDate: today,
      },
    });

    await this.unlockMilestones(event.userId, nextCurrent);
  }

  // Reset stale streaks every night just after midnight.
  @Cron(CronExpression.EVERY_DAY_AT_1AM, { name: 'streak-cleanup' })
  async resetStaleStreaks(): Promise<void> {
    const today = dateOnly(new Date());
    const stale = await this.prisma.xpProgress.findMany({
      where: {
        currentStreak: { gt: 0 },
        OR: [
          { lastVisitDate: null },
          { lastVisitDate: { lt: new Date(today.getTime() - 24 * 60 * 60 * 1000) } },
        ],
      },
      select: { id: true },
    });
    if (stale.length === 0) return;
    await this.prisma.xpProgress.updateMany({
      where: { id: { in: stale.map((s) => s.id) } },
      data: { currentStreak: 0 },
    });
    this.logger.log(`Reset ${stale.length} stale streaks`);
  }

  async getStreakForUser(userId: string) {
    const xp = await this.prisma.xpProgress.findUnique({ where: { userId } });
    return {
      currentStreak: xp?.currentStreak ?? 0,
      longestStreak: xp?.longestStreak ?? 0,
      lastVisitDate: xp?.lastVisitDate ?? null,
    };
  }

  private async unlockMilestones(userId: string, currentStreak: number) {
    const hits = STREAK_ACHIEVEMENTS.filter((a) => a.days === currentStreak);
    for (const hit of hits) {
      const name = `${hit.days}-day streak`;
      const achievement = await this.prisma.achievement.upsert({
        where: { name },
        create: {
          name,
          icon: hit.icon,
          description: `Visited the gym ${hit.days} days in a row`,
        },
        update: {},
      });
      await this.prisma.userAchievement.upsert({
        where: {
          userId_achievementId: { userId, achievementId: achievement.id },
        },
        create: { userId, achievementId: achievement.id },
        update: {},
      });
    }
  }
}
