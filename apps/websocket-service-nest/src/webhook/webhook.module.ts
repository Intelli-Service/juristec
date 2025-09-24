import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { BillingService } from '../lib/billing.service';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Charge', schema: require('../models/Charge').default.schema }
    ])
  ],
  controllers: [WebhookController],
  providers: [BillingService],
})
export class WebhookModule {}