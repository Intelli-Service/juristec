# Deployment - Juristec Platform

## 🚀 Estratégias de Deployment

### Ambientes

#### Desenvolvimento
- **Docker Compose** para desenvolvimento local
- **Hot reload** automático
- **Debugging** habilitado
- **Banco local** com dados de teste

#### Staging
- **Infraestrutura idêntica** à produção
- **CI/CD automático** a cada push
- **Testes E2E** obrigatórios
- **Monitoramento básico**

#### Produção
- **Escalabilidade horizontal**
- **Backup automático**
- **Monitoramento avançado**
- **Security hardening**

## 🏗️ Infraestrutura de Produção

### Opções de Hosting

#### Opção 1: Railway (Recomendado para MVP)
```yaml
# railway.toml
[build]
builder = "dockerfile"

[deploy]
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
```

**Vantagens:**
- Deploy automático via Git
- Escalabilidade automática
- PostgreSQL e Redis incluídos
- Preços acessíveis para MVP

#### Opção 2: VPS (DigitalOcean, Linode, etc.)
```bash
# Setup básico
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl enable docker

# Configurar nginx
sudo apt install nginx
sudo certbot --nginx -d app.juristec.com
```

#### Opção 3: Kubernetes (Para scale)
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: juristec-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: juristec-backend
  template:
    spec:
      containers:
      - name: backend
        image: juristec/backend:latest
        env:
        - name: NODE_ENV
          value: "production"
