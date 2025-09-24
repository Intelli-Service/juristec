import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsService } from '../lib/analytics.service';
import { AnalyticsController } from './analytics.controller';
import Conversation from '../models/Conversation';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Charge', schema: require('../models/Charge').default.schema },
      { name: 'Conversation', schema: Conversation.schema },
      { name: 'Message', schema: require('../models/Message').default.schema },
      { name: 'User', schema: require('../models/User').default.schema }
    ])
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService]
})
export class AnalyticsModule {}