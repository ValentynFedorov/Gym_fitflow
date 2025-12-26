import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { GamificationModule } from '../gamification/gamification.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    PrismaModule,
    WebsocketModule,
    GamificationModule,
    RedisModule,
    JwtModule.register({}),
  ],
  providers: [AttendanceService],
  controllers: [AttendanceController],
})
export class AttendanceModule {}
