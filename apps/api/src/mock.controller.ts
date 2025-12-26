import { Controller, Get } from '@nestjs/common';

@Controller('mock')
export class MockController {
  @Get('my-pass')
  myPass() {
    // Static data for now; replace with real membership + QR logic.
    return {
      userId: 'demo-user',
      membershipType: 'Unlimited Elite',
      status: 'ACTIVE',
      qrToken: 'demo-token',
    };
  }
}
