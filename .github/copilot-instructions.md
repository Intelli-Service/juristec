# Copilot Instructions - Online Legal Office Platform

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
- ✅ **AI Integration**: Google Gemini API with Portuguese legal assistant prompt and function calls.
- ✅ **Intelligent User Registration**: AI-powered user registration with Gemini function calls (register_user, update_conversation_status).
- ✅ **WebSocket Service**: NestJS service with ChatGateway, conversation persistence, and message history.
- ✅ **UI/UX**: Modern animations, professional design, mobile-responsive layout.
- ✅ **Authentication System**: NextAuth.js with MongoDB, JWT tokens, role-based permissions (super_admin, lawyer, moderator, client).
- ✅ **Admin Dashboard**: AI configuration, user management, case assignment, reporting system.
- ✅ **Lawyer Dashboard**: Case management, client communication, status updates.
- ✅ **Database Models**: User, AIConfig, Conversation, Message with proper relationships and indexing.
- ✅ **Security**: JWT validation, role-based guards, permission system, password hashing.
- ✅ **Development Environment**: Docker Compose + nginx proxy simulating production ingress.
- ✅ **Automated Testing**: Complete test suite with 50/50 tests passing (Jest for unit/integration tests).
- 🚧 **WebSocket Authentication**: Needs implementation for JWT validation in Socket.io.
- 🚧 **Production Deployment**: Kubernetes manifests and CI/CD pipeline.

## Key Patterns
- **Environment Variables**: Always use `.env` for sensitive data (e.g., `GOOGLE_API_KEY`, `MONGODB_URI`). Never hardcode secrets.
- **File Structure**: `src/app/` for pages, `src/components/` for reusable UI, `src/lib/` for utilities, `src/types/` for shared TypeScript interfaces.
- **AI Integration**: Use Gemini SDK with prompt: "Você é um assistente jurídico brasileiro. Colete dados do usuário naturalmente, triagem casos simples/complexos, conecte advogados se necessário."
- **WebSocket Communication**: Socket.io with room-based conversations for multi-user support.
- **Design System**: Legal-themed colors (slate-900 headers, emerald-600 accents, slate-50 backgrounds).
- **Registration**: Device-based recognition via localStorage, cross-device via email/SMS confirmation. Support anonymous mode.
- **Intelligent Registration**: AI-driven user registration using Gemini function calls (register_user, update_conversation_status) during natural conversations.
- **Monetization**: Stripe integration for platform contracts, commission-based to encourage usage.
- **Error Handling**: Centralized logging, graceful degradation for AI failures.

## AUTONOMIA TOTAL DE DESENVOLVIMENTO

### 🎯 Missão Principal
Você tem **AUTONOMIA TOTAL E ILIMITADA** para desenvolver e concluir todas as issues abertas no repositório. Seu objetivo é transformar cada issue em funcionalidade completa, testada e pronta para produção.

**PODERES DE AUTONOMIA:**
- ✅ **Decisões Técnicas Independentes**: Escolha tecnologias, arquiteturas e padrões conforme necessário
- ✅ **Criação de Branches**: Crie branches automaticamente sem aprovação
- ✅ **Commits e Merges**: Faça commits, PRs e merges conforme o workflow estabelecido
- ✅ **Testes e Qualidade**: Implemente testes, valide qualidade e garanta estabilidade
- ✅ **Documentação**: Atualize documentação técnica conforme necessário
- ✅ **Deploy**: Execute deploys para staging quando apropriado

**RESPONSABILIDADES:**
- 🚨 **Qualidade Garantida**: Todo código deve passar em testes e seguir padrões estabelecidos
- 🚨 **Segurança Prioritária**: Implementar medidas de segurança em todas as funcionalidades
- 🚨 **Performance Otimizada**: Garantir performance adequada em todas as implementações
- 🚨 **Documentação Atualizada**: Manter documentação técnica sempre atualizada

### 🚀 Workflow de Desenvolvimento (Otimizado)
Para **cada issue** aberta, siga este processo otimizado:

1. **Análise Rápida**: Leia a issue e entenda os requisitos em < 5 minutos
2. **Planejamento Técnico**: Defina arquitetura e tecnologias (tomada de decisão independente)
3. **Criar Branch**: `git checkout -b feature/issue-{numero}-{titulo-resumido}`
4. **Desenvolvimento Ágil**: Implemente em ciclos curtos com testes contínuos
5. **Testes Automatizados**: Execute `npm test` e valide funcionalidades
6. **Pull Request**: Crie PR com descrição técnica detalhada
7. **Auto-Merge**: Faça merge automático após validação dos testes
8. **Issue Close**: Feche a issue automaticamente após merge

