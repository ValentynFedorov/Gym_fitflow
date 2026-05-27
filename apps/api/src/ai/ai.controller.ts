import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AiService, WorkoutInput } from './ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @UseGuards(JwtAuthGuard)
  @Post('workout-plan')
  workoutPlan(@Body() body: WorkoutInput) {
    return this.ai.generateWorkoutPlan(body);
  }
}
