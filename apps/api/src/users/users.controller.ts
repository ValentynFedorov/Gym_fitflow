import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // List users (optionally filtered by role) — used by admin UI to pick a
  // trainer when creating a class, etc.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TRAINER)
  @Get()
  list(@Query('role') role?: 'ADMIN' | 'TRAINER' | 'CLIENT') {
    return this.usersService.listByRole(role);
  }

  @Get(':id/activity')
  async activity(@Param('id') id: string) {
    return this.usersService.activity(id);
  }
}
