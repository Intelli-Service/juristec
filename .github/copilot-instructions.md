# Copilot Instructions - Escritório de Advocacia Online

## Project Overview
This is a monorepo for an online legal office platform connecting users to specialized lawyers via AI-driven triage. Focus on "wow" user experience with natural AI chat, automatic registration, and integrated payments to prevent direct contacts.

## Architecture
- **Monorepo Structure**: `apps/next-app` (Next.js frontend), future `apps/nest-api` (NestJS backend for complex processing).
- **Frontend**: Next.js with App Router, Server Components, TypeScript, Tailwind CSS. Prioritize server-side logic to minimize APIs.
- **Backend**: NestJS for AI processing and heavy computations.
- **Database**: MongoDB for flexible user/case/lawyer data.
- **AI**: Google Gemini API for conversational triage (initial, cost-effective; future multi-model).
- **Key Flows**: User chat → AI collects data → Triage (simple resolve or connect lawyer) → Payment via platform.

## Key Patterns
- **Environment Variables**: Always use `.env` for sensitive data (e.g., `GOOGLE_API_KEY`). Never hardcode secrets.
- **File Structure**: `src/app/` for pages, `src/components/` for reusable UI, `src/lib/` for utilities, `src/types/` for shared TypeScript interfaces.
- **AI Integration**: Use Gemini SDK with prompt: "Você é um assistente jurídico brasileiro. Colete dados do usuário naturalmente, triagem casos simples/complexos, conecte advogados se necessário."
- **Registration**: Device-based recognition via cookies, cross-device via email/SMS confirmation. Support anonymous mode.
- **Monetization**: Stripe integration for platform contracts, commission-based to encourage usage.
- **Error Handling**: Centralized logging, graceful degradation for AI failures.

## Development Workflow
- **Setup**: `cd apps/next-app && npm install` then `npm run dev`.
- **Build/Test**: Use `npm run build` for production build. Tests not yet implemented; use mocks for automation only.
- **Debugging**: Check browser console for client errors, server logs for API issues. AI responses logged in console.
- **Commits**: Follow conventional commits (e.g., "feat: add chat component").
- **Linting**: ESLint + Prettier enforced; run `npm run lint` before commits.

## Important Files
- `docs/project-instructions.md`: Detailed development guide with premises and next steps.
- `docs/architecture.md`: High-level architecture, technologies, and flows.
- `apps/next-app/src/app/`: Page routes (future chat, dashboard).
- `apps/next-app/.env.example`: Template for environment variables.

Focus on MVP speed: implement core chat with real Gemini API, avoid unnecessary complexity. Prioritize user "wow" factor in UI/UX.
