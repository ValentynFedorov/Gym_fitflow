import { Controller, ForbiddenException, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('achievements')
  list() {
    return this.gamificationService.listAchievements();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('users/:id')
  userAchievements(@Param('id') id: string, @Req() req: any) {
    const current = req.user as { id: string; role: Role };
    const isSelf = current.id === id;
    const isStaff = current.role === Role.ADMIN || current.role === Role.TRAINER;
    if (!isSelf && !isStaff) {
      throw new ForbiddenException('Not allowed to view achievements for this user');
    }
    return this.gamificationService.userAchievements(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TRAINER)
  @Get('leaderboard')
  leaderboard(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 20;
    return this.gamificationService.leaderboard(Number.isNaN(n) ? 20 : n);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('monthly-report/:userId')
  monthlyReport(
    @Param('userId') userId: string,
    @Query('month') month: string | undefined,
    @Query('year') year: string | undefined,
    @Req() req: any,
  ) {
    const current = req.user as { id: string; role: Role };
    const isSelf = current.id === userId;
    const isStaff = current.role === Role.ADMIN || current.role === Role.TRAINER;
    if (!isSelf && !isStaff) {
      throw new ForbiddenException('Not allowed to view report for this user');
    }

    const now = new Date();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;
    const y = year ? parseInt(year, 10) : now.getFullYear();
    return this.gamificationService.monthlyReport(
      userId,
      Number.isNaN(m) ? now.getMonth() + 1 : m,
      Number.isNaN(y) ? now.getFullYear() : y,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('xp/:userId')
  xpForUser(@Param('userId') userId: string, @Req() req: any) {
    const current = req.user as { id: string; role: Role };
    const isSelf = current.id === userId;
    const isStaff = current.role === Role.ADMIN || current.role === Role.TRAINER;
    if (!isSelf && !isStaff) {
      throw new ForbiddenException('Not allowed to view XP for this user');
    }
    return this.gamificationService.xpForUser(userId);
  }
}
