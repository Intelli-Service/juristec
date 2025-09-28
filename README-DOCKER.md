# Ambiente de Desenvolvimento com Docker Compose + Nginx

Esta configuração simula o ambiente de produção usando Docker Compose com nginx como proxy reverso, similar a um ingress do Kubernetes.

## Arquitetura

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   localhost     │    │    nginx     │    │   Containers    │
│     :8080       │───▶│    proxy     │───▶│  frontend:3000  │
│                 │    │              │    │  backend:4000   │
└─────────────────┘    └──────────────┘    └─────────────────┘
```

## Roteamento

- `http://localhost:8080/*` → Next.js Frontend
- `http://localhost:8080/api/auth/*` → NextAuth (Frontend Next.js)
- `http://localhost:8080/api/(admin|lawyer|chat)/*` → NestJS Backend (remove `/api` prefix)
- `http://localhost:8080/socket.io/*` → WebSocket Backend

## Como Usar

### 1. Preparação

Certifique-se de que os services locais estão parados:
```bash
# Parar qualquer serviço rodando nas portas 3000, 4000
pkill -f "next dev"
pkill -f "nest start"
```

### 2. Iniciar serviços

#### Desenvolvimento padrão (MongoDB Atlas + arquivos .env locais)
```bash
# Na raiz do projeto
docker-compose up --build
```

#### Com MongoDB local (para desenvolvimento offline)
```bash
# Na raiz do projeto
docker-compose --profile with-db up --build
```

#### Com Redis (para cache e sessões)
```bash
# Na raiz do projeto
docker-compose --profile with-redis up --build
```

#### Todos os serviços opcionais
```bash
# Na raiz do projeto
docker-compose --profile with-db --profile with-redis up --build
```

### 3. Acessar a aplicação

- **Frontend**: `http://localhost:8080`
- **Admin**: `http://localhost:8080/admin`
- **Login**: `http://localhost:8080/auth/signin`

### 4. Logs em tempo real

```bash
# Todos os serviços
docker-compose logs -f

# Apenas nginx
docker-compose logs -f nginx

# Apenas backend
docker-compose logs -f backend

# Apenas frontend  
docker-compose logs -f frontend
```

### 5. Parar os serviços

```bash
# Parar e remover containers
docker-compose down

# Parar, remover e limpar volumes
docker-compose down -v
```

## Vantagens

✅ **Produção-like**: Simula exatamente como vai funcionar com ingress nginx  
✅ **Cookies automáticos**: NextAuth funciona perfeitamente entre serviços  
✅ **Hot reload**: Mudanças no código são refletidas imediatamente  
✅ **WebSocket**: Suporte completo para Socket.io  
✅ **Logs centralizados**: nginx registra todas as requisições  
✅ **SSL ready**: Fácil adicionar certificados HTTPS  

## Debug

### Ver logs do nginx
```bash
docker-compose exec nginx tail -f /var/log/nginx/access.log
```

### Testar conectividade
```bash
# Teste direto nos containers
curl http://localhost:3000     # Frontend direto
curl http://localhost:4000     # Backend direto  
curl http://localhost:8080     # Através do nginx
```

### Entrar nos containers
```bash
# Container do nginx
docker-compose exec nginx sh

# Container do backend
docker-compose exec backend sh

# Container do frontend
docker-compose exec frontend sh
```

## Troubleshooting

### Problema: Containers não sobem
- Verifique se as portas 3000, 4000, 8080 estão livres
- Execute `docker-compose down -v` e tente novamente

### Problema: Hot reload não funciona
- No macOS/Windows, o hot reload pode ser mais lento devido ao file system
- Verifique se os volumes estão montados corretamente

### Problema: Cookies não funcionam  
- Verifique se o nginx está passando o header `Cookie` corretamente
- Confirme que `NEXTAUTH_URL=http://localhost:8080` no frontend