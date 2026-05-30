import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createUser(data: {
    email: string;
    passwordHash: string;
    role: 'ADMIN' | 'TRAINER' | 'CLIENT';
  }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
      },
    });
  }

  async listByRole(role?: 'ADMIN' | 'TRAINER' | 'CLIENT') {
    return this.prisma.user.findMany({
      where: role ? { role } : {},
      select: { id: true, email: true, role: true, profileData: true },
      orderBy: { email: 'asc' },
    });
  }

  async activity(userId: string) {
    const visits = await this.prisma.visit.findMany({
      where: { userId },
      orderBy: { checkInTime: 'desc' },
    });

    return {
      userId,
      visits,
    };
  }
}
