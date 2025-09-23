import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ChatModule } from './chat/chat.module';
import { AdminModule } from './admin/admin.module';
import { LawyerModule } from './lawyer/lawyer.module';
import { MongodbService } from './lib/mongodb.service';
import { AIService } from './lib/ai.service';
import { GeminiService } from './lib/gemini.service';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/chat'),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.NEXTAUTH_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
    ChatModule,
    AdminModule,
    LawyerModule,
  ],
  providers: [MongodbService, AIService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly mongodbService: MongodbService) {}

  async onModuleInit() {
    await this.mongodbService.connect();
  }
}
