import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GamificationService {
  constructor(private readonly prisma: PrismaService) {}

  listAchievements() {
    return this.prisma.achievement.findMany();
  }

  userAchievements(userId: string) {
    return this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
    });
  }

  async leaderboard(limit = 20) {
    const rows = await this.prisma.xpProgress.findMany({
      orderBy: { xpTotal: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    return rows.map((row, index) => ({
      rank: index + 1,
      userId: row.userId,
      email: row.user.email,
      xpTotal: row.xpTotal,
      level: row.level,
    }));
  }

  async monthlyReport(userId: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const visits = await this.prisma.visit.findMany({
      where: {
        userId,
        checkInTime: { gte: start, lt: end },
      },
      include: { zone: true },
    });

    const totalVisits = visits.length;
    const totalMinutes = visits.reduce(
      (sum, v) => sum + (v.durationMin ?? 0),
      0,
    );

    const byZone = new Map<string, { name: string; count: number }>();
    visits.forEach((v) => {
      const key = v.zoneId;
      const entry = byZone.get(key) ?? {
        name: v.zone.name,
        count: 0,
      };
      entry.count += 1;
      byZone.set(key, entry);
    });

    const favoriteZones = Array.from(byZone.values()).sort(
      (a, b) => b.count - a.count,
    );

    const totalCalories = visits.reduce(
      (sum, v) => sum + (v.calories ?? (v.durationMin ?? 0) * 8),
      0,
    );

    return {
      month,
      year,
      totalVisits,
      totalMinutes,
      totalCalories,
      favoriteZones,
      visitsTimeline: visits.map((v) => ({
        id: v.id,
        date: v.checkInTime,
        durationMin: v.durationMin ?? 0,
        zoneName: v.zone.name,
      })),
    };
  }

  async xpForUser(userId: string) {
    const xp = await this.prisma.xpProgress.findUnique({ where: { userId } });
    if (!xp) {
      return {
        userId,
        level: 1,
        xpTotal: 0,
        xpThisLevel: 0,
        xpToNextLevel: 100,
      };
    }

    return {
      userId,
      level: xp.level,
      xpTotal: xp.xpTotal,
      xpThisLevel: xp.xpThisLevel,
      xpToNextLevel: xp.xpToNextLevel,
    };
  }
}
