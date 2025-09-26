import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { LawyerController } from './lawyer.controller';
import { AIService } from '../lib/ai.service';
import { MessageService } from '../lib/message.service';

@Module({
  imports: [JwtModule],
  controllers: [LawyerController],
  providers: [AIService, MessageService],
})
export class LawyerModule {}