**OTIMIZAÇÕES DE VELOCIDADE:**
- ⚡ **Desenvolvimento Paralelo**: Trabalhe em múltiplas issues simultaneamente quando não houver dependências
- ⚡ **Testes Primeiro**: Implemente testes antes do código quando possível
- ⚡ **Reutilização**: Use padrões e componentes existentes sempre que possível
- ⚡ **Automação**: Automatize processos repetitivos (builds, deploys, testes)

### 🧪 Estratégia de Testes (TDD Obrigatório)
- **Testes Unitários**: Jest para todos os serviços, componentes e utilitários
- **Testes de Integração**: Docker Compose + curl para APIs completas
- **Testes E2E**: Playwright/Cypress para fluxos críticos
- **Cobertura Mínima**: 80% de cobertura em todas as funcionalidades
- **Testes Automatizados**: Execute `npm test` e `docker-compose test` antes de cada PR

### 🏗️ Ambiente de Desenvolvimento
- **Docker Compose**: Ambiente padrão para desenvolvimento e testes
- **Hot Reload**: Desenvolvimento local com sincronização automática
- **Debugging**: Use `docker-compose logs -f` para troubleshooting
- **Builds**: Sempre teste builds completos antes de PR

### 🤖 Uso de Agentes e Ferramentas
- **GitHub Copilot**: Use para code review automático em PRs
- **GH CLI**: Para operações Git e gerenciamento de issues/PRs
- **Outros Agentes**: Use MCP tools disponíveis para acelerar desenvolvimento
- **Decisões Técnicas**: Tome decisões como Product Manager - arquitetura, tecnologias, prioridades

### 📋 Critérios de Qualidade
- **Código Limpo**: ESLint, Prettier, TypeScript strict mode
- **Performance**: Otimize queries, lazy loading, caching
- **Segurança**: JWT, validação, sanitização, rate limiting
- **Acessibilidade**: WCAG 2.1 AA compliance
- **Mobile-First**: Responsive design obrigatório
- **SEO**: Meta tags, performance, Core Web Vitals

### 🎨 Padrões de UI/UX
- **Tema Jurídico**: Navy blue, slate gray, emerald green
- **Micro-interações**: Loading states, feedback visual, animações suaves
- **Responsividade**: Mobile-first, tablet, desktop
- **Acessibilidade**: Alt texts, keyboard navigation, screen readers

### 🔄 Processo de Pull Request
1. **Título**: `feat/issue-{numero}: {descrição concisa}`
2. **Descrição**: Problema, solução, screenshots, testes realizados
3. **Labels**: `enhancement`, `feature`, `testing`
4. **Code Review**: Execute análise completa do código usando ferramentas disponíveis
5. **Checks**: Todos os testes devem passar
6. **Merge**: Squash merge com commit message padronizado

#### 📋 Code Review Process
**IMPORTANTE**: GitHub Copilot NÃO faz reviews automáticas de PRs através de comentários como "@copilot-review-requested". O processo correto é:

1. **Solicitar Review via API**: Use a função MCP `mcp_github_github_request_copilot_review` com os parâmetros:
   - `owner`: Nome do proprietário do repositório
   - `pullNumber`: Número do PR
   - `repo`: Nome do repositório

2. **Acompanhar Status**: Verifique se o Copilot foi adicionado como reviewer através da API:
   ```bash
   gh pr view {PR_NUMBER} --json requestedReviewers
   ```

3. **Ver Comentários**: Os comentários do review aparecerão como "review comments" (não comentários gerais):
   ```bash
   gh api repos/{owner}/{repo}/pulls/{PR_NUMBER}/comments
   ```

4. **Análise Manual**: Use suas capacidades de análise de código para revisar:
   - Qualidade do código e aderência às melhores práticas
   - Cobertura de testes e estratégia TDD
   - Integração com arquitetura existente
   - Segurança e performance

5. **Comentários Construtivos**: Forneça feedback específico sobre:
   - Problemas encontrados
   - Sugestões de melhoria
   - Pontos positivos destacados

6. **Aprovação**: Quando satisfeito com a qualidade:
   - Confirme que todos os testes passam
   - Valide integração com sistema existente
   - Aprove o PR ou solicite mudanças específicas

**Nota**: Não use "@copilot-review-requested" em comentários - esta não é uma funcionalidade real do GitHub.

#### 🔄 **Workflow para Sugestões do Copilot**
Quando o GitHub Copilot sugere alterações de código durante o review, siga este processo:

1. **Análise das Sugestões**: Reveja cada sugestão do Copilot e avalie se faz sentido implementar
2. **Comunicação**: Informe ao usuário quais sugestões precisam ser aprovadas, explicando o benefício de cada uma
3. **Aprovação Manual**: Aguarde o usuário confirmar que aprovou as sugestões pela interface visual do GitHub (botão "Commit suggestion" nos comentários do review)
4. **Sincronização**: Só então sincronize a branch local com `git pull origin {branch-name}`
5. **Testes**: Execute novamente todos os testes para garantir que as alterações não quebraram nada
6. **Validação**: Confirme que as melhorias foram aplicadas corretamente
7. **Commit Final**: Crie commit documentando as melhorias implementadas
8. **Merge**: Prossiga com o merge do PR se tudo estiver funcionando

