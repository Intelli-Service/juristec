import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { LawyerController } from './lawyer.controller';
import { AIService } from '../lib/ai.service';

@Module({
  imports: [JwtModule],
  controllers: [LawyerController],
  providers: [AIService],
})
export class LawyerModule {}