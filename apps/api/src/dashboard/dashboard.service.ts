import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const [activeMembers, activeSubscriptions, totalVisits] =
      await Promise.all([
        // Distinct users with at least one ACTIVE subscription
        this.prisma.userSubscription
          .findMany({
            where: { status: 'ACTIVE' },
            select: { userId: true },
          })
          .then((rows) => new Set(rows.map((r) => r.userId)).size),
        this.prisma.userSubscription.count({
          where: { status: 'ACTIVE' },
        }),
        this.prisma.visit.count(),
      ]);

    const rawVisitsByHour = await this.prisma.$queryRawUnsafe<
      { hour: any; count: any }[]
    >(
      'SELECT EXTRACT(HOUR FROM "check_in_time") as hour, COUNT(*) as count FROM "visits" GROUP BY hour ORDER BY hour;',
    );

    const visitsByHour = rawVisitsByHour.map((row) => ({
      hour: Number(row.hour),
      count: Number(row.count),
    }));

    return {
      activeMembers,
      activeSubscriptions,
      totalVisits,
      visitsByHour,
    };
  }

  async overview() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, totalClients, totalTrainers, totalAdmins, totalVisitsLast30] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { role: 'CLIENT' } }),
        this.prisma.user.count({ where: { role: 'TRAINER' } }),
        this.prisma.user.count({ where: { role: 'ADMIN' } }),
        this.prisma.visit.count({ where: { checkInTime: { gte: thirtyDaysAgo } } }),
      ]);

    const zones = await this.prisma.gymZone.findMany({
      select: {
        id: true,
        name: true,
        _count: { select: { visits: true } },
      },
    });

    const visitsByZone = zones.map((z) => ({
      id: z.id,
      name: z.name,
      visitCount: z._count.visits,
    }));

    return {
      totalUsers,
      totalClients,
      totalTrainers,
      totalAdmins,
      totalVisitsLast30: totalVisitsLast30,
      visitsByZone,
    };
  }

  async recentVisits(limit = 50) {
    const visits = await this.prisma.visit.findMany({
      orderBy: { checkInTime: 'desc' },
      take: limit,
      include: {
        user: true,
        zone: true,
      },
    });

    return visits.map((v) => ({
      id: v.id,
      userEmail: v.user.email,
      zoneName: v.zone.name,
      checkInTime: v.checkInTime,
      checkOutTime: v.checkOutTime,
      status: v.status,
    }));
  }

  async topClients(limit = 10) {
    const rows = await this.prisma.$queryRawUnsafe<
      { user_id: string; email: string; visit_count: any }[]
    >(
      `SELECT u.id as user_id, u.email, COUNT(v.id) as visit_count
       FROM "users" u
       LEFT JOIN "visits" v ON v."user_id" = u.id
       WHERE u.role = 'CLIENT'
       GROUP BY u.id, u.email
       ORDER BY visit_count DESC
       LIMIT ${limit};`,
    );

    return rows.map((r) => ({
      userId: r.user_id,
      email: r.email,
      visitCount: Number(r.visit_count),
    }));
  }
}
