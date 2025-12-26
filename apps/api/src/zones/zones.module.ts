import { Module } from '@nestjs/common';
import { ZonesService } from './zones.service';
import { ZonesController } from './zones.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ZonesService],
  controllers: [ZonesController],
  exports: [ZonesService],
})
export class ZonesModule {}
