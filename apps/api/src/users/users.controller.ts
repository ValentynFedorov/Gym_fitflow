import { Controller, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id/activity')
  async activity(@Param('id') id: string) {
    return this.usersService.activity(id);
  }
}
