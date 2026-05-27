import { Module } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { GamificationController } from './gamification.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { XpService } from './xp.service';
import { StreakService } from './streak.service';

@Module({
  imports: [PrismaModule],
  providers: [GamificationService, XpService, StreakService],
  controllers: [GamificationController],
  exports: [XpService, StreakService],
})
export class GamificationModule {}
