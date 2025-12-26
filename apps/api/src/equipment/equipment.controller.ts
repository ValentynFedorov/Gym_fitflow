import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('equipment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TRAINER)
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
}
