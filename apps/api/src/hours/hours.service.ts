import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface HoursRow {
  dayOfWeek: number; // 0..6
  openMin:   number;
  closeMin:  number;
  isClosed:  boolean;
}

function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

@Injectable()
export class HoursService {
  constructor(private readonly prisma: PrismaService) {}

  // 7-row list; if rows are missing returns sensible defaults so the API
  // never returns an empty schedule.
  async list() {
    const rows = await this.prisma.gymHours.findMany({ orderBy: { dayOfWeek: 'asc' } });
    const byDay = new Map(rows.map((r) => [r.dayOfWeek, r]));
    const out: HoursRow[] = [];
    for (let d = 0; d < 7; d++) {
      const r = byDay.get(d);
      out.push({
        dayOfWeek: d,
        openMin:   r?.openMin   ?? 8 * 60,
        closeMin:  r?.closeMin  ?? 21 * 60,
        isClosed:  r?.isClosed  ?? false,
      });
    }
    return out;
  }

  async setForDay(dayOfWeek: number, body: Partial<HoursRow>) {
    if (dayOfWeek < 0 || dayOfWeek > 6) throw new BadRequestException('dayOfWeek must be 0..6');
    if (body.openMin  != null && (body.openMin  < 0 || body.openMin  > 24 * 60)) throw new BadRequestException('openMin out of range');
    if (body.closeMin != null && (body.closeMin < 0 || body.closeMin > 24 * 60)) throw new BadRequestException('closeMin out of range');
    if (body.openMin != null && body.closeMin != null && body.openMin >= body.closeMin && !body.isClosed) {
      throw new BadRequestException('openMin must be before closeMin');
    }
    return this.prisma.gymHours.upsert({
      where:  { dayOfWeek },
      create: {
        dayOfWeek,
        openMin:  body.openMin  ?? 8 * 60,
        closeMin: body.closeMin ?? 21 * 60,
        isClosed: body.isClosed ?? false,
      },
      update: {
        openMin:  body.openMin,
        closeMin: body.closeMin,
        isClosed: body.isClosed,
      },
    });
  }

  // ---------- consumed by attendance ----------
  async isOpenAt(at: Date): Promise<{ isOpen: boolean; reason?: string; closesAt?: Date; opensAt?: Date }> {
    const hours = await this.list();
    const day   = at.getDay();
    const mins  = minutesOfDay(at);
    const today = hours[day];

    const closeDate = (dayOffset: number, m: number) => {
      const d = new Date(at);
      d.setDate(d.getDate() + dayOffset);
      d.setHours(Math.floor(m / 60), m % 60, 0, 0);
      return d;
    };

    if (today.isClosed) {
      const next = this.nextOpening(hours, day);
      return { isOpen: false, reason: 'closed today', opensAt: closeDate(next.offset, next.openMin) };
    }
    if (mins < today.openMin) {
      return { isOpen: false, reason: 'before opening', opensAt: closeDate(0, today.openMin) };
    }
    if (mins >= today.closeMin) {
      const next = this.nextOpening(hours, day);
      return { isOpen: false, reason: 'after closing', opensAt: closeDate(next.offset, next.openMin) };
    }
    return { isOpen: true, closesAt: closeDate(0, today.closeMin) };
  }

  async status(): Promise<{ isOpen: boolean; reason?: string; closesAt?: string; opensAt?: string }> {
    const at = new Date();
    const s = await this.isOpenAt(at);
    return {
      isOpen:   s.isOpen,
      reason:   s.reason,
      closesAt: s.closesAt?.toISOString(),
      opensAt:  s.opensAt?.toISOString(),
    };
  }

  private nextOpening(hours: HoursRow[], fromDay: number): { offset: number; openMin: number } {
    for (let i = 1; i <= 7; i++) {
      const d = (fromDay + i) % 7;
      if (!hours[d].isClosed) return { offset: i, openMin: hours[d].openMin };
    }
    return { offset: 1, openMin: 8 * 60 }; // fully-closed gym shouldn't happen, fall back
  }
}
