import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatGateway } from './chat.gateway';
import { GeminiService } from '../lib/gemini.service';
import { AIService } from '../lib/ai.service';
import { MessageService } from '../lib/message.service';
import { IntelligentUserRegistrationService } from '../lib/intelligent-user-registration.service';
import UserModel from '../models/User';
import Conversation from '../models/Conversation';

@Module({
  imports: [
    JwtModule,
    MongooseModule.forFeature([
      { name: 'User', schema: UserModel.schema },
      { name: 'Conversation', schema: Conversation.schema }
    ])
  ],
  providers: [ChatGateway, GeminiService, AIService, MessageService, IntelligentUserRegistrationService],
})
export class ChatModule {}