import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatModule } from './chat/chat.module';
import { AdminModule } from './admin/admin.module';
import { LawyerModule } from './lawyer/lawyer.module';
import { MongodbService } from './lib/mongodb.service';
import { AIService } from './lib/ai.service';
import { GeminiService } from './lib/gemini.service';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/chat'),
    ChatModule,
    AdminModule,
    LawyerModule,
  ],
  providers: [MongodbService, AIService, GeminiService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly mongodbService: MongodbService) {}

  async onModuleInit() {
    await this.mongodbService.connect();
  }
}
