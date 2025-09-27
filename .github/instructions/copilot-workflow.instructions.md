---
applyTo: '**'
---
# 🚀 Workflow GitHub Completo - Juristec Platform

## Visão Geral
Este documento descreve o fluxo completo de desenvolvimento, desde a criação de branches até o merge de pull requests, incluindo resolução de code reviews via API do GitHub.

## 📋 Fluxo de Desenvolvimento

### 1. Criação de Branch
```bash
# Padrão de nomenclatura: feature/issue-{numero}-{titulo-resumido}
git checkout -b feature/issue-28-toast-notifications
```

### 2. Desenvolvimento e Commits
- **Desenvolvimento**: Implemente seguindo TDD (Testes primeiro)
- **Commits**: Commits pequenos e descritivos
- **Testes**: Execute `npm test` antes de cada commit
- **Qualidade**: ESLint, TypeScript strict mode

### 3. Pull Request
```bash
# Criar PR com template padrão
gh pr create --title "feat/issue-28: Modern Toast Notifications & Enhanced UX" \
             --body "Implementação completa do sistema de notificações toast..."
```

### 4. Code Review Automático
- **GitHub Copilot**: Review automático é solicitado automaticamente
- **Comentários**: Aparecem na aba "Files changed" > "Review changes"

## 🔧 Resolução de Code Reviews via API

### 4.1 Identificar Conversas Pendentes
```bash
# Listar comentários de review
gh api repos/{owner}/{repo}/pulls/{number}/comments --jq '.[].id'

# Verificar estrutura das conversas via GraphQL
gh api graphql -f query='
query {
  repository(owner: "Intelli-Service", name: "juristec") {
    pullRequest(number: 31) {
      reviewThreads(first: 10) {
        nodes {
          id
          isResolved
          comments(first: 10) {
            nodes {
              id
              body
            }
          }
        }
      }
    }
  }
}'
```

### 4.2 Responder Conversas Individuais
```bash
# Responder comentário específico
gh api -X POST repos/{owner}/{repo}/pulls/{number}/comments/{comment_id}/replies \
       -f body="**Status:** ✅ **RESOLVIDO**

Implementação detalhada da correção...

\`\`\`typescript
// Código da solução
const example = 'solution';
\`\`\`

Explicação técnica completa."
```

### 4.3 Resolver Conversas via GraphQL
```bash
# Resolver thread específico
gh api graphql -f query='
mutation {
  resolveReviewThread(input: {threadId: "PRRT_kwDOP1kT-M5b0aen"}) {
    thread {
      isResolved
    }
  }
}'
```

### 4.4 Aprovação Final
```bash
# Criar review de aprovação (não pode ser auto-aprovação)
gh api -X POST repos/{owner}/{repo}/pulls/{number}/reviews \
       -f event=APPROVE \
       -f body="✅ **APROVADO - Code Review Completo**

Todas as correções implementadas com sucesso:
- ✅ Item 1 resolvido
- ✅ Item 2 resolvido
- ✅ Item 3 resolvido
- ✅ Item 4 resolvido

**Qualidade garantida:**
- ✅ Testes passando
- ✅ ESLint limpo
- ✅ TypeScript sem erros
- ✅ Documentação completa

🚀 **Pronto para produção!**"
```

## 📊 Status e Verificações

### Verificar Status do PR
```bash
# Status completo do PR
gh pr view {number} --json mergeable,mergeStateStatus,reviewDecision

# Verificar se conversas estão resolvidas
gh api graphql -f query='
query {
  repository(owner: "{owner}", name: "{repo}") {
    pullRequest(number: {number}) {
      reviewThreads(first: 10) {
        nodes {
          isResolved
        }
      }
    }
  }
}'
```

### Merge do PR
```bash
# Merge automático (se habilitado)
gh pr merge {number} --auto --delete-branch=false

# Merge com commit de merge
gh pr merge {number} --merge --delete-branch=false

# Merge administrativo (se necessário)
gh pr merge {number} --admin --merge --delete-branch=false
```

## 🧪 Estratégia de Testes (TDD Obrigatório)

### Testes Unitários
- **Jest + React Testing Library** para componentes
- **Cobertura mínima**: 80%
- **Padrão**: `*.test.tsx` ou `*.spec.ts`

### Testes de Integração
- **Docker Compose** para testes end-to-end
- **API testing** com supertest
- **Database testing** com MongoDB Memory Server

### Validações Pré-Commit
```bash
# Executar todos os testes
npm test

# Verificar linting
npm run lint

# Build de produção
npm run build

# Testes E2E (se aplicável)
npm run test:e2e
```

## 🔒 Regras de Qualidade e Segurança

### Code Quality
- **ESLint**: Zero warnings permitidos
- **TypeScript**: Strict mode obrigatório
- **Prettier**: Formatação automática
- **Husky**: Pre-commit hooks

### Segurança
- **JWT**: Validação adequada em todas as rotas
- **Input sanitization**: Prevenção de XSS/SQL injection
- **Rate limiting**: Proteção contra abuso
- **LGPD compliance**: Dados pessoais criptografados

