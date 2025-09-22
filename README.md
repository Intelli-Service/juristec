# Escritório de Advocacia Online - Monorepo

Este é o monorepo para o sistema de escritório de advocacia online, conectando usuários a advogados especializados via IA.

## Estrutura

- `apps/`: Aplicações principais
  - `next-app/`: Frontend Next.js (usuário e advogado)
  - `nest-api/`: Backend NestJS (processamentos complexos, IA)
- `docs/`: Documentação
- `packages/`: Bibliotecas compartilhadas (futuro)

## Tecnologias

- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: NestJS, Node.js
- Banco: MongoDB
- IA: OpenAI API (GPT-4)
- Deploy: Vercel (frontend), AWS/Railway (backend)

## Como executar

1. Instalar dependências: `cd apps/next-app && npm install`
2. Configurar variáveis de ambiente: Copie `apps/next-app/.env.example` para `apps/next-app/.env.local` e adicione sua chave da Google AI.
3. Rodar: `cd apps/next-app && npm run dev`

Acesse `http://localhost:3000` para ver a landing page e testar o chat.

Ver [docs/architecture.md](docs/architecture.md) para detalhes da arquitetura.
