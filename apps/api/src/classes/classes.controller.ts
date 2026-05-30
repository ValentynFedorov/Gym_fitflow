import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  // Admin/trainer: list all classes in window
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TRAINER)
  @Get('admin')
  async listAdmin(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    return this.classesService.listClasses(fromDate, toDate);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TRAINER)
  @Post()
  async create(@Body() body: {
    title: string;
    description?: string;
    trainerId: string;
    zoneId: string;
    startTime: string;
    endTime: string;
    capacity: number;
  }) {
    return this.classesService.createClass({
      title: body.title,
      description: body.description,
      trainerId: body.trainerId,
      zoneId: body.zoneId,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      capacity: body.capacity,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TRAINER)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: Partial<{ title: string; description: string; capacity: number; startTime: string; endTime: string; zoneId: string; trainerId: string }>,
  ) {
    const data: any = { ...body };
    if (body.startTime) data.startTime = new Date(body.startTime);
    if (body.endTime)   data.endTime   = new Date(body.endTime);
    return this.classesService.updateClass(id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  async deleteClass(@Param('id') id: string) {
    return this.classesService.deleteClass(id);
  }

  // Client: list upcoming classes personalized (whether booked/full)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  @Get('client')
  async listForClient(@Req() req: any) {
    const userId = req.user.id;
    return this.classesService.listUpcomingForUser(userId);
  }

  // Trainer: list upcoming classes they teach
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TRAINER)
  @Get('trainer')
  async listForTrainer(@Req() req: any) {
    const trainerId = req.user.id;
    return this.classesService.listClassesForTrainer(trainerId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  @Post(':id/book')
  async book(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    return this.classesService.bookClass(userId, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  @Delete(':id/book')
  async cancel(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    return this.classesService.cancelBooking(userId, id);
  }
}
