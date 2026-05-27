import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, SubscriptionStatus } from '@prisma/client';
import { OccupancyGateway } from '../websocket/occupancy.gateway';

@Injectable()
export class ClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: OccupancyGateway,
  ) {}

  // Admin/trainer: list classes in a time window
  async listClasses(from?: Date, to?: Date) {
    return this.prisma.class.findMany({
      where: {
        ...(from && { startTime: { gte: from } }),
        ...(to && { endTime: { lte: to } }),
      },
      include: {
        trainer: { select: { email: true, profileData: true } },
        zone: true,
        _count: {
          select: {
            bookings: { where: { status: BookingStatus.CONFIRMED } },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  // Trainer: list upcoming classes taught by a specific trainer
  async listClassesForTrainer(trainerId: string) {
    const now = new Date();
    const classes = await this.prisma.class.findMany({
      where: {
        trainerId,
        endTime: { gte: now },
      },
      include: {
        zone: true,
        _count: {
          select: {
            bookings: { where: { status: BookingStatus.CONFIRMED } },
          },
        },
      },
      orderBy: { startTime: 'asc' },
      take: 50,
    });

    return classes.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      zoneName: c.zone.name,
      startTime: c.startTime,
      endTime: c.endTime,
      capacity: c.capacity,
      bookingsCount: c._count.bookings,
    }));
  }

  // Admin/trainer: create a class
  async createClass(data: {
    title: string;
    description?: string;
    trainerId: string;
    zoneId: string;
    startTime: Date;
    endTime: Date;
    capacity: number;
  }) {
    if (data.endTime <= data.startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    return this.prisma.class.create({ data });
  }

  async updateClass(id: string, data: Partial<{ title: string; description: string; capacity: number }>) {
    return this.prisma.class.update({ where: { id }, data });
  }

  // Client: list upcoming classes — show booked/waitlist position/full
  async listUpcomingForUser(userId: string) {
    const now = new Date();
    const classes = await this.prisma.class.findMany({
      where: { endTime: { gte: now } },
      include: {
        zone: true,
        trainer: { select: { email: true } },
        bookings: {
          where: { userId },
          select: { id: true, status: true, position: true },
        },
        _count: {
          select: {
            bookings: {
              where: { status: { in: [BookingStatus.CONFIRMED, BookingStatus.WAITLIST] } },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
      take: 50,
    });

    // For each class compute confirmed/waitlist counts separately
    const confirmedCounts = await this.prisma.booking.groupBy({
      by: ['classId'],
      where: {
        classId: { in: classes.map((c) => c.id) },
        status: BookingStatus.CONFIRMED,
      },
      _count: { _all: true },
    });
    const confirmedMap = new Map(confirmedCounts.map((r) => [r.classId, r._count._all]));

    const waitlistCounts = await this.prisma.booking.groupBy({
      by: ['classId'],
      where: {
        classId: { in: classes.map((c) => c.id) },
        status: BookingStatus.WAITLIST,
      },
      _count: { _all: true },
    });
    const waitlistMap = new Map(waitlistCounts.map((r) => [r.classId, r._count._all]));

    return classes.map((c) => {
      const my = c.bookings[0];
      const confirmed = confirmedMap.get(c.id) ?? 0;
      const waitlist = waitlistMap.get(c.id) ?? 0;
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        trainerEmail: c.trainer.email,
        zoneName: c.zone.name,
        startTime: c.startTime,
        endTime: c.endTime,
        capacity: c.capacity,
        bookingsCount: confirmed,
        waitlistCount: waitlist,
        isFull: confirmed >= c.capacity,
        isBooked: my?.status === BookingStatus.CONFIRMED,
        isOnWaitlist: my?.status === BookingStatus.WAITLIST,
        waitlistPosition: my?.status === BookingStatus.WAITLIST ? my.position : null,
        bookingId: my?.id ?? null,
      };
    });
  }

  // Client: book a class. If full → add to waitlist instead of throwing.
  async bookClass(userId: string, classId: string) {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const clazz = await tx.class.findUnique({
        where: { id: classId },
        include: {
          _count: {
            select: {
              bookings: { where: { status: BookingStatus.CONFIRMED } },
            },
          },
        },
      });
      if (!clazz) throw new BadRequestException('Class not found');
      if (clazz.endTime <= now) throw new BadRequestException('Class already finished');

      // Active subscription required
      const sub = await tx.userSubscription.findFirst({
        where: {
          userId,
          status: SubscriptionStatus.ACTIVE,
          startDate: { lte: now },
          endDate: { gte: now },
        },
      });
      if (!sub) throw new BadRequestException('Active subscription required to book classes');

      // Prevent double-booking on any active status
      const existing = await tx.booking.findUnique({
        where: { userId_classId: { userId, classId } },
      });
      if (existing && existing.status !== BookingStatus.CANCELLED) {
        throw new BadRequestException('Already booked or on waitlist');
      }

      const isFull = clazz._count.bookings >= clazz.capacity;

      if (!isFull) {
        const booking = existing
          ? await tx.booking.update({
              where: { id: existing.id },
              data: { status: BookingStatus.CONFIRMED, position: null, createdAt: new Date() },
            })
          : await tx.booking.create({
              data: { userId, classId, status: BookingStatus.CONFIRMED },
            });
        return { ...booking, status: BookingStatus.CONFIRMED, waitlistPosition: null };
      }

      // Compute next waitlist position
      const waitlistCount = await tx.booking.count({
        where: { classId, status: BookingStatus.WAITLIST },
      });
      const position = waitlistCount + 1;

      const booking = existing
        ? await tx.booking.update({
            where: { id: existing.id },
            data: { status: BookingStatus.WAITLIST, position, createdAt: new Date() },
          })
        : await tx.booking.create({
            data: { userId, classId, status: BookingStatus.WAITLIST, position },
          });
      return { ...booking, waitlistPosition: position };
    });
  }

  // Client: cancel booking. If it was CONFIRMED → promote head of waitlist
  // and notify them via socket.
  async cancelBooking(userId: string, classId: string) {
    const { promoted } = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { userId_classId: { userId, classId } },
      });
      if (!booking) throw new BadRequestException('Booking not found');

      const wasConfirmed = booking.status === BookingStatus.CONFIRMED;

      await tx.booking.delete({ where: { id: booking.id } });

      let promoted: { userId: string; classId: string } | null = null;
      if (wasConfirmed) {
        const head = await tx.booking.findFirst({
          where: { classId, status: BookingStatus.WAITLIST },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        });
        if (head) {
          await tx.booking.update({
            where: { id: head.id },
            data: { status: BookingStatus.CONFIRMED, position: null },
          });
          promoted = { userId: head.userId, classId };
        }
        // Re-number remaining waitlist
        const remaining = await tx.booking.findMany({
          where: { classId, status: BookingStatus.WAITLIST },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
          select: { id: true },
        });
        await Promise.all(
          remaining.map((b, idx) =>
            tx.booking.update({ where: { id: b.id }, data: { position: idx + 1 } }),
          ),
        );
      }

      return { promoted };
    });

    if (promoted) {
      this.gateway.emitAdminEvent({
        type: 'WAITLIST_PROMOTED',
        payload: promoted,
      });
    }

    return { ok: true, promoted };
  }
}
