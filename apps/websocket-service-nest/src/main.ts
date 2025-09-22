import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
// dotenv.config() automaticamente:
// - Carrega .env se existir (desenvolvimento)
// - Não sobrescreve variáveis já definidas (produção)
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`MONGODB_URI: ${process.env.MONGODB_URI ? 'Present' : 'Missing'}`);
  console.log(`GOOGLE_API_KEY: ${process.env.GOOGLE_API_KEY ? 'Present' : 'Missing'}`);
  console.log(`PORT: ${process.env.PORT || '4000 (default)'}`);

  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));
  await app.listen(process.env.PORT ?? 4000);
  console.log(`WebSocket server running on port ${process.env.PORT ?? 4000}`);
}
bootstrap();
