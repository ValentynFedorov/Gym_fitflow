import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { MetricsService, MetricInput } from './metrics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Role } from '@prisma/client';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('users/:userId')
  list(
    @Param('userId') userId: string,
    @Query('days') days: string | undefined,
    @Req() req: any,
  ) {
    const n = days ? parseInt(days, 10) : undefined;
    return this.metrics.list(userId, req.user as { id: string; role: Role }, n);
  }

  @UseGuards(JwtAuthGuard)
  @Get('users/:userId/summary')
  summary(@Param('userId') userId: string, @Req() req: any) {
    return this.metrics.summary(userId, req.user as { id: string; role: Role });
  }

  @UseGuards(JwtAuthGuard)
  @Post('users/:userId')
  create(@Param('userId') userId: string, @Body() body: MetricInput, @Req() req: any) {
    return this.metrics.create(userId, req.user as { id: string; role: Role }, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.metrics.delete(id, req.user as { id: string; role: Role });
  }
}
