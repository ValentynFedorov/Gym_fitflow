import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ZonesModule } from './zones/zones.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { GamificationModule } from './gamification/gamification.module';
import { WebsocketModule } from './websocket/websocket.module';
import { ClassesModule } from './classes/classes.module';
import { EquipmentModule } from './equipment/equipment.module';
import { RatingsModule } from './ratings/ratings.module';
import { MetricsModule } from './metrics/metrics.module';
import { AiModule } from './ai/ai.module';
import { HoursModule } from './hours/hours.module';
import { MockController } from './mock.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    WebsocketModule,
    AuthModule,
    UsersModule,
    AttendanceModule,
    ZonesModule,
    DashboardModule,
    GamificationModule,
    ClassesModule,
    EquipmentModule,
    RatingsModule,
    MetricsModule,
    AiModule,
    HoursModule,
  ],
  controllers: [MockController],
})
export class AppModule {}
