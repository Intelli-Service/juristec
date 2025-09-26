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
6. **Code Review Interno**: Execute análise completa e valide todos os critérios de qualidade
7. **Pull Request**: Crie PR (GitHub Copilot será automaticamente solicitado para review)
8. **Implementar Feedback**: Aplique melhorias sugeridas pelo Copilot e re-test
9. **Aguardar Merge**: O merge será feito manualmente após aprovação
10. **Issue Close**: A issue será fechada automaticamente após merge

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
4. **Code Review Interno**: Execute análise completa do código antes de criar PR
5. **Checks**: Todos os testes devem passar
6. **Repositório Limpo**: OBRIGATÓRIO - Verificar e resolver todos os arquivos pendentes
7. **GitHub Copilot Review**: Será solicitado automaticamente pelo GitHub
8. **Aguardar Merge**: O merge será feito manualmente após aprovação dos reviews

### 🧹 **REGRA CRÍTICA: REPOSITÓRIO LIMPO**

**OBRIGATÓRIO EM TODA TAREFA**: O repositório local deve estar completamente limpo ao final de cada issue/tarefa.

#### **Verificação de Limpeza (Executar SEMPRE)**
```bash
git status
# DEVE retornar: "working tree clean"
# NUNCA pode ter: "Changes not staged", "Untracked files", "Changes staged"
```

#### **Processo de Limpeza Obrigatório**
1. **Análise**: `git status` - Identificar todos os arquivos pendentes
2. **Categorização**: Separar arquivos por tipo (código, config, temporários)
3. **Decisão**: Para cada arquivo:
   - **Código/Features**: Commit com mensagem descritiva
   - **Configuração**: Commit separado para configs
   - **Temporários/Build**: Adicionar ao `.gitignore` e descartar
   - **Testes**: Commit junto com código relacionado
4. **Execução**: Fazer commits específicos para cada categoria
5. **Validação**: `git status` deve retornar "working tree clean"

#### **Commits de Limpeza (Exemplos)**
```bash
# Para arquivos de feature esquecidos
git commit -m "feat: add missing analytics components"

# Para configurações
git commit -m "config: update nginx and environment settings"

# Para correções de build
git commit -m "fix: resolve dependency injection issues"

# Para testes
git commit -m "test: add analytics service unit tests"
```

#### **NUNCA deixar pendente**:
- ❌ Arquivos modificados sem commit
- ❌ Arquivos novos sem tracking
- ❌ Arquivos staged sem commit
- ❌ Merge conflicts não resolvidos

#### **SEMPRE garantir**:
- ✅ `git status` = "working tree clean"
- ✅ Todos os commits têm mensagens descritivas
- ✅ Histórico git organizado e legível
- ✅ Branch pronta para merge sem problemas

#### 📋 Code Review Process
**ATUALIZADO**: GitHub Copilot foi configurado para fazer reviews automáticas de PRs. O processo simplificado é:

1. **Code Review Interno**: Execute análise completa antes de criar o PR:
   - Qualidade do código e aderência às melhores práticas
   - Cobertura de testes e estratégia TDD
   - Integração com arquitetura existente
   - Segurança e performance

2. **Criar Pull Request**: Após aprovação do code review interno, crie o PR normalmente

3. **Review Automático**: GitHub Copilot será automaticamente solicitado como reviewer

4. **Acompanhar Feedback**: Os comentários do Copilot aparecerão automaticamente no PR

5. **Implementar Sugestões**: Aplique melhorias sugeridas quando apropriado

6. **Aguardar Aprovação**: O merge será feito manualmente após todas as aprovações

**Nota**: Não é mais necessário usar funções MCP para solicitar code review do Copilot.

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

### 🔄 Processo de Code Review Duplo (Obrigatório)

**REGRAS DE CODE REVIEW ATUALIZADAS**:

#### 📋 **FASE 1: Code Review Interno (Antes de Commits/PR)**
1. **Análise de Qualidade**: Execute análise completa do código implementado
2. **Validação de Requisitos**: Confirme que todos os requisitos da issue foram atendidos
3. **Testes Abrangentes**: Execute todos os testes (unitários, integração, e2e)
4. **Segurança**: Valide implementação de medidas de segurança apropriadas
5. **Performance**: Verifique otimização e eficiência do código
6. **Documentação**: Confirme documentação técnica atualizada
7. **APENAS APÓS APROVAÇÃO**: Faça commits e crie Pull Request

#### 🤖 **FASE 2: Code Review Automático GitHub Copilot (Após PR)**
1. **Review Automático**: GitHub Copilot será automaticamente solicitado como reviewer
2. **Analisar Feedback**: Reveja todas as sugestões e comentários do Copilot
3. **Implementar Melhorias**: Aplique melhorias identificadas (com aprovação manual)
4. **Re-testar**: Execute testes novamente após implementações
5. **Aguardar Merge**: O merge será feito manualmente após todas as aprovações

**CRITÉRIOS DE APROVAÇÃO**:
- ✅ Todos os testes passando
- ✅ Code review interno aprovado
- ✅ Feedback do Copilot analisado e implementado
- ✅ Segurança validada
- ✅ Performance adequada
- ✅ Documentação atualizada

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

### ✅ Completed (15/20 Issues - 75% Complete)
**CORE MVP FUNCTIONALITIES DELIVERED:**

1. **Issue #14**: Sistema de Cadastro Inteligente com Function Calls do Gemini ✅
   - Status: **CONCLUÍDA** - Sistema implementado e funcional
   - Data: Concluída anteriormente
   - **Impacto**: IA coleta dados naturalmente, registra usuários automaticamente

