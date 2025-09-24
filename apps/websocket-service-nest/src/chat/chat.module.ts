import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatGateway } from './chat.gateway';
import { GeminiService } from '../lib/gemini.service';
import { AIService } from '../lib/ai.service';
import { MessageService } from '../lib/message.service';
import { IntelligentUserRegistrationService } from '../lib/intelligent-user-registration.service';
import { FluidRegistrationService } from '../lib/fluid-registration.service';
import { VerificationService } from '../lib/verification.service';
import UserModel from '../models/User';
import Conversation, { ConversationSchema } from '../models/Conversation';
import mongoose from 'mongoose';

// Schema para códigos de verificação
const VerificationCodeSchema = new mongoose.Schema({
  email: { type: String, sparse: true },
  phone: { type: String, sparse: true },
  code: { type: String, required: true },
  verified: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 }
});

VerificationCodeSchema.index({ email: 1, verified: 1 });
VerificationCodeSchema.index({ phone: 1, verified: 1 });
VerificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

@Module({
  imports: [
    JwtModule,
    MongooseModule.forFeature([
      { name: 'User', schema: UserModel.schema },
      { name: 'Conversation', schema: Conversation.schema },
      { name: 'VerificationCode', schema: VerificationCodeSchema }
    ])
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
})
export class ChatModule {}