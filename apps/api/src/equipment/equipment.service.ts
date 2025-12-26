import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EquipmentService {
  constructor(private readonly prisma: PrismaService) {}

  list(status?: string) {
    return this.prisma.equipment.findMany({
      where: status ? { status } : {},
      orderBy: { name: 'asc' },
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      type: string;
      status: string;
      nextServiceAt: Date | null;
    }>,
  ) {
    return this.prisma.equipment.update({
      where: { id },
      data,
    });
  }
}
