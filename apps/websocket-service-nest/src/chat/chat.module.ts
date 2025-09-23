import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { GeminiService } from '../lib/gemini.service';
import { AIService } from '../lib/ai.service';

@Module({
  imports: [JwtModule],
  providers: [ChatGateway, GeminiService, AIService],
})
export class ChatModule {}