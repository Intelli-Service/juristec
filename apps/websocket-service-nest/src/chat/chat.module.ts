import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { GeminiService } from '../lib/gemini.service';
import { AIService } from '../lib/ai.service';
import { MessageService } from '../lib/message.service';
import { IntelligentUserRegistrationService } from '../lib/intelligent-user-registration.service';
import { FluidRegistrationService } from '../lib/fluid-registration.service';
import { VerificationService } from '../lib/verification.service';
import { BillingModule } from '../billing/billing.module';
import { TokenValidationService } from '../lib/token-validation.service';
import { UploadsModule } from '../uploads/uploads.module';
import UserModel from '../models/User';
import Conversation from '../models/Conversation';
import { VerificationCodeSchema } from '../models/VerificationCode';
import { FileAttachment, FileAttachmentSchema } from '../models/FileAttachment';

@Module({
  imports: [
    JwtModule,
    MongooseModule.forFeature([
      { name: 'User', schema: UserModel.schema },
      { name: 'Conversation', schema: Conversation.schema },
      { name: 'VerificationCode', schema: VerificationCodeSchema },
      { name: 'FileAttachment', schema: FileAttachmentSchema },
    ]),
    BillingModule,
    UploadsModule,
  ],
  controllers: [ChatController],
  providers: [
    ChatGateway,
    GeminiService,
    AIService,
    MessageService,
    IntelligentUserRegistrationService,
    FluidRegistrationService,
    VerificationService,
    TokenValidationService,
  ],
  exports: [ChatGateway, GeminiService, AIService, MessageService],
})
export class ChatModule {}
