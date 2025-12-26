import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(configService: ConfigService) {
    const url = configService.get<string>('REDIS_URL');
    if (!url) {
      throw new Error('REDIS_URL is not configured');
    }
    this.client = new Redis(url);
  }

  getClient(): Redis {
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
