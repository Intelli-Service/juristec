import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { AIService } from '../lib/ai.service';

@Module({
  imports: [JwtModule],
  controllers: [AdminController],
  providers: [AIService],
})
export class AdminModule {}