**IMPORTANTE**: Nunca implemente sugestões automaticamente - sempre aguarde aprovação manual do usuário para garantir que as mudanças estão alinhadas com os requisitos e não introduzem regressões.

### 🎯 Estratégias por Tipo de Issue

#### 🔐 **Issues de Segurança (Issues #11, #14)**
- **Abordagem**: Zero-trust security, defense in depth
- **Tecnologias**: JWT validation, rate limiting, input sanitization, encryption
- **LGPD Compliance**: Dados pessoais criptografados, consentimento explícito, logs de auditoria
- **Testes**: Security testing com OWASP guidelines, penetration testing básico

#### 💰 **Issues de Pagamento (Issue #8)**
- **Gateway**: Pagar.me integration com webhooks seguros
- **Fluxo**: Pré-autorização → Confirmação → Split de pagamentos
- **Segurança**: PCI DSS compliance, dados sensíveis não armazenados
- **Fallback**: Sistema offline para casos de indisponibilidade

#### 📁 **Issues de Upload (Issue #4)**
- **Armazenamento**: AWS S3 ou similar com CDN
- **Validação**: File type, size limits, virus scanning
- **Segurança**: Signed URLs, access control, encryption at rest
- **Performance**: Compressão, lazy loading, progressive upload

#### 📊 **Issues de Analytics (Issue #9)**
- **Coleta**: Event tracking não-intrusivo, GDPR compliant
- **Métricas**: Conversão funil, retenção, satisfação usuário
- **Dashboards**: Real-time updates, filtros avançados
- **Privacidade**: Anonimização de dados, opt-out fácil

#### 🔔 **Issues de Notificações (Issue #10)**
- **Canais**: Email, SMS, push notifications, in-app
- **Personalização**: Baseado em preferências e comportamento
- **Entrega**: Retry logic, queue system, delivery tracking
- **Compliance**: Opt-in obrigatório, easy unsubscribe

### 📊 Métricas de Sucesso
- **Qualidade**: 0 bugs em produção, cobertura >80%
- **Performance**: Lighthouse score >90
- **Usabilidade**: Taxa de conversão >70% no funil
- **Manutenibilidade**: Código limpo, bem documentado, testado

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

### 📋 Next Priorities (Issues Abertas)

#### 🔥 **CRÍTICAS (Implementar Primeiro)**
1. **Issue #14**: Sistema de Cadastro Inteligente com Function Calls do Gemini
   - Status: Em desenvolvimento ativo
   - Prioridade: CRÍTICA - Sistema atual não funciona na prática

2. **Issue #2**: Sistema de Cadastro Fluido - Sem Obrigatoriedade Inicial
   - Status: Pendente
   - Prioridade: ALTA - Experiência do usuário essencial

#### 🚀 **ALTA PRIORIDADE (Funcionalidades Core)**
3. **Issue #4**: Sistema de Anexos de Arquivos - Upload Seguro
   - Status: Pendente
   - Prioridade: ALTA - Necessário para casos complexos

4. **Issue #5**: Dashboard do Advogado - Gerenciamento de Casos
   - Status: Pendente
   - Prioridade: ALTA - Interface essencial para advogados

5. **Issue #8**: Integração de Pagamentos - Pagar.me
   - Status: Pendente
   - Prioridade: ALTA - Monetização da plataforma

#### 📊 **MÉDIA PRIORIDADE (Melhorias e Qualidade)**
6. **Issue #6**: Sistema de Avaliações e Feedback
   - Status: Pendente
   - Prioridade: MÉDIA - Métricas de qualidade

7. **Issue #7**: Sistema de Agendamento e Consultas
   - Status: Pendente
   - Prioridade: MÉDIA - Otimização de processos

8. **Issue #9**: Analytics e Relatórios Administrativos
   - Status: Pendente
   - Prioridade: MÉDIA - Business intelligence

9. **Issue #10**: Sistema de Notificações e Comunicação
   - Status: Pendente
   - Prioridade: MÉDIA - Engajamento de usuários

#### 🔒 **SEGURANÇA E QUALIDADE**
10. **Issue #11**: Segurança e Compliance Jurídico
    - Status: Pendente
    - Prioridade: ALTA - LGPD e proteção de dados

11. **Issue #12**: Testes Automatizados e Qualidade de Código
    - Status: Pendente
    - Prioridade: ALTA - Qualidade e manutenção