### Performance
- **Lazy loading**: Componentes e rotas
- **Image optimization**: Next.js Image component
- **Bundle analysis**: Webpack bundle analyzer
- **Caching**: Redis para sessões e dados

## 📝 Padrões de Commit

### Formato Padrão
```
type(scope): description

[optional body]

[optional footer]
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
feat: add toast notification system
fix: resolve memory leak in FileUpload component
test: add comprehensive toast component tests
docs: update workflow documentation
```

## 🚨 Regras Críticas - Repositório Limpo

### Verificação Obrigatória
```bash
git status
# DEVE retornar: "working tree clean"
# NUNCA pode ter: "Changes not staged", "Untracked files"
```

### Processo de Limpeza
1. **Análise**: `git status` - Identificar pendências
2. **Categorização**: Separar por tipo (código, config, temporários)
3. **Decisão**: Commit específico para cada categoria
4. **Execução**: Commits descritivos
5. **Validação**: `git status` deve estar limpo

### Commits de Limpeza (Exemplos)
```bash
# Código esquecido
git commit -m "feat: add missing toast components"

# Configurações
git commit -m "config: update environment variables"

# Correções de build
git commit -m "fix: resolve TypeScript compilation errors"

# Testes
git commit -m "test: add toast notification test suite"
```

## 🎯 Estratégias por Tipo de Issue

### Issues de UI/UX (#28)
- **Abordagem**: Componentes reutilizáveis, design system
- **Tecnologias**: React + TypeScript, Tailwind CSS
- **Testes**: Storybook + React Testing Library
- **Acessibilidade**: WCAG 2.1 AA compliance

### Issues de Backend/API
- **Abordagem**: RESTful APIs, validação robusta
- **Tecnologias**: NestJS, MongoDB, JWT
- **Testes**: Supertest + MongoDB Memory Server
- **Documentação**: Swagger/OpenAPI

### Issues de Segurança
- **Abordagem**: Defense in depth, zero-trust
- **Tecnologias**: JWT, bcrypt, rate limiting
- **Testes**: Security testing, penetration testing
- **Compliance**: LGPD, OWASP guidelines

### Issues de Performance
- **Abordagem**: Profiling, otimização, caching
- **Tecnologias**: Redis, CDN, lazy loading
- **Testes**: Lighthouse, Web Vitals
- **Monitoramento**: Application Insights

## 🔄 Processo de Code Review Duplo

### Fase 1: Code Review Interno (Antes do PR)
1. **Análise de Qualidade**: Código limpo, padrões seguidos
2. **Validação de Requisitos**: Issue completamente atendida
3. **Testes Abrangentes**: Todos os cenários cobertos
4. **Segurança**: Validações implementadas
5. **Performance**: Otimizações aplicadas
6. **Documentação**: Código bem documentado

### Fase 2: Code Review Automático (GitHub Copilot)
1. **Review Automático**: Solicitado automaticamente no PR
2. **Análise de Feedback**: Todos os comentários analisados
3. **Implementação**: Correções aplicadas via API
4. **Resolução**: Conversas marcadas como resolvidas
5. **Re-validação**: Testes executados novamente

### Fase 3: Aprovação Final
1. **Review Manual**: Aprovação por usuário com write access
2. **Merge**: PR mergeado automaticamente
3. **Cleanup**: Branch deletada (opcional)
4. **Issue Close**: Issue fechada automaticamente

## 📊 Métricas de Sucesso

### Qualidade
- ✅ Zero bugs em produção
- ✅ Cobertura de testes >80%
- ✅ ESLint zero warnings
- ✅ Lighthouse score >90

### Performance
- ✅ First Contentful Paint <2s
- ✅ Largest Contentful Paint <3s
- ✅ Cumulative Layout Shift <0.1
- ✅ First Input Delay <100ms

### Usabilidade
- ✅ Taxa de conversão >70%
- ✅ Tempo médio de sessão >5min
- ✅ Bounce rate <30%
- ✅ Mobile-friendly score 100/100

## 🆘 Troubleshooting

### PR Bloqueado
```bash
# Verificar status
gh pr view {number} --json mergeStateStatus

# Possíveis causas:
# - Conversas não resolvidas
# - Reviews pendentes
# - Branch protection rules
# - Checks falhando
```

### Conversas Não Resolvidas
```bash
# Verificar threads não resolvidas
gh api graphql -f query='query { repository(owner: "...", name: "...") { pullRequest(number: ...) { reviewThreads(first: 10) { nodes { id isResolved } } } } }'

# Resolver via GraphQL
gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "..."}) { thread { isResolved } } }'
```

### Testes Falhando
```bash
# Executar testes específicos
npm test -- --testNamePattern="Toast"

# Debug com coverage
npm test -- --coverage --watchAll=false

# Testes E2E
npm run test:e2e
```

## 📚 Referências

- [GitHub CLI Documentation](https://cli.github.com/manual/)
- [GitHub GraphQL API](https://docs.github.com/en/graphql)
- [Conventional Commits](https://conventionalcommits.org/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)

---

**Última atualização**: 25 de setembro de 2025
**Baseado na experiência**: Issue #28 - Toast Notifications System