import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles(Role.ADMIN)
  async stats() {
    return this.dashboardService.stats();
  }

  @Get('overview')
  @Roles(Role.ADMIN)
  async overview() {
    return this.dashboardService.overview();
  }

  @Get('recent-visits')
  @Roles(Role.ADMIN)
  async recentVisits(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 50;
    return this.dashboardService.recentVisits(Number.isNaN(n) ? 50 : n);
  }

  @Get('top-clients')
  @Roles(Role.ADMIN)
  async topClients(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 10;
    return this.dashboardService.topClients(Number.isNaN(n) ? 10 : n);
  }
}
