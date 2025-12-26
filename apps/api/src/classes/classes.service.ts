import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

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
        _count: { select: { bookings: true } },
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
        _count: { select: { bookings: true } },
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

    return this.prisma.class.create({
      data,
    });
  }

  // Admin/trainer: update basic class details
  async updateClass(id: string, data: Partial<{ title: string; description: string; capacity: number }>) {
    return this.prisma.class.update({
      where: { id },
      data,
    });
  }

  // Client: list upcoming classes and indicate booking / capacity status
  async listUpcomingForUser(userId: string) {
    const now = new Date();
    const classes = await this.prisma.class.findMany({
      where: {
        endTime: { gte: now },
      },
      include: {
        zone: true,
        trainer: { select: { email: true } },
        bookings: {
          where: { userId },
          select: { id: true, status: true },
        },
        _count: { select: { bookings: true } },
      },
      orderBy: { startTime: 'asc' },
      take: 50,
    });

    return classes.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      trainerEmail: c.trainer.email,
      zoneName: c.zone.name,
      startTime: c.startTime,
      endTime: c.endTime,
      capacity: c.capacity,
      bookingsCount: c._count.bookings,
      isFull: c._count.bookings >= c.capacity,
      isBooked: c.bookings.length > 0,
      bookingId: c.bookings[0]?.id ?? null,
    }));
  }

  // Client: book a class (respecting capacity and subscription status)
  async bookClass(userId: string, classId: string) {
    const now = new Date();

    const clazz = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { _count: { select: { bookings: true } } },
    });
    if (!clazz) throw new BadRequestException('Class not found');
    if (clazz.endTime <= now) throw new BadRequestException('Class already finished');
    if (clazz._count.bookings >= clazz.capacity) {
      throw new BadRequestException('Class is at full capacity');
    }

    // Ensure user has active subscription
    const sub = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });
    if (!sub) throw new BadRequestException('Active subscription required to book classes');

    // Prevent double-booking
    const existing = await this.prisma.booking.findUnique({
      where: {
        userId_classId: {
          userId,
          classId,
        },
      },
    });
    if (existing) throw new BadRequestException('Already booked');

    return this.prisma.booking.create({
      data: {
        userId,
        classId,
      },
    });
  }

  // Client: cancel booking
  async cancelBooking(userId: string, classId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: {
        userId_classId: {
          userId,
          classId,
        },
      },
    });
    if (!booking) throw new BadRequestException('Booking not found');

    await this.prisma.booking.delete({
      where: { id: booking.id },
    });

    return { ok: true };
  }
}
