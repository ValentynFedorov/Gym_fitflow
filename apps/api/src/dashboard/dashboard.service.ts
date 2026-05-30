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

    // `check_in_time` is `timestamp without time zone` in UTC. We want hours
    // in the gym's local timezone (Europe/Kyiv) so the chart matches the
    // wall-clock schedule (e.g. opening at 08:00, not 05:00 UTC).
    const rawVisitsByHour = await this.prisma.$queryRawUnsafe<
      { hour: any; count: any }[]
    >(
      `SELECT EXTRACT(HOUR FROM ("check_in_time" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Kyiv')) as hour,
              COUNT(*) as count
       FROM "visits"
       GROUP BY hour
       ORDER BY hour;`,
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

  /**
   * Floor-plan snapshot: each zone with its SVG positioning, current
   * occupancy/capacity, and a small list of in-gym visit dots (rendered as
   * little circles within the zone rectangle).
   */
  async floorPlan() {
    const zones = await this.prisma.gymZone.findMany({
      orderBy: { name: 'asc' },
    });

    const liveVisits = await this.prisma.visit.findMany({
      where: { status: 'IN_GYM' },
      select: { id: true, zoneId: true, userId: true, checkInTime: true },
    });

    const byZone = new Map<string, typeof liveVisits>();
    for (const v of liveVisits) {
      const list = byZone.get(v.zoneId) ?? [];
      list.push(v);
      byZone.set(v.zoneId, list);
    }

    return zones.map((z) => ({
      id: z.id,
      name: z.name,
      x: z.positionX,
      y: z.positionY,
      width: z.width,
      height: z.height,
      color: z.color,
      maxCapacity: z.maxCapacity,
      currentOccupancy: z.currentOccupancy,
      visits: (byZone.get(z.id) ?? []).map((v) => ({
        id: v.id,
        userId: v.userId,
        checkInTime: v.checkInTime,
      })),
    }));
  }

  /**
   * GitHub-style heatmap source: visit count per day for the last N days
   * (default 90). Used by the calendar grid component on the client.
   */
  async heatmap(userId?: string, days = 90) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    // Bucket per local day (Europe/Kyiv) so a 23:30 Kyiv check-in counts
    // for today, not tomorrow.
    const rows = await this.prisma.$queryRawUnsafe<
      { day: any; count: any }[]
    >(
      `SELECT DATE_TRUNC('day', ("check_in_time" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Kyiv')) as day,
              COUNT(*)::int as count
       FROM "visits"
       WHERE "check_in_time" >= $1::timestamp
         ${userId ? `AND "user_id" = $2` : ''}
       GROUP BY day
       ORDER BY day ASC`,
      start,
      ...(userId ? [userId] : []),
    );

    const map = new Map<string, number>(
      rows.map((r) => [new Date(r.day).toISOString().slice(0, 10), Number(r.count)]),
    );

    // Densify: emit every day in window, even zero-count, so the grid is contiguous.
    const series: { date: string; count: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      series.push({ date: iso, count: map.get(iso) ?? 0 });
    }

    const max = series.reduce((m, s) => Math.max(m, s.count), 0);
    return { days, start: start.toISOString(), max, series };
  }
}
