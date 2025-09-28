# 🧪 Testes E2E Realistas - Plataforma Juristec

Este documento descreve como executar testes end-to-end (E2E) realistas que simulam usuários reais interagindo com a aplicação completa.

## 🎯 Objetivo

Os testes E2E realistas validam fluxos completos do usuário usando:

- ✅ **Aplicação completa** rodando em containers Docker
- ✅ **MongoDB local** isolado para testes
- ✅ **Credenciais reais** do ambiente de desenvolvimento (GCS, Gemini API)
- ✅ **WebSocket real-time** para chat
- ✅ **Upload de arquivos** para Google Cloud Storage
- ✅ **Autenticação completa** com NextAuth.js

## 📋 Pré-requisitos

1. **Docker e Docker Compose** instalados e rodando
2. **Arquivo .env** com credenciais reais:

   ```bash
   # Credenciais obrigatórias para testes
   GOOGLE_API_KEY=your_real_key
   GCS_PROJECT_ID=your_project
   GCS_PRIVATE_KEY=your_key
   GCS_CLIENT_EMAIL=your_email
   GCS_BUCKET_NAME=your_bucket
   NEXTAUTH_SECRET=your_secret
   JWT_SECRET=your_jwt_secret
   ```

## 🚀 Como Executar

### Comando Principal

```bash
# Executar todos os testes E2E realistas
./scripts/run-realistic-e2e-tests.sh
```

### O que o script faz:

1. ✅ **Verifica** se Docker está rodando
2. ✅ **Valida** arquivo .env com credenciais
3. ✅ **Sobe** ambiente Docker isolado (`docker-compose.test.yml`)
4. ✅ **Aguarda** serviços ficarem saudáveis
5. ✅ **Executa** testes E2E com Playwright
6. ✅ **Executa** testes de API (bash scripts)
7. ✅ **Executa** testes de performance
8. ✅ **Limpa** ambiente de teste ao final

## 🧪 Cenários de Teste

### 1. Fluxo Completo do Usuário Anônimo

- ✅ Landing page → Chat → Cadastro inteligente → Upload de arquivo
- ✅ IA coleta dados naturalmente durante conversa
- ✅ Upload para Google Cloud Storage real
- ✅ WebSocket mantendo conversa ativa

### 2. Autenticação e Dashboards

- ✅ Login admin (`admin@demo.com` / `admin123`)
- ✅ Login advogado (`lawyer@demo.com` / `lawyer123`)
- ✅ Acesso aos respectivos dashboards
- ✅ Validação de permissões

### 3. Responsividade Mobile

- ✅ Interface adaptada para dispositivos móveis
- ✅ Navegação touch-friendly
- ✅ Menu mobile funcional

### 4. Performance e Acessibilidade

- ✅ Tempo de carregamento < 5 segundos
- ✅ Imagens com alt text
- ✅ Navegação por teclado
- ✅ WCAG 2.1 AA compliance

### 5. Tratamento de Erros

- ✅ Páginas 404 tratadas
- ✅ Mensagens de erro amigáveis
- ✅ Funcionalidades degradadas graceful

## 🏗️ Arquitetura de Teste

```
┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │    │   Playwright    │
│   (localhost:   │    │   Tests E2E     │
│       8080)     │    │                 │
└─────────┬───────┘    └─────────────────┘
          │
    ┌─────▼─────────────────────────────┐
    │         Aplicação Completa        │
    │                                   │
    │  ┌─────────────┐ ┌─────────────┐  │
    │  │  Next.js    │ │ NestJS      │  │
    │  │ Frontend    │ │ WebSocket   │  │
    │  │ (3000)      │ │ Service     │  │
    │  └─────────────┘ │ (4000)      │  │
    │                  └─────────────┘  │
    └───────────────────────────────────┘
          │
    ┌─────▼─────────────────────────────┐
    │         Infraestrutura            │
    │                                   │
    │  ┌─────────────┐ ┌─────────────┐  │
    │  │  MongoDB    │ │    Redis    │  │
    │  │ Test DB     │ │   Cache     │  │
    │  │ (27017)     │ │  (6379)     │  │
    │  └─────────────┘ └─────────────┘  │
    └───────────────────────────────────┘
```

## 📁 Estrutura dos Arquivos

