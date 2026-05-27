import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { OccupancyGateway } from '../websocket/occupancy.gateway';
import { Role, SubscriptionStatus, VisitStatus } from '@prisma/client';
import { RedisService } from '../redis/redis.service';
import { XpService } from '../gamification/xp.service';
import { StreakService } from '../gamification/streak.service';
import { AttendanceDomainEvent } from '../domain/attendance.events';

@Injectable()
export class AttendanceService {
  private readonly redis = this.redisService.getClient();

  constructor(
    private readonly prisma: PrismaService,
    private readonly occupancyGateway: OccupancyGateway,
    private readonly redisService: RedisService,
    private readonly xpService: XpService,
    private readonly streakService: StreakService,
    private readonly jwtService: JwtService,
  ) {}

  generateQrToken(userId: string, zoneId?: string) {
    const payload: Record<string, unknown> = {
      sub: userId,
      type: 'CHECK_IN_QR',
    };
    if (zoneId) payload.zoneId = zoneId;

    return this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: '5m',
    });
  }

  async checkIn(userId: string, zoneId: string) {
    const now = new Date();

    const rateKey = `rate:checkin:${userId}:${now.toISOString().slice(0, 13)}`;
    const attempts = await this.redis.incr(rateKey);
    if (attempts === 1) {
      await this.redis.expire(rateKey, 60 * 60);
    }
    if (attempts > 30) {
      throw new BadRequestException('Too many check-in attempts. Please try later.');
    }

    return this.prisma.$transaction(async (tx) => {
      const subscription = await tx.userSubscription.findFirst({
        where: {
          userId,
          status: SubscriptionStatus.ACTIVE,
          startDate: { lte: now },
          endDate: { gte: now },
        },
        include: { type: true },
      });

      if (!subscription) {
        throw new BadRequestException('No active subscription');
      }

      if (
        subscription.type.visitsLimit !== null &&
        (subscription.remainingVisits ?? 0) <= 0
      ) {
        throw new BadRequestException('No remaining visits');
      }

      const zone = await tx.gymZone.findUnique({ where: { id: zoneId } });
      if (!zone) throw new BadRequestException('Zone not found');

      if (zone.currentOccupancy >= zone.maxCapacity) {
        throw new BadRequestException('Zone is at full capacity');
      }

      const visit = await tx.visit.create({
        data: {
          userId,
          subscriptionId: subscription.id,
          zoneId,
          checkInTime: now,
          status: VisitStatus.IN_GYM,
        },
      });

      if (subscription.type.visitsLimit !== null) {
        await tx.userSubscription.update({
          where: { id: subscription.id },
          data: {
            remainingVisits:
              (subscription.remainingVisits ?? subscription.type.visitsLimit) - 1,
          },
        });
      }

      const updatedZone = await tx.gymZone.update({
        where: { id: zone.id },
        data: {
          currentOccupancy: { increment: 1 },
        },
      });

      await this.redis.incr(`gym:occupancy:zone:${zoneId}`);
      const totalInGym = await tx.visit.count({
        where: { status: VisitStatus.IN_GYM },
      });
      await this.redis.set('gym:occupancy:total', String(totalInGym));

      this.occupancyGateway.emitZoneUpdate(
        updatedZone.id,
        updatedZone.currentOccupancy,
        updatedZone.maxCapacity,
      );
      this.occupancyGateway.emitGlobalUpdate(totalInGym);
      this.occupancyGateway.emitAdminEvent({
        type: 'CHECK_IN',
        payload: {
          visitId: visit.id,
          userId,
          zoneId,
          at: now.toISOString(),
        },
      });

      return visit;
    });
  }

  async checkOut(visitId: string, currentUser: { id: string; role: Role }) {
    const now = new Date();

    const { updatedVisit, event } = await this.prisma.$transaction(
      async (tx) => {
        const visit = await tx.visit.findUnique({ where: { id: visitId } });
        if (!visit) throw new BadRequestException('Visit not found');

        const isStaff =
          currentUser.role === Role.ADMIN || currentUser.role === Role.TRAINER;
        if (!isStaff && visit.userId !== currentUser.id) {
          throw new ForbiddenException('You can only check out your own visits');
        }

        if (visit.status !== VisitStatus.IN_GYM) {
          throw new BadRequestException('Visit is not currently in gym');
        }

        const durationMin = Math.max(
          1,
          Math.round((now.getTime() - visit.checkInTime.getTime()) / 60000),
        );

        const updatedVisit = await tx.visit.update({
          where: { id: visit.id },
          data: {
            status: VisitStatus.COMPLETED,
            checkOutTime: now,
            durationMin,
          },
        });

        const updatedZone = await tx.gymZone.update({
          where: { id: visit.zoneId },
          data: {
            currentOccupancy: { decrement: 1 },
          },
        });

        await this.redis.decr(`gym:occupancy:zone:${visit.zoneId}`);
        const totalInGym = await tx.visit.count({
          where: { status: VisitStatus.IN_GYM },
        });
        await this.redis.set('gym:occupancy:total', String(totalInGym));

        this.occupancyGateway.emitZoneUpdate(
          updatedZone.id,
          updatedZone.currentOccupancy,
          updatedZone.maxCapacity,
        );
        this.occupancyGateway.emitGlobalUpdate(totalInGym);
        this.occupancyGateway.emitAdminEvent({
          type: 'CHECK_OUT',
          payload: {
            visitId: updatedVisit.id,
            userId: visit.userId,
            zoneId: visit.zoneId,
            at: now.toISOString(),
          },
        });

        const event: AttendanceDomainEvent = {
          type: 'CHECK_OUT_COMPLETED',
          visitId: updatedVisit.id,
          userId: visit.userId,
          zoneId: visit.zoneId,
          occurredAt: now,
        };

        return { updatedVisit, event };
      },
    );

    await this.xpService.handleEvent(event);
    await this.streakService.handleEvent(event);
    return updatedVisit;
  }
}
