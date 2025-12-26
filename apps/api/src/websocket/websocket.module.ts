import { Module } from '@nestjs/common';
import { OccupancyGateway } from './occupancy.gateway';

@Module({
  providers: [OccupancyGateway],
  exports: [OccupancyGateway],
})
export class WebsocketModule {}