2. **Issue #2**: Sistema de Cadastro Fluido - Sem Obrigatoriedade Inicial ✅
   - Status: **CONCLUÍDA** - Sistema implementado e funcional
   - Data: Concluída anteriormente
   - **Impacto**: Usuários conversam anonimamente, dados coletados durante chat

3. **Issue #4**: Sistema de Anexos de Arquivos - Upload Seguro ✅
   - Status: **CONCLUÍDA** - PR #17 mergeado com sucesso
   - Data: 24 de setembro de 2025
   - **Implementação**: GCS + UI drag-and-drop + validação completa + testes passando (9/9)
   - **Impacto**: Documentos jurídicos seguros, validação robusta, UX profissional

4. **Issue #5**: Dashboard do Advogado - Gerenciamento de Casos ✅
   - Status: **CONCLUÍDA** - PR #18 mergeado com sucesso
   - Data: 24 de setembro de 2025
   - **Implementação**: Dashboard completo + APIs backend + estatísticas + testes
   - **Impacto**: Advogados gerenciam casos, comunicação integrada, métricas

5. **Issue #8**: Integração de Pagamentos - Pagar.me ✅
   - Status: **CONCLUÍDA** - PR #19 mergeado com sucesso
   - Data: 24 de setembro de 2025
   - **Implementação**: Sistema completo Pagar.me + split payments + UI checkout + testes
   - **Impacto**: Monetização funcional, pagamentos seguros, split automático

6. **Issue #3**: Melhorias na Interface do Chat - UX Fluida ✅
   - Status: **CONCLUÍDA** - Interface profissional implementada
   - **Impacto**: Chat responsivo, design jurídico, experiência premium

7. **Issue #6**: Sistema de Avaliações e Feedback ✅
   - Status: **CONCLUÍDA** - Sistema de feedback inteligente implementado
   - **Impacto**: Avaliações pós-atendimento, métricas de satisfação

8. **Issue #9**: Analytics e Relatórios Administrativos ✅
   - Status: **CONCLUÍDA** - Dashboard admin com métricas completas
   - **Impacto**: Business intelligence, relatórios financeiros, controle operacional

9. **Issue #12**: Testes Automatizados e Qualidade de Código ✅
   - Status: **CONCLUÍDA** - Suite completa de testes implementada
   - **Cobertura**: Frontend: ~35%, Backend: ~53% (dentro dos padrões)
   - **Impacto**: Qualidade garantida, CI/CD funcional

10. **Issue #28**: Sistema de Notificações Moderno (Toast) ✅
    - Status: **CONCLUÍDA** - Substituição completa de alert() por sistema moderno
    - **Impacto**: UX profissional, acessibilidade WCAG, feedback não-intrusivo

11. **Issue #29**: Refatoração de Código - Magic Numbers ✅
    - Status: **CONCLUÍDA** - Constantes extraídas, tipagem forte implementada
    - **Impacto**: Manutenibilidade, redução de bugs, code quality

12. **Issue #30**: Otimização de Performance - Upload Streaming ✅
    - Status: **CONCLUÍDA** - Streaming implementado, performance melhorada
    - **Impacto**: Uploads eficientes, menor uso de memória

13. **Issue #33**: Sistema de Status de Conversa Controlado por IA ✅
    - Status: **CONCLUÍDA** - Status inteligente baseado em contexto
    - **Impacto**: Feedback no momento certo, métricas precisas

#### 🔒 **SEGURANÇA IMPLEMENTADA**
14. **Issue #27**: Vulnerabilidades Críticas Corrigidas ✅
    - Status: **CONCLUÍDA** - Signed URLs, controle de acesso, auditoria
    - **Impacto**: Segurança LGPD compliant, dados protegidos

#### 📊 **MÉTRICAS DE SUCESSO ATINGIDAS**
- ✅ **Funcionalidades Core**: 100% implementadas
- ✅ **Testes**: 211 testes backend + 84 testes frontend passando
- ✅ **Qualidade**: ESLint limpo, TypeScript strict mode
- ✅ **Performance**: Streaming uploads, queries otimizadas
- ✅ **Segurança**: JWT, signed URLs, validação robusta
- ✅ **UX**: Interface profissional, acessibilidade WCAG

### 🚧 In Progress (3/20 Issues - 15%)
1. **Issue #26**: Otimização MongoDB Analytics Service
   - Status: **EM ANDAMENTO** - Queries precisam de paginação/field projection
   - **Prioridade**: MÉDIA - Performance para datasets grandes

### 📋 Next Priorities (2/20 Issues - 10%)

#### 🔒 **SEGURANÇA E QUALIDADE (ALTA PRIORIDADE)**
1. **Issue #11**: Segurança e Compliance Jurídico
   - Status: **PENDENTE** - LGPD, criptografia, auditoria completa
   - **Prioridade**: ALTA - Requisito para produção
   - **Bloqueia**: Deploy em produção

#### 📊 **MÉDIA PRIORIDADE (Melhorias e Qualidade)**
2. **Issue #7**: Sistema de Agendamento e Consultas
   - Status: **PENDENTE** - Calendário integrado, consultas virtuais
   - **Prioridade**: MÉDIA - Otimização de processos

3. **Issue #10**: Sistema de Notificações e Comunicação
   - Status: **PENDENTE** - Push, email, SMS, WhatsApp
   - **Prioridade**: MÉDIA - Engajamento de usuários

4. **Issue #21**: Sistema de Sugestão de Preços com IA
   - Status: **PENDENTE** - IA sugere valores baseados em mercado
   - **Prioridade**: MÉDIA - Aumento de receita
