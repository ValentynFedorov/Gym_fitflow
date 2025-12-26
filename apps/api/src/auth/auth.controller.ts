import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body()
    body: { email: string; password: string; role?: 'ADMIN' | 'TRAINER' | 'CLIENT' },
  ) {
    const role = body.role ?? 'CLIENT';
    return this.authService.register(body.email, body.password, role);
  }

  @Post('login')
  async login(
    @Body()
    body: { email: string; password: string },
  ) {
    return this.authService.login(body.email, body.password);
  }

  @Post('refresh')
  async refresh(@Body() body: { userId: string; refreshToken: string }) {
    return this.authService.refresh(body.userId, body.refreshToken);
  }
}
