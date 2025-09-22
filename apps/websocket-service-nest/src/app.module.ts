import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatModule } from './chat/chat.module';
import { MongodbService } from './lib/mongodb.service';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/chat'),
    ChatModule,
  ],
  providers: [MongodbService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly mongodbService: MongodbService) {}

  async onModuleInit() {
    await this.mongodbService.connect();
  }
}