```
apps/next-app/
├── tests/e2e/
│   ├── realistic-user-flow.spec.ts    # Testes principais E2E
│   ├── global-setup.ts               # Setup antes dos testes
│   └── global-teardown.ts            # Cleanup após testes
├── playwright.e2e.config.ts           # Config Playwright E2E
└── ...

scripts/
├── run-realistic-e2e-tests.sh         # Script principal
├── test-db-init.js                   # Seed do banco de teste
└── ...

docker-compose.test.yml                # Ambiente isolado
test-files/                           # Arquivos para upload
└── contrato-trabalho.txt
```

## 🔧 Configuração Detalhada

### Docker Compose de Teste
- **MongoDB**: Banco isolado com seed de dados de teste
- **Redis**: Cache para sessões e dados temporários
- **Nginx**: Proxy reverso simulando produção
- **Volumes**: Isolamento completo de dados

### Dados de Teste
```javascript
// Usuários criados automaticamente:
- admin@demo.com / admin123 (super_admin)
- lawyer@demo.com / lawyer123 (lawyer)
- client@demo.com / client123 (client)

// Conversas de exemplo
// Configurações de IA
```

### Credenciais Reais Utilizadas
- ✅ **Google Gemini API**: Para respostas de IA realistas
- ✅ **Google Cloud Storage**: Para upload de arquivos reais
- ✅ **MongoDB Atlas** (dev): Para dados persistentes
- ❌ **Pagar.me**: Ainda não implementado (sem API de teste)

## 📊 Relatórios de Teste

### Localização dos Relatórios
```
apps/next-app/
├── test-results/
│   ├── e2e-results.json    # Resultados JSON
│   ├── e2e-results.xml     # Resultados JUnit
│   └── index.html          # Relatório HTML interativo
├── playwright-report/      # Relatório detalhado Playwright
└── ...
```

### Métricas Coletadas
- ✅ **Tempo de execução** de cada teste
- ✅ **Screenshots** em caso de falha
- ✅ **Videos** de testes que falharam
- ✅ **Traces** para debugging detalhado
- ✅ **Cobertura** de código (se configurado)

## 🐛 Debugging e Troubleshooting

### Verificar Ambiente
```bash
# Status dos containers
docker-compose -f docker-compose.test.yml ps

# Logs dos serviços
docker-compose -f docker-compose.test.yml logs -f [service]

# Acessar container
docker-compose -f docker-compose.test.yml exec [service] sh
```

### Problemas Comuns

#### 1. Credenciais Faltando
```
❌ ERRO: GOOGLE_API_KEY não definida
✅ SOLUÇÃO: Verificar arquivo .env
```

#### 2. Serviços Não Saudáveis
```
❌ ERRO: MongoDB não responde
✅ SOLUÇÃO: Aguardar healthcheck ou verificar logs
```

#### 3. Testes Lentos
```
❌ PROBLEMA: Testes demorando muito
✅ SOLUÇÃO: Aumentar timeouts ou verificar conectividade
```

## 🔄 Integração com CI/CD

### GitHub Actions (Futuro)
```yaml
- name: Run E2E Tests
  run: ./scripts/run-realistic-e2e-tests.sh
  env:
    GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
    GCS_PROJECT_ID: ${{ secrets.GCS_PROJECT_ID }}
    # ... outras credenciais
```

### Pipeline Completo
1. ✅ **Build** das imagens Docker
2. ✅ **Deploy** do ambiente de teste
3. ✅ **Execução** dos testes E2E
4. ✅ **Relatórios** de cobertura
5. ✅ **Cleanup** do ambiente

## 🎯 Benefícios desta Abordagem

### Realismo
- ✅ **Usuários reais** navegando na aplicação
- ✅ **APIs reais** sendo chamadas
- ✅ **Banco de dados real** com dados persistentes
- ✅ **Armazenamento real** (GCS) para uploads

### Confiabilidade
- ✅ **Isolamento completo** entre testes
- ✅ **Dados controlados** via seed script
- ✅ **Ambiente consistente** via Docker
- ✅ **Credenciais reais** para validação completa

### Manutenibilidade
- ✅ **Código limpo** e bem documentado
- ✅ **Relatórios detalhados** para debugging
- ✅ **Configuração centralizada** via Docker Compose
- ✅ **Reutilização** de componentes de teste

---

## 🚀 Próximos Passos

1. **Executar os testes** pela primeira vez
2. **Ajustar timeouts** conforme necessário
3. **Adicionar mais cenários** de teste
4. **Implementar Pagar.me** quando disponível
5. **Integrar com CI/CD** para automação completa

---

**📝 Nota**: Estes testes usam credenciais reais e consomem recursos da Google Cloud. Monitore o uso para evitar custos excessivos.