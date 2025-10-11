# 🚀 Guia de Desenvolvimento - Juristec Platform

## 📋 Visão Geral

Bem-vindo ao desenvolvimento da Juristec Platform! Este guia irá ajudá-lo a configurar o ambiente de desenvolvimento e começar a contribuir.

## 🛠️ Pré-requisitos

### Sistema Operacional
- **macOS**: 12.0+ (recomendado)
- **Linux**: Ubuntu 20.04+ ou CentOS 8+
- **Windows**: WSL2 com Ubuntu (recomendado)

### Dependências Essenciais
```bash
# Node.js (versão recomendada)
Node.js: 22.20.0+ LTS
npm: 10.9.3+

# Docker Desktop
Docker: 24.0+
Docker Compose: 2.20+

# Git
Git: 2.30+
```

### Verificação das Dependências
```bash
# Verificar versões
node --version    # Deve ser 22.20.0+
npm --version     # Deve ser 10.9.3+
docker --version  # Deve ser 24.0+
git --version     # Deve ser 2.30+
```

## 🚀 Instalação e Setup

### 1. Clonagem do Repositório
```bash
git clone https://github.com/Auri731/juristec.git
cd juristec
```

### 2. Instalação de Dependências
```bash
# Instalar dependências do monorepo
npm install

# Instalar dependências do frontend
cd apps/next-app
npm install
cd ..

# Instalar dependências do backend
cd apps/websocket-service-nest
npm install
cd ..
```

### 3. Configuração do Ambiente
```bash
# Copiar arquivos de ambiente
cp apps/next-app/.env.example apps/next-app/.env.local
cp apps/websocket-service-nest/.env.example apps/websocket-service-nest/.env

# Editar variáveis de ambiente (ver seção abaixo)
```

### 4. Configuração das Chaves de API

#### Google Gemini AI
```bash
# Obter chave da API no Google AI Studio
# https://makersuite.google.com/app/apikey

# Adicionar ao .env do backend
GOOGLE_API_KEY=sua-chave-aqui
```

#### MongoDB Atlas
```bash
# Criar cluster no MongoDB Atlas
# https://cloud.mongodb.com

# Adicionar ao .env do backend
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/juristec_dev
```

#### Google Cloud Storage (opcional para desenvolvimento)
```bash
# Criar projeto no Google Cloud
# https://console.cloud.google.com

# Adicionar ao .env do backend
GCS_PROJECT_ID=seu-projeto
GCS_BUCKET_NAME=juristec-dev-files
GCS_KEY_FILE=/caminho/para/service-account.json
```

#### Pagar.me (opcional para desenvolvimento)
```bash
# Criar conta no Pagar.me
# https://pagarme.com.br

# Adicionar ao .env do frontend
NEXT_PUBLIC_PAGARME_PUBLIC_KEY=sua-chave-publica
PAGARME_API_KEY=sua-chave-secreta
```

## 🏃‍♂️ Executando o Projeto

### Ambiente de Desenvolvimento Completo (Recomendado)
```bash
# Iniciar todos os serviços
docker-compose up --build -d

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f
```

**Acesso aos serviços:**
- **Aplicação**: http://localhost:8080
- **Frontend direto**: http://localhost:3000
- **Backend direto**: http://localhost:4000
- **MongoDB**: localhost:27017

### Desenvolvimento Local (Alternativo)
```bash
# Terminal 1: Frontend
cd apps/next-app
npm run dev

# Terminal 2: Backend
cd apps/websocket-service-nest
npm run start:dev

# Terminal 3: MongoDB (via Docker)
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

## 🧪 Executando Testes

### Todos os Testes
```bash
# Testes do frontend
cd apps/next-app
npm test

# Testes do backend
cd apps/websocket-service-nest
npm test

# Testes E2E (Playwright)
cd apps/next-app
npm run test:e2e
```

### Testes Específicos
```bash
# Testes de componente específico
npm test -- --testNamePattern="Chat"

# Testes de API
npm test -- --testNamePattern="API"

# Testes de integração
npm test -- --testNamePattern="integration"
```

### Cobertura de Testes
```bash
# Com relatório de cobertura
npm run test:coverage

