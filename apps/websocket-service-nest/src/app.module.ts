import { Module, OnModuleInit, MiddlewareConsumer } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from './chat/chat.module';
import { AdminModule } from './admin/admin.module';
import { LawyerModule } from './lawyer/lawyer.module';
import { UploadsModule } from './uploads/uploads.module';
import { PaymentModule } from './payment/payment.module';
import { BillingModule } from './billing/billing.module';
import { WebhookModule } from './webhook/webhook.module';
import { FeedbackModule } from './feedback/feedback.module';
import { LGPDModule } from './lgpd/lgpd.module';
import { AuditMiddleware } from './middleware/audit.middleware';
import { MongodbService } from './lib/mongodb.service';
import { AIService } from './lib/ai.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Only connect to MongoDB if URI is provided
    ...(process.env.MONGODB_URI
      ? [MongooseModule.forRoot(process.env.MONGODB_URI)]
      : []),
    JwtModule.register({
      secret: process.env.NEXTAUTH_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
    ChatModule,
    AdminModule,
    LawyerModule,
    UploadsModule,
    PaymentModule,
    BillingModule,
    WebhookModule,
    FeedbackModule,
    LGPDModule,
  ],
  controllers: [AppController],
  providers: [AppService, MongodbService, AIService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly mongodbService: MongodbService) {}

  async onModuleInit() {
    if (process.env.MONGODB_URI) {
      await this.mongodbService.connect();
    } else {
      console.log('MongoDB disabled - running without database persistence');
    }
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditMiddleware).forRoutes('*'); // Aplica em todas as rotas
  }
}
