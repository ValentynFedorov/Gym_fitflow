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

  // Live floor-plan snapshot — used by /admin/floor-plan as the initial
  // payload before socket updates take over.
  @Get('floor-plan')
  @Roles(Role.ADMIN, Role.TRAINER)
  async floorPlan() {
    return this.dashboardService.floorPlan();
  }

  // Visits-per-day heatmap series. ?userId scopes to a specific user.
  @Get('heatmap')
  @Roles(Role.ADMIN, Role.TRAINER, Role.CLIENT)
  async heatmap(@Query('userId') userId?: string, @Query('days') days?: string) {
    const n = days ? parseInt(days, 10) : 90;
    return this.dashboardService.heatmap(userId, Number.isNaN(n) ? 90 : n);
  }
}
