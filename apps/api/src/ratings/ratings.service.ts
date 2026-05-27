import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus } from '@prisma/client';

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  // A rater can rate a class once. Must have attended (CONFIRMED booking) and
  // the class must be over.
  async createRating(raterId: string, classId: string, stars: number, comment?: string) {
    if (stars < 1 || stars > 5) {
      throw new BadRequestException('stars must be 1..5');
    }

    const clazz = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, endTime: true, trainerId: true },
    });
    if (!clazz) throw new NotFoundException('Class not found');
    if (clazz.endTime > new Date()) {
      throw new BadRequestException('Class has not finished yet');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { userId_classId: { userId: raterId, classId } },
    });
    if (!booking || booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Must have attended the class to rate it');
    }

    return this.prisma.trainerRating.upsert({
      where: { classId_raterId: { classId, raterId } },
      create: {
        classId,
        raterId,
        trainerId: clazz.trainerId,
        stars,
        comment,
      },
      update: { stars, comment },
    });
  }

  async myRatingFor(raterId: string, classId: string) {
    return this.prisma.trainerRating.findUnique({
      where: { classId_raterId: { classId, raterId } },
    });
  }

  async leaderboard(limit = 10) {
    const rows = await this.prisma.trainerRating.groupBy({
      by: ['trainerId'],
      _avg: { stars: true },
      _count: { _all: true },
      orderBy: [{ _avg: { stars: 'desc' } }],
      take: limit,
      having: { stars: { _count: { gt: 0 } } },
    });

    const trainers = await this.prisma.user.findMany({
      where: { id: { in: rows.map((r) => r.trainerId) } },
      select: { id: true, email: true, profileData: true },
    });
    const tmap = new Map(trainers.map((t) => [t.id, t]));

    return rows.map((r, idx) => ({
      rank: idx + 1,
      trainerId: r.trainerId,
      email: tmap.get(r.trainerId)?.email ?? '?',
      name: (tmap.get(r.trainerId)?.profileData as any)?.name ?? null,
      avgStars: r._avg.stars ? Math.round((r._avg.stars + Number.EPSILON) * 100) / 100 : 0,
      ratingsCount: r._count._all,
    }));
  }

  async recentForTrainer(trainerId: string, limit = 20) {
    return this.prisma.trainerRating.findMany({
      where: { trainerId },
      include: {
        class: { select: { title: true, startTime: true } },
        rater: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
