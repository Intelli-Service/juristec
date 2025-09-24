import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentController } from './payment.controller';
import { PaymentService } from '../lib/payment.service';
import { PaymentSchema } from '../models/Payment';
import { PaymentTransactionSchema } from '../models/PaymentTransaction';
import Conversation from '../models/Conversation';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Payment', schema: PaymentSchema },
      { name: 'PaymentTransaction', schema: PaymentTransactionSchema },
      { name: 'Conversation', schema: Conversation.schema }
    ])
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService]
})
export class PaymentModule {}