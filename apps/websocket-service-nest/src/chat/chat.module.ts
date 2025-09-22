import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { GeminiService } from '../lib/gemini.service';

@Module({
  providers: [ChatGateway, GeminiService],
})
export class ChatModule {}