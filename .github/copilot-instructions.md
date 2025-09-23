# Copilot Instructions - Escritório de Advocacia Online

## Project Overview
This is a monorepo for an online legal office platform connecting users to specialized lawyers via AI-driven triage. Focus on "wow" user experience with natural AI chat, automatic registration, and integrated payments to prevent direct contacts.

## Architecture
- **Monorepo Structure**: `apps/next-app` (Next.js frontend), `apps/websocket-service-nest` (NestJS WebSocket service for real-time chat).
- **Frontend**: Next.js with App Router, Server Components, TypeScript, Tailwind CSS. Professional legal-themed design (navy blue, slate gray, emerald green).
- **Backend**: NestJS WebSocket service with Socket.io for real-time communication and AI integration.
- **Database**: MongoDB with Mongoose for flexible user/case/lawyer data and conversation history.
- **AI**: Google Gemini API for conversational triage (Portuguese legal assistant prompt).
- **Real-time Communication**: Socket.io with NestJS for persistent chat connections.
- **Key Flows**: User chat → AI collects data → Triage (simple resolve or connect lawyer) → Payment via platform.

## Current Implementation Status
- ✅ **Landing Page**: Professional design with hero section, features, testimonials, footer, and legal color palette.
- ✅ **Chat Interface**: Real-time WebSocket chat with responsive layout (80vh height, max-width 4xl, centered).
- ✅ **AI Integration**: Google Gemini API with Portuguese legal assistant prompt.
- ✅ **WebSocket Service**: NestJS service with ChatGateway, conversation persistence, and message history.
- ✅ **UI/UX**: Modern animations, professional design, mobile-responsive layout.
- ✅ **Authentication System**: NextAuth.js with MongoDB, JWT tokens, role-based permissions (super_admin, lawyer, moderator, client).
- ✅ **Admin Dashboard**: AI configuration, user management, case assignment, reporting system.
- ✅ **Lawyer Dashboard**: Case management, client communication, status updates.
- ✅ **Database Models**: User, AIConfig, Conversation, Message with proper relationships and indexing.
- ✅ **Security**: JWT validation, role-based guards, permission system, password hashing.
- ✅ **Development Environment**: Docker Compose + nginx proxy simulating production ingress.
- 🚧 **WebSocket Authentication**: Needs implementation for JWT validation in Socket.io.
- 🚧 **Automated Testing**: Unit and integration tests for authentication flow.
- 🚧 **Production Deployment**: Kubernetes manifests and CI/CD pipeline.

## Key Patterns
- **Environment Variables**: Always use `.env` for sensitive data (e.g., `GOOGLE_API_KEY`, `MONGODB_URI`). Never hardcode secrets.
- **File Structure**: `src/app/` for pages, `src/components/` for reusable UI, `src/lib/` for utilities, `src/types/` for shared TypeScript interfaces.
- **AI Integration**: Use Gemini SDK with prompt: "Você é um assistente jurídico brasileiro. Colete dados do usuário naturalmente, triagem casos simples/complexos, conecte advogados se necessário."
- **WebSocket Communication**: Socket.io with room-based conversations for multi-user support.
- **Design System**: Legal-themed colors (slate-900 headers, emerald-600 accents, slate-50 backgrounds).
- **Registration**: Device-based recognition via localStorage, cross-device via email/SMS confirmation. Support anonymous mode.
- **Monetization**: Stripe integration for platform contracts, commission-based to encourage usage.
- **Error Handling**: Centralized logging, graceful degradation for AI failures.

## Development Workflow

### Docker Compose Environment (Recommended)
- **Setup**: `docker-compose up --build -d` (runs all services in background)
- **Access**: Application available at http://localhost:8080 (nginx proxy)
- **Logs**: `docker-compose logs -f [service]` for real-time debugging
- **Services**: nginx (proxy), frontend (Next.js :3000), backend (NestJS :4000)
- **Hot Reload**: Code changes automatically reflected in containers
- **Debugging**: `docker-compose exec [service] sh` to enter containers

### Local Development (Alternative)
- **Frontend**: `cd apps/next-app && npm run dev` (port 3000)
- **Backend**: `cd apps/websocket-service-nest && npm run start:dev` (port 4000)
- **Note**: Use Docker Compose for production-like environment and easier debugging

### Database & Authentication
- **MongoDB**: Using MongoDB Atlas (configured in .env files)
- **Test Users**: Created via `npx tsx scripts/seed.ts` in frontend
  - Admin: admin@demo.com / admin123
  - Lawyer: lawyer@demo.com / lawyer123
- **NextAuth**: Session-based auth with JWT tokens, role-based permissions

## Important Files
- `docs/project-instructions.md`: Detailed development guide with premises and next steps.
- `docs/architecture.md`: High-level architecture, technologies, and flows.
- `docker-compose.yml`: Complete development environment with nginx proxy.
- `nginx/default.conf`: Nginx routing configuration (production-like setup).
- `apps/next-app/src/app/`: Page routes (landing page at `/`, chat at `/chat`, admin at `/admin`).
- `apps/next-app/src/components/`: Reusable UI components (Chat.tsx with WebSocket integration).
- `apps/next-app/src/lib/auth.ts`: NextAuth.js configuration with role-based permissions.
- `apps/websocket-service-nest/`: NestJS WebSocket service with ChatGateway and AI integration.
- `apps/websocket-service-nest/src/guards/`: Authentication guards for API protection.
- `apps/next-app/.env.local` & `apps/websocket-service-nest/.env`: Environment variables and secrets.

## Current Progress & Next Steps

### ✅ Completed
1. **Authentication System**: NextAuth.js with MongoDB, JWT tokens, role-based permissions
2. **Admin Dashboard**: Full CRUD for users, AI config, case management
3. **Lawyer Dashboard**: Case assignment, client communication interface
4. **Development Environment**: Docker Compose with nginx proxy (production-like)
5. **API Security**: Guards, permissions, role validation on all protected endpoints

### 🚧 In Progress
1. **WebSocket Authentication**: Implement JWT validation in Socket.io connections
2. **Frontend Integration**: Connect admin/lawyer dashboards to backend APIs
3. **Chat Authentication**: Secure chat rooms with user sessions

### 📋 Next Priorities
1. **Complete WebSocket Auth**: Extract JWT from cookies in WebSocket connections
2. **End-to-End Testing**: Login flow, protected routes, API calls through nginx
3. **Production Deployment**: Kubernetes manifests, ingress setup, CI/CD pipeline
4. **Advanced Features**: File uploads, payment integration, email notifications
