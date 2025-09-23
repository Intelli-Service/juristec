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

  // Configurar CORS para permitir acesso do proxy e frontend
  app.enableCors({
    origin: [
      'http://localhost:3000', // Next.js development
      'http://127.0.0.1:3000', // Alternative localhost
      'http://localhost:8080', // Development proxy
      'http://127.0.0.1:8080', // Alternative proxy
      process.env.FRONTEND_URL || 'http://localhost:8080' // Environment variable for production
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    credentials: true,
  });

  app.useWebSocketAdapter(new IoAdapter(app));
  await app.listen(process.env.PORT ?? 4000);
  console.log(`WebSocket server running on port ${process.env.PORT ?? 4000}`);
}
bootstrap();
