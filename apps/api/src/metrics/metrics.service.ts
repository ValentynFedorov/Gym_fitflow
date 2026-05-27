import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

export interface MetricInput {
  recordedAt?: string;
  weightKg?: number;
  heightCm?: number;
  chestCm?: number;
  waistCm?: number;
  hipCm?: number;
  bodyFatPct?: number;
  note?: string;
}

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureOwnerOrStaff(targetUserId: string, current: { id: string; role: Role }) {
    const isSelf = current.id === targetUserId;
    const isStaff = current.role === Role.ADMIN || current.role === Role.TRAINER;
    if (!isSelf && !isStaff) {
      throw new ForbiddenException('Not allowed to access metrics for this user');
    }
  }

  async list(targetUserId: string, current: { id: string; role: Role }, days?: number) {
    this.ensureOwnerOrStaff(targetUserId, current);
    const since = days
      ? new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      : undefined;

    return this.prisma.bodyMetric.findMany({
      where: {
        userId: targetUserId,
        ...(since && { recordedAt: { gte: since } }),
      },
      orderBy: { recordedAt: 'asc' },
    });
  }

  async create(targetUserId: string, current: { id: string; role: Role }, input: MetricInput) {
    this.ensureOwnerOrStaff(targetUserId, current);

    const hasAnyValue =
      input.weightKg != null ||
      input.heightCm != null ||
      input.chestCm != null ||
      input.waistCm != null ||
      input.hipCm != null ||
      input.bodyFatPct != null;
    if (!hasAnyValue) {
      throw new BadRequestException('At least one measurement required');
    }

    return this.prisma.bodyMetric.create({
      data: {
        userId: targetUserId,
        recordedAt: input.recordedAt ? new Date(input.recordedAt) : new Date(),
        weightKg:   input.weightKg ?? null,
        heightCm:   input.heightCm ?? null,
        chestCm:    input.chestCm ?? null,
        waistCm:    input.waistCm ?? null,
        hipCm:      input.hipCm ?? null,
        bodyFatPct: input.bodyFatPct ?? null,
        note:       input.note ?? null,
      },
    });
  }

  async delete(id: string, current: { id: string; role: Role }) {
    const metric = await this.prisma.bodyMetric.findUnique({ where: { id } });
    if (!metric) throw new BadRequestException('Metric not found');
    this.ensureOwnerOrStaff(metric.userId, current);
    return this.prisma.bodyMetric.delete({ where: { id } });
  }

  // Summary: latest + delta vs ~30 days ago.
  async summary(targetUserId: string, current: { id: string; role: Role }) {
    this.ensureOwnerOrStaff(targetUserId, current);
    const rows = await this.prisma.bodyMetric.findMany({
      where: { userId: targetUserId },
      orderBy: { recordedAt: 'asc' },
    });
    if (rows.length === 0) return { hasData: false };

    const latest = rows[rows.length - 1];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const baseline = rows.find((r) => r.recordedAt >= thirtyDaysAgo) ?? rows[0];

    const delta = (a: number | null, b: number | null) =>
      a != null && b != null ? +(a - b).toFixed(2) : null;

    return {
      hasData: true,
      latest,
      since: baseline.recordedAt,
      delta: {
        weightKg:   delta(latest.weightKg,   baseline.weightKg),
        waistCm:    delta(latest.waistCm,    baseline.waistCm),
        chestCm:    delta(latest.chestCm,    baseline.chestCm),
        bodyFatPct: delta(latest.bodyFatPct, baseline.bodyFatPct),
      },
      count: rows.length,
    };
  }
}
