import { Module } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { GamificationController } from './gamification.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { XpService } from './xp.service';

@Module({
  imports: [PrismaModule],
  providers: [GamificationService, XpService],
  controllers: [GamificationController],
  exports: [XpService],
})
export class GamificationModule {}
