# Juristec - Plataforma Jurídica Online

Sistema de escritório de advocacia online que conecta usuários a advogados especializados via IA, oferecendo triagem inteligente e consultoria jurídica acessível.

## 🚀 Quick Start (Docker - Recomendado)

```bash
# Clonar e acessar o projeto
git clone <repo-url>
cd idea-app

# Iniciar ambiente completo
docker-compose up --build -d

# Acessar aplicação
open http://localhost:8080
```

**Credenciais de teste:**

- Admin: `admin@demo.com` / `admin123`  
- Advogado: `lawyer@demo.com` / `lawyer123`

## Estrutura

- `apps/`: Aplicações principais
  - `next-app/`: Frontend Next.js com NextAuth.js
  - `websocket-service-nest/`: Backend NestJS com Socket.io
- `docs/`: Documentação técnica e guias
- `nginx/`: Configuração do proxy reverso
- `docker-compose.yml`: Ambiente de desenvolvimento

## Tecnologias

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, NextAuth.js
- **Backend**: NestJS, Socket.io, JWT Guards, Role-based permissions
- **Banco de Dados**: MongoDB Atlas com Mongoose
- **IA**: Google Gemini API para triagem jurídica
- **Infraestrutura**: Docker Compose, Nginx proxy
- **Autenticação**: NextAuth.js com JWT tokens compartilhados

## Como executar

### 🐳 Docker (Recomendado)

```bash
# Ambiente completo com nginx
docker-compose up --build -d

# Ver logs
docker-compose logs -f

# Parar
docker-compose down
```

### 💻 Desenvolvimento Local

```bash
# Backend
cd apps/websocket-service-nest
npm install && npm run start:dev

# Frontend  
cd apps/next-app
npm install && npm run dev
```

## URLs

- **Frontend**: <http://localhost:8080>
- **Admin Dashboard**: <http://localhost:8080/admin>
- **Lawyer Dashboard**: <http://localhost:8080/lawyer>
- **Login**: <http://localhost:8080/auth/signin>

## Documentação

- [Architecture](docs/architecture.md): Visão geral da arquitetura
- [Docker Development](docs/docker-development.md): Guia completo do Docker
- [Project Instructions](docs/project-instructions.md): Instruções detalhadas
