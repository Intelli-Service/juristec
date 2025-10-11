# 🤝 Guia de Contribuição - Juristec Platform

## 🎯 Visão Geral

Bem-vindo ao projeto Juristec! Este guia ajuda você a contribuir efetivamente para nossa plataforma de justiça digital. Seguimos práticas modernas de desenvolvimento para garantir qualidade e consistência.

## 📋 Pré-requisitos

### Conhecimento Técnico
- **Frontend**: React, Next.js, TypeScript, Tailwind CSS
- **Backend**: Node.js, NestJS, Socket.io, MongoDB
- **Ferramentas**: Docker, Git, VS Code
- **Metodologias**: TDD, Clean Code, Git Flow

### Ambiente de Desenvolvimento
```bash
# Clonar repositório
git clone https://github.com/Intelli-Service/juristec.git
cd juristec

# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env.local
# Editar .env.local com suas chaves

# Iniciar desenvolvimento
npm run dev
```

## 🔄 Fluxo de Desenvolvimento

### 1. Escolher Issue
- Verificar [Issues abertas](https://github.com/Intelli-Service/juristec/issues)
- Priorizar issues com label `good first issue` se for novo contribuidor
- Issues críticas têm labels `bug` ou `security`

### 2. Criar Branch
```bash
# Padrão de nomenclatura
git checkout -b feature/issue-123-descricao-curta
git checkout -b fix/issue-456-corrigir-bug-login
git checkout -b docs/issue-789-atualizar-documentacao
```

### 3. Desenvolvimento
```bash
# Seguir TDD: Testes primeiro
npm run test:watch

# Desenvolvimento incremental
# Commits pequenos e descritivos

# Verificar qualidade
npm run lint
npm run build
```

### 4. Pull Request
```bash
# Criar PR descritivo
gh pr create --title "feat: add user registration flow" \
             --body "Implementa fluxo completo de cadastro de usuário..."

# Aguardar review automático do GitHub Copilot
# Implementar feedback quando necessário
```

## 🧪 Estratégia de Testes

### Testes Obrigatórios
- **Unitários**: 80% cobertura mínima
- **Integração**: APIs e serviços externos
- **E2E**: Fluxos críticos do usuário
- **Acessibilidade**: WCAG 2.1 AA compliance

### Executar Testes
```bash
# Todos os testes
npm test

# Apenas unitários
npm run test:unit

# Apenas E2E
npm run test:e2e

# Com coverage
npm run test:coverage
```

## 📝 Padrões de Código

### TypeScript
```typescript
// ✅ Bom: Tipagem explícita
interface User {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'lawyer' | 'admin';
}

// ✅ Bom: Funções puras
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
};

// ❌ Ruim: any, tipos implícitos
const user = { name: 'João' }; // Sem tipagem
const process = (data: any) => data; // any
```

### React Components
```tsx
// ✅ Bom: Component funcional com hooks
interface ChatProps {
  conversationId: string;
  onSendMessage: (text: string) => void;
}

export const Chat: React.FC<ChatProps> = ({
  conversationId,
  onSendMessage
}) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSendMessage(message);
    setMessage('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Digite sua mensagem..."
      />
      <button type="submit">Enviar</button>
    </form>
  );
};
```

### Estilos (Tailwind CSS)
```tsx
// ✅ Bom: Classes semânticas, responsividade
<div className="bg-white rounded-lg shadow-md p-4 md:p-6 lg:p-8">
  <h2 className="text-xl font-semibold text-gray-900 mb-4">
    Título da Seção
  </h2>
  <p className="text-gray-600 leading-relaxed">
    Descrição do conteúdo...
  </p>
</div>

// ❌ Ruim: Estilos inline, !important
<div style={{ backgroundColor: 'white', padding: '1rem' }}>
  <h2 style={{ color: 'black !important' }}>
    Título
  </h2>
</div>
```

## 📚 Padrões de Commit

### Formato Padrão
```
tipo(escopo): descrição concisa

[corpo opcional explicando mudanças]

[rodapé opcional com breaking changes]
```

### Tipos Permitidos
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Documentação
- `style`: Formatação/código
- `refactor`: Refatoração
- `test`: Testes
- `chore`: Manutenção

### Exemplos
```bash
feat: add real-time chat with WebSocket
fix: resolve memory leak in file upload
docs: update API documentation
style: format code with Prettier
refactor: extract authentication logic to hook
test: add unit tests for payment service
chore: update dependencies
```

## 🔒 Segurança

### Boas Práticas
- **Nunca commite chaves/secrets**: Use `.env` e `.gitignore`
- **Validação de entrada**: Sempre sanitize inputs
- **Autenticação**: Use JWT corretamente
- **HTTPS**: Sempre em produção
- **CSP Headers**: Configurar Content Security Policy

### Checklist de Segurança
- [ ] Dados sensíveis criptografados
- [ ] Rate limiting implementado
- [ ] Input sanitization
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF protection

## 🎨 Design System

### Cores (Tema Jurídico)
```css
/* Navy Blue - Headers */
--color-primary: #1e3a8a;

/* Slate Gray - Backgrounds */
--color-secondary: #64748b;

/* Emerald Green - Accents */
--color-accent: #059669;

/* Slate 50 - Light backgrounds */
--color-light: #f8fafc;
```

### Tipografia
- **Headers**: Inter Bold, 24px+
- **Body**: Inter Regular, 16px
- **Small**: Inter Regular, 14px
- **Line height**: 1.5 para legibilidade

### Componentes
- **Botões**: Rounded, com hover states
- **Forms**: Labels acima dos campos
- **Cards**: Shadow sutil, padding consistente
- **Modais**: Centralizados, overlay escuro

## 🚀 Performance

### Otimizações Obrigatórias
- **Lazy loading**: Componentes e rotas
- **Image optimization**: Next.js Image component
- **Bundle splitting**: Code splitting automático
- **Caching**: API responses e static assets
- **CDN**: Para assets estáticos

### Métricas Alvo
- **First Contentful Paint**: < 2s
- **Largest Contentful Paint**: < 3s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

## ♿ Acessibilidade

### Requisitos WCAG 2.1 AA
- **Contraste**: Mínimo 4.5:1 para texto normal
- **Navegação**: Totalmente acessível por teclado
- **Screen readers**: Labels ARIA apropriadas
- **Focus**: Indicadores visuais claros
- **Semântica**: HTML semântico correto

### Ferramentas
```bash
# Testar acessibilidade
npm run test:a11y

# Auditar com Lighthouse
npx lighthouse http://localhost:3000 --output html
```

## 📖 Documentação

### Código
```typescript
/**
 * Registra um novo usuário no sistema
 * @param userData - Dados do usuário
 * @returns Promise<User> - Usuário criado
 * @throws ValidationError - Se dados inválidos
 * @throws DuplicateError - Se email já existe
 */
async function registerUser(userData: UserInput): Promise<User> {
  // Validação
  validateUserData(userData);

  // Verificar duplicata
  const existing = await User.findOne({ email: userData.email });
  if (existing) {
    throw new DuplicateError('Email já cadastrado');
  }

  // Criar usuário
  const user = new User(userData);
  return user.save();
}
```

### APIs
```typescript
// Documentar endpoints
/**
 * POST /api/auth/register
 * Registra novo usuário
 *
 * Body:
 * {
 *   "name": "João Silva",
 *   "email": "joao@example.com",
 *   "password": "senha123"
 * }
 *
 * Response: 201
 * {
 *   "user": { "id": "123", "name": "João Silva" },
 *   "token": "jwt_token_aqui"
 * }
 */
```

## 🔄 Code Review

### Checklist de Review
- [ ] **Funcionalidade**: Implementa o que foi solicitado?
- [ ] **Testes**: Cobertura adequada, testes passando?
- [ ] **Qualidade**: Código limpo, bem estruturado?
- [ ] **Performance**: Sem regressões de performance?
- [ ] **Segurança**: Vulnerabilidades identificadas?
- [ ] **Documentação**: Código bem documentado?

### Feedback Constructivo
```markdown
## 💡 Sugestões de Melhoria

### Segurança
- Adicionar validação de entrada mais robusta
- Implementar rate limiting na API

### Performance
- Considerar lazy loading para componente pesado
- Otimizar query do banco de dados

### UX
- Adicionar loading states
- Melhorar mensagens de erro

### Código
- Extrair lógica para hook customizado
- Adicionar mais testes unitários
```

## 🐛 Reportando Bugs

### Template de Bug Report
```markdown
## 🐛 Bug Report

**Descrição:**
[Descrição clara do bug]

**Passos para reproduzir:**
1. Ir para '...'
2. Clicar em '...'
3. Ver erro

**Comportamento esperado:**
[O que deveria acontecer]

**Comportamento atual:**
[O que acontece]

**Screenshots:**
[Se aplicável]

**Ambiente:**
- OS: [macOS/Windows/Linux]
- Browser: [Chrome/Firefox/Safari]
- Versão: [1.0.0]

**Informações adicionais:**
[Qualquer informação relevante]
```

## 💡 Sugestões de Melhorias

### Template de Feature Request
```markdown
## 💡 Feature Request

**Problema:**
[Qual problema esta feature resolve?]

**Solução proposta:**
[Descrição da feature]

**Alternativas consideradas:**
[Outras soluções que você considerou]

**Informações adicionais:**
[Mockups, referências, etc.]
```

## 📞 Suporte

### Canais de Comunicação
- **Issues**: Para bugs e features
- **Discussions**: Para perguntas gerais
- **Discord**: Para chat em tempo real
- **Email**: Para assuntos sensíveis

### Resposta Esperada
- **Bugs críticos**: < 24 horas
- **Bugs normais**: < 1 semana
- **Features**: < 2 semanas
- **Perguntas**: < 48 horas

## 🎉 Reconhecimento

Contribuições são sempre bem-vindas! Todos os contribuidores são reconhecidos:

- **Contributors**: Lista no README
- **Hall of Fame**: Contribuições destacadas
- **Badges**: Para contribuidores ativos
- **Swag**: Para grandes contribuições

---

**Última atualização**: Outubro 2025
