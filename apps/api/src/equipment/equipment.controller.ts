import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { IncidentSeverity, IncidentStatus, Role } from '@prisma/client';

@Controller('equipment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TRAINER, Role.CLIENT)
  list(@Query('status') status?: string) {
    return this.equipmentService.list(status);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; type: string; status: string; nextServiceAt: string | null }>,
  ) {
    return this.equipmentService.update(id, {
      name: body.name,
      type: body.type,
      status: body.status,
      nextServiceAt: body.nextServiceAt ? new Date(body.nextServiceAt) : null,
    });
  }

  // ---------- Incidents ----------
  // Any logged-in user can report broken / problematic equipment.
  @Post('incidents')
  @Roles(Role.CLIENT, Role.TRAINER, Role.ADMIN)
  reportIncident(
    @Req() req: any,
    @Body() body: { equipmentId: string; severity?: IncidentSeverity; note?: string },
  ) {
    return this.equipmentService.reportIncident(req.user, body);
  }

  // Admin inbox (trainer can also view, read-only).
  @Get('incidents')
  @Roles(Role.ADMIN, Role.TRAINER)
  listIncidents(@Query('status') status?: IncidentStatus) {
    return this.equipmentService.listIncidents(status);
  }

  // Admin marks IN_PROGRESS / RESOLVED.
  @Patch('incidents/:id')
  @Roles(Role.ADMIN)
  updateIncident(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status?: IncidentStatus; severity?: IncidentSeverity; note?: string },
  ) {
    return this.equipmentService.updateIncident(req.user, id, body);
  }
}
