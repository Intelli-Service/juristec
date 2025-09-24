import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BillingController } from './billing.controller';
import { BillingService } from '../lib/billing.service';
import { PaymentService } from '../lib/payment.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Charge', schema: require('../models/Charge').default.schema }
    ])
  ],
  controllers: [BillingController],
  providers: [BillingService, PaymentService],
  exports: [BillingService]
})
export class BillingModule {}