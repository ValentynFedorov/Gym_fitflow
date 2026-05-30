import { Body, Controller, Get, Param, ParseIntPipe, Put, UseGuards } from '@nestjs/common';
import { HoursService } from './hours.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('gym-hours')
export class HoursController {
  constructor(private readonly hours: HoursService) {}

  // Public — used by the landing page / nav badge.
  @Get()
  list() {
    return this.hours.list();
  }

  // Public — "are we open right now?" used by the landing badge.
  @Get('status')
  status() {
    return this.hours.status();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':dayOfWeek')
  setDay(
    @Param('dayOfWeek', ParseIntPipe) dayOfWeek: number,
    @Body() body: { openMin?: number; closeMin?: number; isClosed?: boolean },
  ) {
    return this.hours.setForDay(dayOfWeek, body);
  }
}