# Frontend: 35% cobertura (meta: 80%)
# Backend: 53% cobertura (meta: 80%)
```

## 🏗️ Estrutura do Projeto

```
juristec/
├── apps/
│   ├── next-app/                 # Frontend Next.js
│   │   ├── src/
│   │   │   ├── app/             # App Router
│   │   │   ├── components/      # Componentes React
│   │   │   ├── hooks/           # Hooks customizados
│   │   │   ├── lib/             # Utilitários
│   │   │   └── types/           # TypeScript types
│   │   └── tests/               # Testes frontend
│   └── websocket-service-nest/   # Backend NestJS
│       ├── src/
│       │   ├── chat/           # WebSocket gateway
│       │   ├── lib/            # Serviços core
│       │   ├── uploads/        # Upload de arquivos
│       │   └── models/         # Schemas MongoDB
│       └── test/               # Testes backend
├── docs/                        # Documentação
├── nginx/                       # Configuração proxy
├── docker-compose.yml           # Ambiente desenvolvimento
└── package.json                # Scripts monorepo
```

## 🔄 Fluxo de Desenvolvimento

### 1. Criar Branch
```bash
# Padrão de nomenclatura
git checkout -b feature/issue-123-descricao-curta
# ou
git checkout -b bugfix/issue-123-correcao-bug
```

### 2. Desenvolvimento
```bash
# Instalar dependências se necessário
npm install

# Executar testes
npm test

# Verificar linting
npm run lint

# Build de produção
npm run build
```

### 3. Commits
```bash
# Padrão conventional commits
git commit -m "feat: adicionar funcionalidade X"
git commit -m "fix: corrigir bug Y"
git commit -m "docs: atualizar documentação Z"
```

### 4. Pull Request
```bash
# Push da branch
git push origin feature/issue-123-descricao-curta

# Criar PR no GitHub
# Aguardar review automático do GitHub Copilot
# Implementar feedback se necessário
```

## 🔧 Scripts Úteis

### Desenvolvimento
```bash
# Limpar containers e volumes
docker-compose down -v

# Reconstruir imagens
docker-compose build --no-cache

# Ver logs específicos
docker-compose logs backend
docker-compose logs frontend
```

### Debug
```bash
# Logs detalhados
docker-compose logs -f --tail=100

# Entrar no container
docker-compose exec backend sh
docker-compose exec frontend sh

# Verificar portas
netstat -tlnp | grep :[348]000
```

### Manutenção
```bash
# Limpar cache npm
npm cache clean --force

# Remover node_modules
rm -rf node_modules apps/*/node_modules

# Reinstalar dependências
npm install
```

## 🚨 Solução de Problemas Comuns

### WebSocket não conecta
```bash
# Verificar se backend está rodando
docker-compose ps

# Verificar logs do WebSocket
docker-compose logs backend | grep -i socket

# Testar conexão direta
wscat -c ws://localhost:4000
```

### IA não responde
```bash
# Verificar chave da API
cd apps/websocket-service-nest
echo $GOOGLE_API_KEY

# Testar conectividade
curl -H "x-goog-api-key: $GOOGLE_API_KEY" \
  https://generativelanguage.googleapis.com/v1/models
```

### Build falha
```bash
# Limpar cache e rebuild
npm run clean
npm install
npm run build

# Verificar versões
node --version
npm --version
```

### Testes falham
```bash
# Executar testes específicos
npm test -- --testNamePattern="failing-test"

# Debug mode
npm test -- --verbose

# Verificar cobertura
npm run test:coverage
```

## 📚 Documentação Adicional

- **[Arquitetura](./architecture.md)** - Arquitetura técnica detalhada
- **[APIs](./api-reference.md)** - Documentação das APIs
- **[Deployment](./deployment.md)** - Guia de produção
- **[Troubleshooting](./troubleshooting.md)** - Problemas comuns

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Padrões de Código
- **ESLint**: Zero warnings permitidos
- **TypeScript**: Strict mode obrigatório
- **Prettier**: Formatação automática
- **Testes**: Obrigatórios para novas funcionalidades

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/Auri731/juristec/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Auri731/juristec/discussions)
- **Email**: suporte@juristec.com

---

**Última atualização**: Outubro 2025