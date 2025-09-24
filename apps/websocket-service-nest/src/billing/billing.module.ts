import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { BillingController } from './billing.controller';
import { BillingService } from '../lib/billing.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Charge', schema: require('../models/Charge').default.schema },
      { name: 'Conversation', schema: require('../models/Conversation').default.schema }
    ]),
    JwtModule.register({
      secret: process.env.NEXTAUTH_SECRET || 'dev-secret',
      signOptions: { expiresIn: '7d' }
    })
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService]
})
export class BillingModule {}