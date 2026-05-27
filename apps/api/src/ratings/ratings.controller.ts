import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';

@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratings: RatingsService) {}

  // Client posts a rating for a class they attended.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  @Post('classes/:classId')
  async rate(
    @Param('classId') classId: string,
    @Body() body: { stars: number; comment?: string },
    @Req() req: any,
  ) {
    return this.ratings.createRating(req.user.id, classId, body.stars, body.comment);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLIENT)
  @Get('classes/:classId/mine')
  async mine(@Param('classId') classId: string, @Req() req: any) {
    return this.ratings.myRatingFor(req.user.id, classId);
  }

  // Public-ish (any logged-in user): leaderboard of trainers by avg stars.
  @UseGuards(JwtAuthGuard)
  @Get('leaderboard')
  async leaderboard(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 10;
    return this.ratings.leaderboard(Number.isNaN(n) ? 10 : n);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.TRAINER, Role.ADMIN)
  @Get('trainers/:id')
  async forTrainer(@Param('id') id: string) {
    return this.ratings.recentForTrainer(id);
  }
}
