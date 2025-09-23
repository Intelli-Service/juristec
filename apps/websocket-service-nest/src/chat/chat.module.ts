import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { GeminiService } from '../lib/gemini.service';
import { AIService } from '../lib/ai.service';

@Module({
  providers: [ChatGateway, GeminiService, AIService],
})
export class ChatModule {}