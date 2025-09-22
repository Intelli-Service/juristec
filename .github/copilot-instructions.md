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
- 🚧 **Authentication**: Basic device-based recognition (next phase).
- 🚧 **Payment Integration**: Stripe setup (future implementation).
- 🚧 **Lawyer Dashboard**: Not yet implemented.

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
- **Setup**: `cd apps/next-app && npm install` then `npm run dev` (port 3000). For WebSocket: `cd apps/websocket-service-nest && npm run start:dev` (port 4000).
- **Build/Test**: Use `npm run build` for production build. Tests not yet implemented; use mocks for automation only.
- **Debugging**: Check browser console for client errors, server logs for API/WebSocket issues. AI responses logged in console.
- **Commits**: Follow conventional commits (e.g., "feat: add chat component").
- **Linting**: ESLint + Prettier enforced; run `npm run lint` before commits.

## Important Files
- `docs/project-instructions.md`: Detailed development guide with premises and next steps.
- `docs/architecture.md`: High-level architecture, technologies, and flows.
- `apps/next-app/src/app/`: Page routes (landing page at `/`, chat at `/chat`).
- `apps/next-app/src/components/`: Reusable UI components (Chat.tsx with WebSocket integration).
- `apps/websocket-service-nest/`: NestJS WebSocket service with ChatGateway and AI integration.
- `apps/next-app/.env.example`: Template for environment variables (GOOGLE_API_KEY, NEXT_PUBLIC_WS_URL, MONGODB_URI).

Focus on MVP completion: enhance chat experience, implement authentication, add lawyer dashboard. Prioritize user "wow" factor in UI/UX with professional legal design.
