import { Body, Controller, Get, Post } from '@nestjs/common';
import { ZonesService } from './zones.service';

@Controller('zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Get()
  findAll() {
    return this.zonesService.findAll();
  }

  @Get('occupancy')
  occupancy() {
    return this.zonesService.occupancy();
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      maxCapacity: number;
    },
  ) {
    return this.zonesService.create(body);
  }
}
