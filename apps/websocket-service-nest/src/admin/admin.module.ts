import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AIService } from '../lib/ai.service';

@Module({
  controllers: [AdminController],
  providers: [AIService],
})
export class AdminModule {}