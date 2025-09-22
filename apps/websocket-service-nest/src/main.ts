import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();
process.env.MONGODB_URI = 'mongodb+srv://adeva:UDFhIeQR85J0QOBQ@itellichat.q9eooso.mongodb.net/?retryWrites=true&w=majority&appName=ItelliChat';
process.env.GOOGLE_API_KEY = 'AIzaSyDfrGlkneG0K5uHMlVP9AxxTw5wP_0tD64';
process.env.PORT = '4000';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));
  await app.listen(process.env.PORT ?? 4000);
  console.log(`WebSocket server running on port ${process.env.PORT ?? 4000}`);
}
bootstrap();
