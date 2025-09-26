import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
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
      { name: 'Conversation', schema: Conversation.schema },
    ]),
    JwtModule.register({
      secret: process.env.NEXTAUTH_SECRET || 'dev-secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
