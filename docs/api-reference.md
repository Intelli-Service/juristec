# 📡 Referência de APIs - Juristec Platform

## 🔌 WebSocket APIs

**Endpoint Base**: `ws://localhost:8080` (desenvolvimento) / `wss://app.juristec.com` (produção)

### Eventos de Chat

#### `join-room`

Entra em uma conversa específica.

**Parâmetros:**

```typescript
{
  conversationId: string;
  userId?: string;
}
```

**Respostas:**

```typescript
// Sucesso
{
  event: 'joined-room',
  data: {
    conversationId: string;
    messages: Message[];
  }
}

// Erro
{
  event: 'error',
  data: {
    message: string;
  }
}
```

#### `send-message`

Envia mensagem para processamento pela IA.

**Parâmetros:**

```typescript
{
  text: string;
  conversationId: string;
  attachments?: Array<{
    originalName: string;
    mimeType: string;
    size: number;
  }>;
}
```

**Respostas:**

```typescript
// Mensagem do usuário
{
  event: 'receive-message',
  data: {
    text: string;
    sender: 'user';
    messageId: string;
    conversationId: string;
    createdAt: string;
    attachments?: any[];
  }
}

// Resposta da IA
{
  event: 'receive-message',
  data: {
    text: string;
    sender: 'ai';
    messageId: string;
    conversationId: string;
    createdAt: string;
  }
}

// Digitação iniciada
{
  event: 'typing-start',
  data: {
    conversationId: string;
  }
}

// Digitação parada
{
  event: 'typing-stop',
  data: {
    conversationId: string;
  }
}
```

#### `send-lawyer-message`

Envia mensagem como advogado.

**Parâmetros:**

```typescript
{
  text: string;
  conversationId: string;
  lawyerId: string;
}
```

#### `verify-code`

Verifica código de registro de usuário.

**Parâmetros:**

```typescript
{
  code: string; // 6 dígitos
  conversationId: string;
}
```

#### `create-new-conversation`

Cria uma nova conversa.

**Parâmetros:**

```typescript
{
  initialMessage?: string;
}
```

#### `switch-conversation`

Alterna para uma conversa específica.

**Parâmetros:**

```typescript
{
  conversationId: string;
}
```

#### `get-conversations`

Lista conversas do usuário.

**Resposta:**

```typescript
{
  event: 'conversations-list',
  data: {
    conversations: Array<{
      _id: string;
      roomId: string;
      status: string;
      classification?: {
        category: string;
        complexity: string;
      };
      lastMessageAt: string;
      createdAt: string;
    }>;
  }
}
```

### Eventos do Sistema

#### `receive-message`

Recebe mensagem na conversa.

#### `typing-start`

Indica que alguém está digitando.

#### `typing-stop`

Indica que parou de digitar.

#### `error`

Erro na operação.

## 🌐 REST APIs

### Autenticação (`/api/auth/*`)

#### `GET /api/auth/session`

Obtém sessão atual do usuário.

**Resposta:**

```typescript
{
  user: {
    id: string;
    email: string;
    name: string;
    role: 'client' | 'lawyer' | 'moderator' | 'super_admin';
  };
  expires: string;
}
```

#### `POST /api/auth/signin`

Realiza login do usuário.

**Parâmetros:**

```typescript
{
  email: string;
  password: string;
}
```

#### `POST /api/auth/signout`

Realiza logout do usuário.

### Admin (`/api/admin/*`)

#### `GET /api/admin/ai-config`

Obtém configurações da IA.

**Resposta:**

```typescript
{
  systemPrompt: string;
  behaviorSettings: {
    maxTokens: number;
    temperature: number;
    ethicalGuidelines: string[];
    specializationAreas: string[];
  };
  classificationSettings: {
    enabled: boolean;
    categories: string[];
    summaryTemplate: string;
  };
}
```

#### `PUT /api/admin/ai-config`

Atualiza configurações da IA.

**Parâmetros:**

```typescript
{
  systemPrompt?: string;
  behaviorSettings?: {
    maxTokens?: number;
    temperature?: number;
    ethicalGuidelines?: string[];
    specializationAreas?: string[];
  };
  classificationSettings?: {
    enabled?: boolean;
    categories?: string[];
    summaryTemplate?: string;
  };
}
```

#### `GET /api/admin/users`

Lista usuários do sistema.

**Parâmetros de Query:**
- `page`: número da página (padrão: 1)
- `limit`: itens por página (padrão: 10)
- `role`: filtro por role

**Resposta:**

```typescript
{
  users: Array<{
    _id: string;
    email: string;
    name: string;
    role: string;
    createdAt: string;
  }>;
  total: number;
  page: number;
  pages: number;
}
```

#### `GET /api/admin/analytics`

Relatórios administrativos.

**Resposta:**

```typescript
{
  totalConversations: number;
  activeConversations: number;
  totalUsers: number;
  revenue: {
    total: number;
    monthly: Array<{
      month: string;
      amount: number;
    }>;
  };
  aiUsage: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
  };
}
```

### Advogado (`/api/lawyer/*`)

#### `GET /api/lawyer/cases`

