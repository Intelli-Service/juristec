import { Controller, Get } from '@nestjs/common';

@Controller('chat')
export class ChatController {
  @Get('status')
  getStatus() {
    return {
      status: 'online',
      websocket: 'available',
      timestamp: new Date().toISOString(),
    };
  }
}
