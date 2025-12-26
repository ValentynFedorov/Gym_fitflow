import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CheckInDto, CheckOutDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

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
