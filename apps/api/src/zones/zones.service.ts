import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.gymZone.findMany();
  }

  create(data: { name: string; maxCapacity: number }) {
    return this.prisma.gymZone.create({
      data: {
        name: data.name,
        maxCapacity: data.maxCapacity,
      },
    });
  }

  occupancy() {
    return this.prisma.gymZone.findMany({
      select: {
        id: true,
        name: true,
        maxCapacity: true,
        currentOccupancy: true,
      },
    });
  }
}
