# Juristec - Plataforma Jurídica Online

Sistema de escritório de advocacia online que conecta usuários a advogados especializados via IA, oferecendo triagem inteligente e consultoria jurídica acessível.

## Estrutura

- `apps/`: Aplicações principais
  - `next-app/`: Frontend Next.js (interface do usuário)
  - `websocket-service-nest/`: Backend NestJS (chat em tempo real, IA)
- `docs/`: Documentação técnica
- `packages/`: Bibliotecas compartilhadas (futuro)

## Tecnologias

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: NestJS, Socket.io para WebSocket
- **Banco de Dados**: MongoDB com Mongoose
- **IA**: Google Gemini API
- **Deploy**: Vercel (frontend), AWS/Railway (backend)

## Como executar

1. Instalar dependências: `cd apps/next-app && npm install`
2. Configurar variáveis de ambiente: Copie `apps/next-app/.env.example` para `apps/next-app/.env.local` e adicione sua chave da Google AI.
3. Rodar: `cd apps/next-app && npm run dev`

Acesse `http://localhost:3000` para ver a landing page e testar o chat.

Ver [docs/architecture.md](docs/architecture.md) para detalhes da arquitetura.
