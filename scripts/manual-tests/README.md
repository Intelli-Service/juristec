# 🧪 Juristec Platform - Manual Testing Suite

## 📋 Visão Geral

Esta suíte de testes manuais foi criada para garantir que todas as funcionalidades da plataforma Juristec estejam funcionando corretamente antes do deploy em produção. O foco é na **estabilidade e funcionalidade**, não na performance.

## 🚀 Como Executar os Testes

### Pré-requisitos

- Docker e Docker Compose instalados
- Projeto clonado localmente
- Ambiente de desenvolvimento configurado

### Comando Principal

```bash
# Executar todos os testes manuais
bash scripts/manual-tests/manual-testing-suite.sh
```

### Testes Individuais

```bash
# Testes funcionais específicos
bash scripts/manual-tests/functional-tests.sh

# Testes de integração (fluxos completos)
bash scripts/manual-tests/integration-tests.sh

# Testes de performance (opcional)
bash scripts/manual-tests/performance-tests.sh
```

## 📊 O que Cada Teste Verifica

### 🧪 Testes Funcionais (`functional-tests.sh`)

Testa cada funcionalidade individualmente:

1. **Landing Page Content** - Conteúdo e navegação da página inicial
2. **Chat Interface** - Interface de chat e componentes
3. **Authentication System** - Sistema de login e autenticação
4. **Admin Dashboard** - Painel administrativo
5. **File Upload Functionality** - Upload de arquivos
6. **Payment System** - Sistema de pagamentos
7. **AI Chat Integration** - Integração com IA Gemini
8. **Database Operations** - Operações de banco de dados
9. **Error Handling** - Tratamento de erros
10. **Security Features** - Recursos de segurança
11. **Mobile Responsiveness** - Responsividade mobile
12. **Toast Notifications** - Sistema de notificações

### 🔗 Testes de Integração (`integration-tests.sh`)

Testa fluxos completos do usuário:

1. **User Registration Flow** - Cadastro inteligente via chat
2. **File Upload Flow** - Upload e download de arquivos
3. **Payment Integration Flow** - Fluxo completo de pagamentos
4. **Admin Dashboard Access** - Acesso ao painel admin
5. **WebSocket Chat Connection** - Conexão WebSocket
6. **Database Connectivity** - Conectividade com banco
7. **AI Service Integration** - Integração com serviços de IA
8. **Lawyer Dashboard Access** - Acesso ao painel do advogado

### ⚡ Testes de Performance (`performance-tests.sh`)

Testa performance e carga (opcional):

- Tempos de resposta
- Capacidade de usuários concorrentes
- Uso de memória
- Performance de APIs

## 🎯 Critérios de Aprovação

### ✅ Sucesso (Ready for Production)

- **Taxa de sucesso geral**: ≥ 90%
- **Testes funcionais**: ≥ 90% aprovação
- **Testes de integração**: ≥ 85% aprovação
- **Testes de estabilidade**: ≥ 80% sucesso em 50 requisições

### ⚠️ Atenção (Needs Review)

- **Taxa de sucesso geral**: 80-89%
- **Testes funcionais**: 80-89% aprovação
- Revisar falhas antes do deploy

### ❌ Falha (Not Ready)

- **Taxa de sucesso geral**: < 80%
- **Testes funcionais**: < 80% aprovação
- Corrigir problemas críticos antes do deploy

## 🔧 Resolução de Problemas

### Serviços Não Iniciam

```bash
# Verificar status dos containers
docker-compose ps

# Ver logs dos serviços
docker-compose logs [service-name]

# Reiniciar serviços
docker-compose restart
```

### Testes Falham

1. Verificar se os serviços estão saudáveis
2. Checar logs dos containers
3. Validar variáveis de ambiente
4. Testar endpoints individualmente com curl

### Endpoints Não Respondem

```bash
# Testar conectividade básica
curl -v http://localhost:8080/
curl -v http://localhost:4000/health

# Verificar nginx configuration
docker-compose exec nginx nginx -t
```

## 📝 Logs e Debugging

### Ver Logs Durante os Testes

```bash
# Terminal 1: Executar testes
bash scripts/manual-tests/manual-testing-suite.sh

# Terminal 2: Monitorar logs em tempo real
docker-compose logs -f
```

### Debug de Testes Específicos

```bash
# Habilitar debug mode
export DEBUG=true
bash scripts/manual-tests/functional-tests.sh
```

## 🚀 Próximos Passos Após Aprovação

### Checklist Pré-Deploy

- [ ] Todos os testes passaram (≥90% sucesso)
- [ ] Repositório está limpo (`git status`)
- [ ] Variáveis de produção configuradas
- [ ] Secrets e chaves de API validadas
- [ ] Backup do banco de dados realizado
- [ ] Documentação atualizada

### Deploy em Kubernetes

1. Construir imagens Docker
2. Aplicar manifests Kubernetes
3. Configurar ingress e load balancer
4. Executar testes em staging
5. Deploy em produção

## 📊 Relatórios de Teste

Os testes geram relatórios detalhados incluindo:

- Status de cada teste (✅ Passou / ❌ Falhou)
- Taxas de sucesso por categoria
- Tempo de execução
- Recomendações para correções

## 🤝 Suporte

Para questões sobre os testes:

1. Verificar logs dos containers
2. Executar testes individuais para isolamento
3. Checar documentação da API
4. Validar configuração do ambiente

---

**Última atualização**: 27 de setembro de 2025
**Criado por**: Auri (AI Developer)