Lista casos do advogado.

**Parâmetros de Query:**
- `status`: filtro por status
- `page`: número da página
- `limit`: itens por página

**Resposta:**

```typescript
{
  cases: Array<{
    _id: string;
    roomId: string;
    status: string;
    clientInfo: {
      name: string;
      email: string;
    };
    classification: {
      category: string;
      complexity: string;
    };
    createdAt: string;
    lastMessageAt: string;
  }>;
  total: number;
}
```

#### `PUT /api/lawyer/cases/:id`

Atualiza status do caso.

**Parâmetros:**

```typescript
{
  status: 'assigned' | 'completed' | 'transferred';
  resolution?: string;
}
```

#### `GET /api/lawyer/messages/:conversationId`

Mensagens da conversa.

**Parâmetros de Query:**
- `limit`: número máximo de mensagens (padrão: 50)

**Resposta:**

```typescript
{
  messages: Array<{
    _id: string;
    text: string;
    sender: 'user' | 'ai' | 'lawyer';
    createdAt: string;
    attachments?: any[];
  }>;
}
```

#### `POST /api/lawyer/messages`

Envia mensagem como advogado.

**Parâmetros:**

```typescript
{
  conversationId: string;
  text: string;
  attachments?: File[];
}
```

### Uploads (`/api/uploads/*`)

#### `POST /api/uploads/files`

Upload de arquivo.

**Parâmetros (FormData):**
- `file`: arquivo a ser enviado
- `conversationId`: ID da conversa
- `messageId`: ID da mensagem (opcional)

**Resposta:**

```typescript
{
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  conversationId: string;
  messageId?: string;
}
```

#### `GET /api/uploads/files/:id`

Download de arquivo.

**Resposta:** Arquivo binário

#### `DELETE /api/uploads/files/:id`

Remove arquivo.

### Pagamentos (`/api/payments/*`)

#### `POST /api/payments/create`

Cria transação de pagamento.

**Parâmetros:**

```typescript
{
  conversationId: string;
  amount: number; // em centavos
  caseCategory: string;
  caseComplexity: string;
  lawyerId: string;
}
```

**Resposta:**

```typescript
{
  transactionId: string;
  status: string;
  paymentUrl: string;
  qrCode?: string;
}
```

#### `GET /api/payments/status/:id`

Status da transação.

**Resposta:**

```typescript
{
  transactionId: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  amount: number;
  paidAt?: string;
}
```

#### `POST /api/payments/webhook`

Webhook do Pagar.me (chamado automaticamente).

### Analytics (`/api/analytics/*`)

#### `GET /api/analytics/dashboard`

Dashboard administrativo completo.

**Resposta:**

```typescript
{
  conversations: {
    total: number;
    active: number;
    completed: number;
    byCategory: Record<string, number>;
  };
  users: {
    total: number;
    active: number;
    byRole: Record<string, number>;
  };
  revenue: {
    total: number;
    paid: number;
    pending: number;
    monthly: Array<{
      month: string;
      amount: number;
    }>;
  };
  ai: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
  };
}
```

#### `GET /api/analytics/conversations`

Estatísticas de conversas.

#### `GET /api/analytics/revenue`

Relatórios de receita.

## 📊 Códigos de Status HTTP

- `200`: Sucesso
- `201`: Criado
- `400`: Requisição inválida
- `401`: Não autorizado
- `403`: Proibido
- `404`: Não encontrado
- `422`: Entidade não processável
- `500`: Erro interno do servidor

## 🔒 Autenticação

### JWT Tokens
Todas as APIs protegidas requerem autenticação via JWT token no header:

```
Authorization: Bearer <token>
```

### Cookies
Para aplicações web, os tokens são automaticamente gerenciados via cookies HTTP-only.

### Roles e Permissões
- `client`: Acesso básico ao chat
- `lawyer`: Acesso aos casos atribuídos
- `moderator`: Acesso de leitura a todos os dados
- `super_admin`: Acesso completo ao sistema

## 📝 Rate Limiting

- **APIs públicas**: 100 requisições/minuto por IP
- **APIs autenticadas**: 1000 requisições/minuto por usuário
- **WebSocket**: Ilimitado (controlado por sala)

## 🧪 Testes de API

### Usando cURL

```bash
# Testar health check
curl http://localhost:8080/api/health

# Testar API com autenticação
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8080/api/admin/users
```

### Usando Postman/Insomnia

1. Importar collection do repositório
2. Configurar variáveis de ambiente
3. Executar requests autenticados

## 🚨 Tratamento de Erros

### Estrutura de Erro
```typescript
{
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  path: string;
}
```

### Códigos de Erro Comuns
- `VALIDATION_ERROR`: Dados inválidos
- `AUTHENTICATION_ERROR`: Token inválido
- `AUTHORIZATION_ERROR`: Permissões insuficientes
- `NOT_FOUND`: Recurso não encontrado
- `RATE_LIMIT_EXCEEDED`: Limite de requisições excedido
- `INTERNAL_ERROR`: Erro interno do servidor

---

**Última atualização**: Outubro 2025