```

### Banco de Dados

#### MongoDB Atlas (Recomendado)
```javascript
// Configuração de produção
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, {
  ssl: true,
  sslValidate: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

**Configurações importantes:**
- **Replica Set** para alta disponibilidade
- **Backup automático** diário
- **Encryption at rest**
- **IP whitelisting**

### Armazenamento de Arquivos

#### Google Cloud Storage
```typescript
// Configuração GCS
import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  keyFilename: process.env.GCS_KEY_FILE,
  projectId: process.env.GCS_PROJECT_ID,
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
```

**Bucket configuration:**
```json
{
  "versioning": {
    "enabled": true
  },
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 365,
          "isLive": true
        }
      }
    ]
  }
}
```

## 🔧 Configuração de Produção

### Variáveis de Ambiente

#### Backend (.env.production)
```env
# Ambiente
NODE_ENV=production
PORT=4000

# Banco de dados
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/juristec_prod?retryWrites=true&w=majority

# Autenticação
JWT_SECRET=your-super-secure-jwt-secret-here
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=https://app.juristec.com

# Google Gemini AI
GOOGLE_API_KEY=your-gemini-api-key

# Google Cloud Storage
GCS_PROJECT_ID=your-gcp-project
GCS_BUCKET_NAME=juristec-prod-files
GCS_KEY_FILE=/path/to/service-account.json

# Pagar.me
PAGARME_API_KEY=your-pagarme-api-key
PAGARME_ENCRYPTION_KEY=your-encryption-key

# Redis (opcional)
REDIS_URL=redis://your-redis-instance:6379

# Logging
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log

# Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### Frontend (.env.production)
```env
# Next.js
NEXT_PUBLIC_APP_URL=https://app.juristec.com
NEXTAUTH_URL=https://app.juristec.com
NEXTAUTH_SECRET=your-nextauth-secret-here

# WebSocket
NEXT_PUBLIC_WS_URL=wss://app.juristec.com

# Analytics (opcional)
NEXT_PUBLIC_GA_ID=GA-XXXXXXXXXX
```

### Nginx Configuration

#### nginx.conf (Produção)
```nginx
upstream backend {
    server backend-1:4000;
    server backend-2:4000;
    server backend-3:4000;
}

server {
    listen 80;
    server_name app.juristec.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.juristec.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/app.juristec.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.juristec.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Frontend (Next.js)
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Rate limiting
        limit_req zone=api burst=10 nodelay;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket specific
        proxy_buffering off;
        proxy_cache off;
    }

    # Static files
    location /_next/static/ {
        proxy_pass http://frontend:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

## 🚀 Processo de Deployment

### Pré-deployment Checklist

#### Código
- [ ] Todos os testes passando
- [ ] Linting sem erros
- [ ] Build de produção funciona
- [ ] Variáveis de ambiente configuradas
- [ ] Secrets não hardcoded

#### Infraestrutura
- [ ] Domínio configurado
- [ ] SSL certificate válido
- [ ] Banco de dados acessível
- [ ] GCS bucket criado
- [ ] Pagar.me configurado

#### Segurança
- [ ] Secrets rotacionados
- [ ] Firewall configurado
- [ ] Rate limiting ativo
- [ ] Backup funcionando

### Deployment Steps

#### 1. Build das Imagens
```bash
# Build frontend
cd apps/next-app
npm run build
docker build -t juristec/frontend:latest .

# Build backend
cd apps/websocket-service-nest
npm run build
docker build -t juristec/backend:latest .
```

#### 2. Push para Registry
```bash
# Docker Hub
docker push juristec/frontend:latest
docker push juristec/backend:latest

# Google Container Registry
gcloud builds submit --tag gcr.io/$PROJECT_ID/juristec-backend
```

#### 3. Deploy da Aplicação
```bash
# Railway
railway up

# Kubernetes
kubectl apply -f k8s/

# Docker Compose (VPS)
docker-compose -f docker-compose.prod.yml up -d
```

#### 4. Verificações Pós-deployment
```bash
# Health check
curl https://app.juristec.com/health

# API check
curl https://app.juristec.com/api/admin/ai-config

# WebSocket check
wscat -c wss://app.juristec.com
```

## 📊 Monitoramento e Observabilidade

### Métricas Essenciais

#### Aplicação
- Response time das APIs
- Taxa de erro por endpoint
- Uso de CPU/Memória
- Conexões WebSocket ativas

#### Negócio
- Conversas por dia
- Taxa de conversão
- Receita mensal
- Satisfação do usuário

### Ferramentas de Monitoramento

#### Application Monitoring
```typescript
// Winston + Morgan para logging
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

#### Infrastructure Monitoring
```yaml
# Prometheus metrics
scrape_configs:
  - job_name: 'juristec-backend'
    static_configs:
      - targets: ['backend:4000']
    metrics_path: '/metrics'
```

#### Error Tracking
```typescript
// Sentry configuration
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

## 🔧 Manutenção e Backup

### Backup Strategy

#### Banco de Dados
```bash
# MongoDB Atlas (automático)
# Ou script manual:
mongodump --db juristec_prod --out /backup/$(date +%Y%m%d)

# Upload para GCS
gsutil cp -r /backup gs://juristec-backups/
```

#### Arquivos
```bash
# GCS já tem versioning
# Backup adicional se necessário
gsutil cp -r gs://juristec-prod-files gs://juristec-backups/files/$(date +%Y%m%d)
```

### Rotinas de Manutenção

#### Diária
- [ ] Verificar logs de erro
- [ ] Monitorar uso de recursos
- [ ] Backup automático

#### Semanal
- [ ] Atualizar dependências
- [ ] Verificar segurança
- [ ] Otimizar queries

#### Mensal
- [ ] Revisar configurações
- [ ] Análise de performance
- [ ] Planejamento de melhorias

## 🚨 Rollback Plan

### Quick Rollback
```bash
# Docker
docker tag juristec/backend:v1 juristec/backend:latest
docker push juristec/backend:latest

# Kubernetes
kubectl rollout undo deployment/juristec-backend

# Railway
railway rollback
```

### Database Rollback
```bash
# Restaurar backup
mongorestore --db juristec_prod /backup/20231201/juristec_prod
```

## 📈 Escalabilidade

### Horizontal Scaling
```yaml
# Kubernetes HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: juristec-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: juristec-backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Database Scaling
- **Connection pooling** para múltiplas instâncias
- **Read replicas** para queries de leitura
- **Sharding** para datasets muito grandes

### CDN para Assets
```nginx
# Cloudflare configuration
location /static/ {
    proxy_pass https://cdn.juristec.com;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

**Última atualização**: Outubro 2025