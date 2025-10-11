import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { LawyerController } from './lawyer.controller';
import { AIService } from '../lib/ai.service';
import { MessageService } from '../lib/message.service';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [JwtModule, UploadsModule],
  controllers: [LawyerController],
  providers: [AIService, MessageService],
})
export class LawyerModule {}
