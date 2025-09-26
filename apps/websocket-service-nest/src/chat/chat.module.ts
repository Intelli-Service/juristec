import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { GeminiService } from '../lib/gemini.service';
import { AIService } from '../lib/ai.service';
import { MessageService } from '../lib/message.service';
import { IntelligentUserRegistrationService } from '../lib/intelligent-user-registration.service';
import { FluidRegistrationService } from '../lib/fluid-registration.service';
import { VerificationService } from '../lib/verification.service';
import { BillingModule } from '../billing/billing.module';
import UserModel from '../models/User';
import Conversation, { ConversationSchema } from '../models/Conversation';
import { VerificationCodeSchema } from '../models/VerificationCode';

@Module({
  imports: [
    JwtModule,
    MongooseModule.forFeature([
      { name: 'User', schema: UserModel.schema },
      { name: 'Conversation', schema: Conversation.schema },
      { name: 'VerificationCode', schema: VerificationCodeSchema }
    ]),
    BillingModule
  ],
  providers: [
    ChatGateway,
    GeminiService,
    AIService,
    MessageService,
    IntelligentUserRegistrationService,
    FluidRegistrationService,
    VerificationService
  ],
  exports: [ChatGateway, GeminiService, AIService, MessageService]
})
export class ChatModule {}