import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CheckInDto, CheckOutDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly prisma: PrismaService,
  ) {}

  // Convenience for the "tap QR" UI on /client: latest open visit for the
  // current user (so we can decide whether to check-in or check-out).
  @UseGuards(JwtAuthGuard)
  @Get('me/open')
  async myOpenVisits(@Req() req: any) {
    return this.prisma.visit.findMany({
      where: { userId: req.user.id, status: 'IN_GYM' },
      orderBy: { checkInTime: 'desc' },
      take: 3,
    });
  }

  // Path-param variant of check-out (used by the QR tap UI).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT, Role.TRAINER, Role.ADMIN)
  @Post('check-out/:id')
  async checkOutById(@Req() req: any, @Param('id') id: string) {
    return this.attendanceService.checkOut(id, req.user);
  }

  // Clients check themselves in; staff can optionally pass a userId to check in on behalf of a member
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT, Role.TRAINER, Role.ADMIN)
  @Post('check-in')
  async checkIn(@Req() req: any, @Body() body: CheckInDto) {
    const user = req.user as { id: string; role: Role };
    const userId =
      (user.role === Role.ADMIN || user.role === Role.TRAINER) && body.userId
        ? body.userId
        : user.id;
    return this.attendanceService.checkIn(userId, body.zoneId);
  }

  // Clients can only check out their own visits; staff can check out any visit
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT, Role.TRAINER, Role.ADMIN)
  @Post('check-out')
  async checkOut(@Req() req: any, @Body() body: CheckOutDto) {
    return this.attendanceService.checkOut(body.visitId, req.user);
  }
}
