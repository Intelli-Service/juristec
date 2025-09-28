# ✅ CHECKLIST DE PRÉ-LANÇAMENTO - Juristec Platform
## Data: 28 de setembro de 2025

---

## 🎯 **OBJETIVO**
Garantir que a plataforma esteja pronta para produção com qualidade e estabilidade.

---

## 🧪 **TESTES OBRIGATÓRIOS - CRITÉRIOS DE APROVAÇÃO**

### ✅ **1. INFRAESTRUTURA (Issues #45-50)**

#### **1.1 Database Connection** 🔴 CRÍTICO
```bash
# Verificar conexão MongoDB
docker-compose exec mongodb mongo --eval "db.stats()"

# Health check backend
curl http://localhost:4000/health/database

# Verificar collections essenciais
curl http://localhost:4000/health/collections
```
**Critérios**:
- ✅ Conexão estabelecida sem erros
- ✅ Todas as collections existem
- ✅ Índices criados corretamente
- ✅ Operações CRUD funcionam

#### **1.2 AI Service** 🔴 CRÍTICO
```bash
# Health check IA
curl http://localhost:4000/health/ai

# Teste de resposta IA
curl -X POST http://localhost:4000/test/ai-response \
  -H "Content-Type: application/json" \
  -d '{"message": "Olá, preciso de ajuda jurídica"}'
```
**Critérios**:
- ✅ Google Gemini API responde
- ✅ IA responde em português
- ✅ Function calls funcionam
- ✅ Tratamento de erros adequado

#### **1.3 File Upload System** 🔴 CRÍTICO
```bash
# Teste upload endpoint
curl -X POST http://localhost:4000/uploads \
  -F "file=@test-file.pdf" \
  -F "conversationId=test-conversation"

# Verificar GCS connection
curl http://localhost:4000/health/storage
```
**Critérios**:
- ✅ Upload funciona via drag-and-drop
- ✅ Arquivos salvos no GCS
- ✅ Validação de tipo/tamanho
- ✅ URLs assinadas geradas

#### **1.4 Authentication System** 🔴 CRÍTICO
```bash
# Teste login endpoint
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@demo.com", "password": "admin123"}'

# Verificar JWT generation
curl http://localhost:4000/auth/test-token
```
**Critérios**:
- ✅ Página de login acessível
- ✅ Login funciona com credenciais válidas
- ✅ JWT tokens gerados
- ✅ Redirecionamento correto por role

#### **1.5 WebSocket Connection** 🔴 CRÍTICO
```bash
# Teste WebSocket connection
node scripts/test-websocket-auth.js

# Verificar Socket.io health
curl http://localhost:4000/health/websocket
```
**Critérios**:
- ✅ WebSocket conecta automaticamente
- ✅ Mensagens enviadas/recebidas
- ✅ IA responde em tempo real
- ✅ Conversas persistem

#### **1.6 Landing Page Content** 🔴 CRÍTICO
```bash
# Teste conteúdo landing page
curl http://localhost:3000 | grep -E "(hero|features|testimonials)"

# Verificar SEO meta tags
curl -s http://localhost:3000 | grep -E "(title|description|keywords)"
```
**Critérios**:
- ✅ Hero section presente
- ✅ Features section completa
- ✅ Testimonials visíveis
- ✅ Meta tags otimizadas

---

### ✅ **2. QUALIDADE DE CÓDIGO**

#### **2.1 Linting & TypeScript** 🟡 ALTO
```bash
# Frontend linting
cd apps/next-app && npm run lint

# Backend linting
cd apps/websocket-service-nest && npm run lint

# TypeScript check
cd apps/next-app && npx tsc --noEmit
cd apps/websocket-service-nest && npx tsc --noEmit
```
**Critérios**:
- ✅ ESLint: 0 erros
- ✅ TypeScript: 0 erros de compilação
- ✅ Warnings: <50 (atual: 954 - reduzir drasticamente)

#### **2.2 Test Coverage** 🟡 ALTO
```bash
# Frontend tests
cd apps/next-app && npm run test:coverage

# Backend tests
cd apps/websocket-service-nest && npm run test:cov

# Suite completa
cd /Users/jeanc/idea-app && ./scripts/test-all.sh
```
**Critérios**:
- ✅ Frontend: >35% (atual: ~35%)
- ✅ Backend: >53% (atual: ~53%)
- ✅ Todos os testes passando
- ✅ Cobertura progressiva para 80%

---

### ✅ **3. PERFORMANCE & UX**

#### **3.1 Lighthouse Scores** 🟡 ALTO
```bash
# Executar Lighthouse
npx lighthouse http://localhost:3000 --output=json --output-path=./lighthouse-results.json

# Verificar scores
cat lighthouse-results.json | jq '.categories.performance.score'
cat lighthouse-results.json | jq '.categories.accessibility.score'
cat lighthouse-results.json | jq '.categories.best-practices.score'
cat lighthouse-results.json | jq '.categories.seo.score'
```
**Critérios**:
- ✅ Performance: >85
- ✅ Accessibility: >90
- ✅ Best Practices: >90
- ✅ SEO: >90

#### **3.2 Mobile Responsiveness** 🟡 ALTO
```bash
# Teste responsividade
npx playwright test tests/mobile-responsiveness.spec.ts

# Verificar breakpoints
curl http://localhost:3000 | grep -E "(sm:|md:|lg:|xl:)"
```
**Critérios**:
- ✅ Layout adapta a telas pequenas
- ✅ Menu mobile funcional
- ✅ Touch targets >44px
- ✅ Tipografia escalável

