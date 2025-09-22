import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatModule } from './chat/chat.module';
import { MongodbService } from './lib/mongodb.service';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb+srv://adeva:UDFhIeQR85J0QOBQ@itellichat.q9eooso.mongodb.net/?retryWrites=true&w=majority&appName=ItelliChat'),
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
