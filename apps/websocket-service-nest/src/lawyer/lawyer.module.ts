import { Module } from '@nestjs/common';
import { LawyerController } from './lawyer.controller';
import { AIService } from '../lib/ai.service';

@Module({
  controllers: [LawyerController],
  providers: [AIService],
})
export class LawyerModule {}