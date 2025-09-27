import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { BillingController } from './billing.controller';
import { BillingService } from '../lib/billing.service';
import Charge from '../models/Charge';
import Conversation from '../models/Conversation';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Charge', schema: Charge.schema },
      { name: 'Conversation', schema: Conversation.schema },
    ]),
    JwtModule.register({
      secret: process.env.NEXTAUTH_SECRET || 'dev-secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
