import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsService } from '../lib/analytics.service';
import { AnalyticsController } from './analytics.controller';
import Conversation from '../models/Conversation';
import Charge from '../models/Charge';
import Message from '../models/Message';
import User from '../models/User';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Charge', schema: Charge.schema },
      { name: 'Conversation', schema: Conversation.schema },
      { name: 'Message', schema: Message.schema },
      { name: 'User', schema: User.schema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
