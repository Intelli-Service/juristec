import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { GeminiService } from '../lib/gemini.service';
import { AIService } from '../lib/ai.service';
import { MessageService } from '../lib/message.service';
import { UserDataCollectionService } from '../lib/user-data-collection.service';

@Module({
  imports: [JwtModule],
  providers: [ChatGateway, GeminiService, AIService, MessageService, UserDataCollectionService],
})
export class ChatModule {}