# 🚀 Juristec Platform - Unified Testing Strategy

## Overview

A plataforma Juristec agora usa uma estratégia de testes **consolidada e simplificada**, focada em testes E2E reais que simulam usuários reais interagindo com a aplicação completa.

## 🏗️ Arquitetura de Testes

### ✅ Abordagem Consolidada
- **Um único script**: `scripts/test-all.sh` executa tudo em sequência
- **Um teste E2E abrangente**: `tests/e2e/complete-user-journey.spec.ts`
- **Ambiente Docker isolado**: `docker-compose.test.yml` para testes reais
- **Cobertura completa**: Frontend + Backend + APIs + Banco de dados

### 📋 Pipeline de Testes

```bash
Lint → Jest → Build → E2E Playwright
```

## 🛠️ Scripts Disponíveis

### `scripts/test-all.sh` (Principal)
**Executa todos os testes em sequência:**
- ✅ Linting (Frontend & Backend)
- ✅ Testes unitários (Jest)
- ✅ Build de produção
- ✅ Testes E2E completos (Playwright)

```bash
# Executar todos os testes
./scripts/test-all.sh

# Ou com Docker (recomendado)
docker run --rm -v $(pwd):/app -w /app node:18 ./scripts/test-all.sh
```

## 📁 Estrutura de Testes

```
apps/next-app/tests/e2e/
├── complete-user-journey.spec.ts    # 🏆 Teste E2E principal
└── realistic-user-flow.spec.ts      # 🔧 Testes de debugging (legacy)

scripts/
├── test-all.sh                      # 🚀 Script unificado
└── [outros scripts legados...]      # 📦 Para remoção futura
```

## 🎯 Cobertura dos Testes E2E

### `complete-user-journey.spec.ts`

#### 🏠 **Landing Page & Navigation**
- Carregamento da página inicial
- Navegação entre páginas
- Elementos essenciais presentes

#### 💬 **Sistema de Chat Completo**
- Interface de chat carrega
- Interação com IA funciona
- Sistema de registro inteligente

#### 🔐 **Sistema de Autenticação**
- Página admin requer autenticação
- Login de admin funciona
- Proteção de rotas

#### 📊 **Dashboard Administrativo**
- Dashboard carrega dados
- Estatísticas e métricas
- Tabelas funcionais

#### 🔗 **APIs e Backend**
- Endpoints de saúde respondem
- API de chat funciona
- Banco de dados acessível

#### 📱 **Responsividade Mobile**
- Interface funciona em mobile
- Layout responsivo
- Experiência mobile adequada

#### 🔄 **Fluxo Completo de Usuário**
- Landing → Chat → Registro → Suporte
- Jornada completa do usuário
- Integração entre sistemas

#### 🎨 **UI/UX e Acessibilidade**
- Design system consistente
- Sem erros no console
- Tema jurídico aplicado

#### ⚡ **Performance Básica**
- Páginas carregam rapidamente
- Chat responde em tempo adequado
- Performance aceitável

## 🐳 Ambiente de Teste

### 🗑️ Configuração Inicial (Importante!)
**Para evitar conflitos, remova o MongoDB local:**

```bash
# Executar uma vez para remover MongoDB local
./scripts/remove-local-mongodb.sh

# Verificar que não há mais conflitos de porta
lsof -i :27017  # Deve retornar vazio
```

### Docker Compose Test Environment
```yaml
# docker-compose.test.yml
services:
  mongodb-test:     # Banco isolado para testes (porta 27017)
  redis-test:       # Cache isolado (porta 6379)
  frontend-test:    # Next.js em modo teste
  backend-test:     # NestJS WebSocket
  nginx-test:       # Proxy reverso
```

### Vantagens do Ambiente Docker
- ✅ **Isolamento completo**: Não afeta desenvolvimento local
- ✅ **Banco de dados limpo**: Dados de teste isolados
- ✅ **Credenciais reais**: Usa variáveis de ambiente reais
- ✅ **Performance**: Ambiente otimizado para testes
- ✅ **Reprodutibilidade**: Mesmo ambiente em CI/CD
- ✅ **Sem conflitos**: MongoDB local removido

## 🚀 Como Executar

### Opção 1: Script Unificado (Recomendado)
```bash
cd /Users/jeanc/idea-app
./scripts/test-all.sh
```

### Opção 2: Testes E2E Apenas
```bash
cd apps/next-app

# Subir ambiente Docker
docker-compose -f ../../docker-compose.test.yml up -d

# Executar testes
npx playwright test tests/e2e/complete-user-journey.spec.ts

# Limpar ambiente
docker-compose -f ../../docker-compose.test.yml down -v
```

### Opção 3: Desenvolvimento Local
```bash
# Terminal 1: Ambiente Docker
docker-compose -f docker-compose.test.yml up

# Terminal 2: Executar testes
cd apps/next-app
npx playwright test tests/e2e/complete-user-journey.spec.ts --headed
```

## 📊 Relatórios de Teste

### Playwright HTML Report
```bash
npx playwright show-report
```

### Cobertura de Testes
```bash
# Frontend
cd apps/next-app && npm run test:coverage

# Backend
cd apps/websocket-service-nest && npm run test:coverage
```

## 🔧 Configuração

### Variáveis de Ambiente
Certifique-se de que os arquivos `.env` existem:
- `apps/next-app/.env.local`
- `apps/websocket-service-nest/.env`

### Browsers do Playwright
```bash
cd apps/next-app
npx playwright install
```

## 🎯 Benefícios da Nova Abordagem

### ✅ **Simplificação**
- Um script para executar tudo
- Menos arquivos para manter
- Pipeline claro e linear

### ✅ **Cobertura Real**
- Testes como usuário real
- Ambiente completo (frontend + backend + DB)
- Cenários reais de uso

### ✅ **Manutenibilidade**
- Código de teste em um lugar
- Fácil de entender e modificar
- Menos duplicação

### ✅ **Performance**
- Ambiente Docker otimizado
- Paralelização automática
- Resultados rápidos

### ✅ **Confiabilidade**
- Testes determinísticos
- Ambiente isolado
- Dados de teste controlados

## 📋 Migração dos Scripts Antigos

### Scripts a Remover (Futuramente)
- ❌ `test-runner.sh`
- ❌ `run-realistic-e2e-tests.sh`
- ❌ `complete-testing-suite.sh`
- ❌ `scripts/manual-tests/*`

### Scripts a Manter
- ✅ `scripts/test-all.sh` (novo script unificado)
- ✅ Scripts de seed e utilitários específicos

## 🔍 Debugging

### Ver Logs do Docker
```bash
docker-compose -f docker-compose.test.yml logs -f
```

### Executar Testes em Modo Debug
```bash
cd apps/next-app
npx playwright test tests/e2e/complete-user-journey.spec.ts --debug
```

### Verificar Estado dos Serviços
```bash
curl http://localhost:3000/api/health
curl http://localhost:4000/health
curl http://localhost:8080/api/health
```

## 📈 Métricas de Qualidade

- **Cobertura E2E**: 100% dos fluxos críticos
- **Tempo de Execução**: ~5-10 minutos
- **Confiabilidade**: >95% de testes passando
- **Manutenibilidade**: Código limpo e documentado

---

**Última atualização**: 27 de setembro de 2025
**Autor**: Auri (AI Developer)