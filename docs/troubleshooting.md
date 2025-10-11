# Troubleshooting - Juristec Platform

## 🐛 Problemas Comuns e Soluções

### WebSocket não conecta

#### Sintomas
- Chat não carrega mensagens
- Erro "WebSocket connection failed"
- Interface mostra "Conectando..."

#### Soluções

**1. Verificar se o backend está rodando**
```bash
# Verificar containers Docker
docker-compose ps

# Verificar logs do backend
docker-compose logs websocket-service-nest
```

**2. Verificar configuração do nginx**
```bash
# Testar proxy
curl -I http://localhost:8080

# Verificar configuração nginx
cat nginx/default.conf
```

**3. Verificar variáveis de ambiente**
```bash
# Backend
cd apps/websocket-service-nest
cat .env | grep -E "(PORT|WS|CORS)"

# Frontend
cd apps/next-app
cat .env.local | grep -E "(WS|SOCKET)"
```

**4. Testar conexão direta**
```bash
# Testar WebSocket diretamente
wscat -c ws://localhost:4000
```

### IA não responde

#### Sintomas
- Mensagens do usuário são enviadas mas não há resposta
- Chat fica carregando indefinidamente
- Erro "Serviço de IA temporariamente indisponível"

#### Soluções

**1. Verificar chave da API do Google**
```bash
# Verificar se a chave está definida
cd apps/websocket-service-nest
echo $GOOGLE_API_KEY

# Testar conectividade com Gemini
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-goog-api-key: $GOOGLE_API_KEY" \
  -d '{"contents":[{"parts":[{"text":"Olá"}]}]}' \
  https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent
```

**2. Verificar configuração da IA**
```bash
# Verificar configuração no banco
mongosh --eval "db.aiconfigs.find().pretty()"

# Verificar logs do serviço de IA
docker-compose logs websocket-service-nest | grep -i gemini
```

**3. Testar função manualmente**
```bash
# Testar serviço de IA diretamente
cd apps/websocket-service-nest
npm run test -- --testNamePattern="AIService"
```

### Upload de arquivos falha

#### Sintomas
- Arquivo não é enviado
- Erro "Upload failed"
- Arquivo aparece mas não pode ser baixado

#### Soluções

**1. Verificar permissões do Google Cloud Storage**
```bash
# Verificar credenciais
cd apps/websocket-service-nest
cat .env | grep -E "(GCS|GOOGLE)"

# Testar autenticação GCS
gsutil ls gs://$GCS_BUCKET_NAME
```

**2. Verificar tamanho e tipo do arquivo**
```bash
# Verificar limites no código
grep -r "10 \* 1024 \* 1024" apps/  # 10MB limit
grep -r "allowedTypes" apps/       # Tipos permitidos
```

**3. Verificar signed URLs**
```bash
# Testar geração de URL assinada
curl "http://localhost:8080/api/uploads/files/test-id/download"
```

**4. Logs de upload**
```bash
# Verificar logs do serviço de upload
docker-compose logs websocket-service-nest | grep -i upload
```

### Autenticação falha

#### Sintomas
- Não consegue fazer login
- Sessão expira imediatamente
- Erro "Authentication failed"

#### Soluções

**1. Verificar NextAuth configuração**
```bash
# Verificar secrets
cd apps/next-app
cat .env.local | grep -E "(NEXTAUTH|JWT|SECRET)"

# Verificar configuração NextAuth
cat src/lib/auth.ts
```

**2. Verificar JWT tokens**
```bash
# Testar geração de token
cd apps/websocket-service-nest
npm run test -- --testNamePattern="JWT"
```

**3. Verificar sessão do usuário**
```bash
# Verificar sessão no banco
mongosh --eval "db.sessions.find().limit(5).pretty()"
```

### Banco de dados não conecta

#### Sintomas
- Aplicação inicia mas dados não persistem
- Erro "MongoDB connection failed"
- Queries falham

#### Soluções

**1. Verificar string de conexão**
```bash
# Verificar URI do MongoDB
cd apps/websocket-service-nest
cat .env | grep MONGODB_URI

# Testar conexão
mongosh "$MONGODB_URI"
```

**2. Verificar rede Docker**
```bash
# Verificar containers
docker-compose ps

# Verificar rede
docker network ls
docker network inspect juristec-platform_default
```

**3. Verificar índices MongoDB**
```bash
# Verificar índices criados
mongosh --eval "db.conversations.getIndexes()"
mongosh --eval "db.messages.getIndexes()"
```

### Pagamentos não funcionam

#### Sintomas
- Checkout não carrega
- Pagamento falha
- Webhooks não chegam

#### Soluções

**1. Verificar integração Pagar.me**
```bash
# Verificar chave da API
cd apps/next-app
cat .env.local | grep PAGARME

# Testar API do Pagar.me
curl -X POST \
  -H "Authorization: Bearer $PAGARME_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "payment_method": "credit_card"}' \
  https://api.pagar.me/1/transactions
```

**2. Verificar webhooks**
```bash
# Verificar endpoint de webhook
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}' \
  http://localhost:8080/api/payments/webhook
```

### Performance lenta

#### Sintomas
- Chat responde devagar
- Uploads demoram
- Página carrega lentamente

#### Soluções

**1. Verificar uso de recursos**
```bash
# Verificar uso de CPU/memória
docker stats

# Verificar queries lentas
mongosh --eval "db.system.profile.find().sort({ts: -1}).limit(5).pretty()"
```

**2. Otimizar queries**
```bash
# Verificar queries sem índice
mongosh --eval "db.conversations.find().explain()"
mongosh --eval "db.messages.find().explain()"
```

**3. Verificar cache**
```bash
# Verificar se Redis está sendo usado (se aplicável)
# Implementar cache para queries frequentes
```

## 🔧 Comandos Úteis de Debug

### Docker
```bash
# Reiniciar serviços
docker-compose restart

# Limpar containers
docker-compose down -v
docker-compose up --build

# Ver logs em tempo real
docker-compose logs -f [service-name]
```

### MongoDB
```bash
# Conectar ao banco
mongosh "mongodb://localhost:27017/juristec"

# Ver estatísticas
db.stats()

# Ver collections
show collections

# Backup
mongodump --db juristec --out backup
```

### Testes
```bash
# Executar todos os testes
npm test

# Testes específicos
npm run test -- --testNamePattern="WebSocket"
npm run test -- --testNamePattern="Upload"

# Testes E2E
npm run test:e2e
```

### Rede
```bash
# Verificar portas abertas
netstat -tlnp | grep :[348]000

# Testar conectividade
curl -v http://localhost:8080
curl -v http://localhost:3000
curl -v http://localhost:4000
```

## 📊 Monitoramento

### Métricas para acompanhar
- Taxa de sucesso de WebSocket connections
- Tempo de resposta da IA
- Taxa de falha de uploads
- Uso de CPU/memória dos containers
- Queries lentas no MongoDB

### Logs importantes
```bash
# Logs de erro
docker-compose logs | grep -i error

# Logs de WebSocket
docker-compose logs websocket-service-nest | grep -i socket

# Logs de IA
docker-compose logs websocket-service-nest | grep -i gemini
```

## 🚨 Contato e Suporte

Para problemas não resolvidos:

1. **Verificar issues no GitHub**
2. **Consultar documentação completa**
3. **Executar testes automatizados**
4. **Coletar logs detalhados**
5. **Abrir issue com informações completas**

### Informações para incluir em issues
- Versão do Node.js e npm
- Sistema operacional
- Logs completos do erro
- Passos para reproduzir
- Configurações relevantes (sem secrets)

---

**Última atualização**: Outubro 2025