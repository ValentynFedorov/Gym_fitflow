import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceDomainEvent } from '../domain/attendance.events';

@Injectable()
export class XpService {
  constructor(private readonly prisma: PrismaService) {}

  async handleEvent(event: AttendanceDomainEvent) {
    if (event.type === 'CHECK_OUT_COMPLETED') {
      await this.handleCheckOut(event);
    }
  }

  private async handleCheckOut(event: AttendanceDomainEvent & { type: 'CHECK_OUT_COMPLETED' }) {
    const visit = await this.prisma.visit.findUnique({ where: { id: event.visitId } });
    if (!visit || !visit.durationMin) return;

    const userId = event.userId;
    const duration = visit.durationMin;

    const baseXp = duration + 10;
    const hour = visit.checkInTime.getHours();
    const earlyBirdBonus = hour < 8 ? 20 : 0;
    const gainedXp = baseXp + earlyBirdBonus;

    await this.addXp(userId, gainedXp);
  }

  private async addXp(userId: string, amount: number) {
    const xp = await this.prisma.xpProgress.upsert({
      where: { userId },
      create: {
        userId,
        xpTotal: amount,
        xpThisLevel: amount,
        xpToNextLevel: 100,
        level: 1,
      },
      update: {
        xpTotal: { increment: amount },
        xpThisLevel: { increment: amount },
      },
    });

    let current = xp;
    while (current.xpThisLevel >= current.xpToNextLevel) {
      const overflow = current.xpThisLevel - current.xpToNextLevel;
      current = await this.prisma.xpProgress.update({
        where: { id: current.id },
        data: {
          level: { increment: 1 },
          xpThisLevel: overflow,
          xpToNextLevel: Math.round(current.xpToNextLevel * 1.2),
          lastLevelUpAt: new Date(),
        },
      });

      await this.ensureAchievement(
        userId,
        `LEVEL_${current.level}`,
        `Level ${current.level}`,
        'trophy',
        `Reached level ${current.level}`,
      );
    }
  }

  private async ensureAchievement(
    userId: string,
    key: string,
    name: string,
    icon: string,
    description: string,
  ) {
    const achievement = await this.prisma.achievement.upsert({
      where: { name },
      create: {
        name,
        icon,
        description,
      },
      update: {},
    });

    await this.prisma.userAchievement.upsert({
      where: {
        userId_achievementId: {
          userId,
          achievementId: achievement.id,
        },
      },
      create: {
        userId,
        achievementId: achievement.id,
      },
      update: {},
    });
  }
}