#### **3.3 Core Web Vitals** 🟡 ALTO
```bash
# Medir Core Web Vitals
npx web-vitals http://localhost:3000

# Verificar métricas
Largest Contentful Paint: <2.5s
First Input Delay: <100ms
Cumulative Layout Shift: <0.1
```
**Critérios**:
- ✅ LCP: <2.5s
- ✅ FID: <100ms
- ✅ CLS: <0.1

---

### ✅ **4. FUNCIONALIDADES CORE**

#### **4.1 Chat Flow** 🔴 CRÍTICO
```bash
# Teste fluxo completo de chat
npx playwright test tests/e2e/chat-flow.spec.ts

# Verificar persistência
curl http://localhost:4000/conversations/test-user
```
**Critérios**:
- ✅ Usuário consegue iniciar chat
- ✅ IA responde apropriadamente
- ✅ Conversa persiste no refresh
- ✅ Cadastro inteligente funciona

#### **4.2 Authentication Flow** 🔴 CRÍTICO
```bash
# Teste fluxo de autenticação
npx playwright test tests/e2e/auth-flow.spec.ts

# Verificar proteção de rotas
curl http://localhost:3000/admin # deve redirecionar
curl http://localhost:3000/lawyer # deve redirecionar
```
**Critérios**:
- ✅ Login/logout funcionam
- ✅ Roles corretos aplicados
- ✅ Rotas protegidas funcionam
- ✅ Sessões persistem

#### **4.3 File Upload Flow** 🔴 CRÍTICO
```bash
# Teste upload de arquivos
npx playwright test tests/e2e/file-upload.spec.ts

# Verificar validação
curl -X POST http://localhost:4000/uploads \
  -F "file=@invalid-file.exe" # deve falhar
```
**Critérios**:
- ✅ Drag-and-drop funciona
- ✅ Validação de arquivos
- ✅ Progress bar visível
- ✅ Download funciona

#### **4.4 Payment Flow** 🟡 ALTO
```bash
# Teste fluxo de pagamento
npx playwright test tests/e2e/payment-flow.spec.ts

# Verificar integração Pagar.me
curl http://localhost:4000/health/payments
```
**Critérios**:
- ✅ Checkout funciona
- ✅ Pagamento processado
- ✅ Split automático
- ✅ Confirmações enviadas

---

### ✅ **5. SEGURANÇA**

#### **5.1 LGPD Compliance** 🟡 ALTO
```bash
# Verificar criptografia
curl http://localhost:4000/health/security

# Teste auditoria
curl http://localhost:4000/audit/logs
```
**Critérios**:
- ✅ Dados pessoais criptografados
- ✅ Logs de auditoria ativos
- ✅ Consentimento explícito
- ✅ Anonimato opcional

#### **5.2 Authentication Security** 🟡 ALTO
```bash
# Teste segurança JWT
node scripts/test-csrf-validation.js

# Verificar rate limiting
curl http://localhost:4000/auth/rate-limit-test
```
**Critérios**:
- ✅ JWT seguro e válido
- ✅ Rate limiting ativo
- ✅ CSRF protection
- ✅ Password hashing

---

### ✅ **6. INFRAESTRUTURA DE PRODUÇÃO**

#### **6.1 Docker & Deployment** 🟡 ALTO
```bash
# Build completo
docker-compose build

# Teste deployment
docker-compose up -d
docker-compose ps

# Health checks
curl http://localhost:8080/health
```
**Critérios**:
- ✅ Docker build sem erros
- ✅ Serviços sobem corretamente
- ✅ Nginx proxy funciona
- ✅ Health checks = OK

#### **6.2 Environment Configuration** 🟡 ALTO
```bash
# Verificar variáveis de ambiente
node scripts/test-init.js

# Teste configurações
curl http://localhost:4000/config/test
```
**Critérios**:
- ✅ Todas as env vars configuradas
- ✅ Secrets não hardcoded
- ✅ Configuração por ambiente
- ✅ Fallbacks adequados

---

## 📊 **DASHBOARD DE STATUS**

### **Status Atual (28/09/2025)**
```
🔴 CRÍTICO (6 issues): ❌ FALHANDO
🟡 ALTO (4 items): ⚠️ PARCIAL
🟢 MÉDIO (6 items): ⏳ PENDENTE
```

### **Cronograma de Resolução**
- **Semana 1 (29/09 - 05/10)**: Resolver CRÍTICO + ALTO
- **Semana 2 (06/10 - 12/10)**: Resolver MÉDIO + testes finais
- **Dia do Lançamento (12/10)**: Go-live controlado

---

## 🎯 **CRITÉRIOS DE LANÇAMENTO**

### **🚫 BLOQUEADORES (Must Fix)**
- ❌ Issues #45-50 não resolvidas
- ❌ Testes críticos falhando
- ❌ Segurança comprometida
- ❌ Performance <80 Lighthouse

### **⚠️ RECOMMENDAÇÕES (Should Fix)**
- ⚠️ Linting com >100 warnings
- ⚠️ Test coverage <70%
- ⚠️ Features não críticas pendentes

### **✅ PRONTO PARA LANÇAMENTO**
- ✅ Todos os bloqueadores resolvidos
- ✅ Testes obrigatórios passando
- ✅ Plano de rollback definido
- ✅ Monitoramento ativo

---

## 📞 **CONTATO E ESCALAÇÃO**

### **Responsáveis por Área**
- **Infraestrutura**: @devops-lead
- **Backend**: @backend-lead
- **Frontend**: @frontend-lead
- **QA**: @qa-lead
- **Segurança**: @security-lead

### **Escalação de Riscos**
- **Risco Alto**: Issues críticas não resolvidas até D-7
- **Risco Médio**: Performance <85 Lighthouse
- **Risco Baixo**: Features não-essenciais pendentes

---

**📅 Próxima Revisão: 30 de setembro de 2025**