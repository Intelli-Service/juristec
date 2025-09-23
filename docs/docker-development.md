# Guia de Desenvolvimento com Docker Compose

Este guia mostra como usar o ambiente de desenvolvimento dockerizado, especialmente útil para agents do Copilot.

## Comandos Essenciais

### Iniciar o ambiente completo
```bash
# Inicia todos os serviços em background
docker-compose up -d

# Inicia com rebuild das imagens
docker-compose up --build -d
```

### Monitorar logs em tempo real
```bash
# Todos os serviços
docker-compose logs -f

# Serviço específico
docker-compose logs -f frontend
docker-compose logs -f backend  
docker-compose logs -f nginx
```

### Verificar status dos serviços
```bash
# Status dos containers
docker-compose ps

# Recursos utilizados
docker-compose top
```

### Parar e limpar ambiente
```bash
# Parar serviços
docker-compose stop

# Parar e remover containers
docker-compose down

# Limpar tudo (containers, volumes, imagens)
docker-compose down -v --rmi all
```

## URLs de Acesso

- **Frontend**: http://localhost:8080
- **Admin**: http://localhost:8080/admin
- **Lawyer**: http://localhost:8080/lawyer  
- **Login**: http://localhost:8080/auth/signin
- **API Health**: http://localhost:8080/health

## Debug e Troubleshooting

### Executar comandos dentro dos containers
```bash
# Shell no frontend
docker-compose exec frontend sh

# Shell no backend
docker-compose exec backend sh

# Ver arquivos do nginx
docker-compose exec nginx cat /etc/nginx/conf.d/default.conf
```

### Verificar conectividade
```bash
# Testar roteamento do nginx
curl http://localhost:8080/health
curl http://localhost:8080/api/auth/session  # NextAuth
curl http://localhost:8080/api/admin/users   # Backend (401 expected)
```

### Logs específicos
```bash
# Logs do nginx (acesso e erro)
docker-compose exec nginx tail -f /var/log/nginx/access.log
docker-compose exec nginx tail -f /var/log/nginx/error.log

# Aplicar mudanças no nginx sem rebuild
docker-compose restart nginx
```

### Rebuild específico
```bash
# Rebuildar só o frontend
docker-compose up -d --build frontend

# Rebuildar só o backend
docker-compose up -d --build backend
```

## Vantagens para Agents do Copilot

1. **Background execution**: Serviços rodando sem travar terminals
2. **Centralized logging**: `docker-compose logs` para ver tudo
3. **Production-like**: Simula ambiente real com nginx
4. **Hot reload**: Mudanças no código refletem automaticamente
5. **Easy cleanup**: `docker-compose down` limpa tudo
6. **Consistent environment**: Mesma configuração para todos

## Estrutura de Arquivos

```
/Users/jeanc/idea-app/
├── docker-compose.yml          # Configuração dos serviços
├── nginx/
│   ├── nginx.conf             # Configuração principal do nginx
│   └── default.conf           # Roteamento e proxy
├── apps/
│   ├── next-app/              # Frontend Next.js
│   └── websocket-service-nest/ # Backend NestJS
└── README-DOCKER.md           # Documentação detalhada
```

## Roteamento nginx

- `/` → Frontend Next.js
- `/api/auth/*` → NextAuth (Frontend)
- `/api/(admin|lawyer|chat)/*` → Backend NestJS
- `/socket.io/*` → WebSocket Backend

## Variáveis de Ambiente

Certifique-se de que os arquivos `.env.local` e `.env` existem:

```bash
# Frontend (.env.local)
NEXTAUTH_URL=http://localhost:8080
JWT_SECRET=your-secret
MONGODB_URI=your-mongodb-uri

# Backend (.env)  
JWT_SECRET=same-secret
MONGODB_URI=same-mongodb-uri
FRONTEND_URL=http://localhost:8080
```