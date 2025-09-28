# 🧪 Testes Manuais do Sistema de IA

Este diretório contém scripts para testar manualmente o sistema de IA da Juristec, simulando usuários reais interagindo via WebSocket.

## 📋 Pré-requisitos

1. **Docker Compose rodando**:

   ```bash
   cd /Users/jeanc/idea-app
   docker-compose ps  # Deve mostrar todos os containers UP
   ```text

2. **Aplicação acessível**:
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API: [http://localhost:4000](http://localhost:4000)
   - Nginx Proxy: [http://localhost:8080](http://localhost:8080) (usado pelos testes)

## 🛠️ Scripts Disponíveis

### 1. `test-ai-manual.js` - Teste Completo dos Casos de Uso

Testa os dois cenários principais: caso simples (resolvido pela IA) e caso complexo (encaminhado para advogado).

```bash
node test-ai-manual.js
```text

**O que testa:**

- ✅ Autenticação NextAuth (simulada)
- ✅ Conexão WebSocket
- ✅ Processamento de mensagens pela IA
- ✅ Classificação de conversas (resolved_by_ai vs assigned_to_lawyer)
- ✅ Trigger do modal de feedback
- ✅ Histórico de conversa

### 2. `test-history.js` - Teste Específico do Histórico

Testa se a IA está recebendo o contexto completo da conversa.

```bash
node test-history.js
```text

**O que testa:**

- ✅ Sequência de mensagens em uma conversa
- ✅ Contexto histórico passado para a IA
- ✅ Respostas coerentes baseadas no histórico

### 3. `monitor-backend-logs.js` - Monitor de Logs

Mostra logs do backend em tempo real durante os testes.

```bash
node monitor-backend-logs.js
```text

## 🚀 Como Executar os Testes

### Teste Básico (Recomendado)

1. **Terminal 1** - Monitorar logs do backend:

   ```bash
   node monitor-backend-logs.js
   ```text

2. **Terminal 2** - Executar teste da IA:

   ```bash
   node test-ai-manual.js
   ```text

### Teste de Histórico

1. **Terminal 1** - Monitorar logs:

   ```bash
   node monitor-backend-logs.js
   ```text

2. **Terminal 2** - Executar teste de histórico:

   ```bash
   node test-history.js
   ```text

## 📊 O que Observar

### Nos Logs do Backend

- **`Dados do cliente configurados`** - Verificar autenticação
- **`Antes de emitir mensagem da IA`** - Verificar resposta gerada
- **`⚠️ should_show_feedback`** - Verificar detecção de feedback
- **`Erro no processamento inteligente`** - Verificar erros na IA

### Na Saída do Script

- **`🤖 RESPOSTA DA IA`** - Conteúdo da resposta
- **`🎯 MODAL DE FEEDBACK SOLICITADO`** - Trigger de feedback
- **`Esperado: resolved_by_ai/assigned_to_lawyer`** - Classificação esperada

## 🔍 Casos de Teste

### Caso Simples (Resolvido pela IA)

```text
"Olá! Tenho uma dúvida simples: trabalho há 2 anos em uma empresa e quero saber quantos dias de férias tenho direito este ano."
```text

**Resultado esperado:** IA responde diretamente e classifica como `resolved_by_ai`

### Caso Complexo (Encaminhado para Advogado)

```text
"Olá! Estou passando por uma situação complicada no trabalho. Fui demitido sem justa causa após 5 anos de empresa, mas eles não estão pagando minhas verbas rescisórias completas. Além disso, acredito que sofri assédio moral durante esse período. Preciso de ajuda jurídica urgente para um processo trabalhista."
```text

**Resultado esperado:** IA classifica como `assigned_to_lawyer` com especialização em direito trabalhista

## 🐛 Debugging

### Problema: IA não recebe histórico

- Verificar se usuário está autenticado nos logs
- Verificar se `includeHistory: true` está sendo passado
- Verificar se mensagens estão sendo salvas no banco

### Problema: WebSocket não conecta

- Verificar se nginx proxy está rodando: `docker-compose ps`
- Verificar se porta 8080 está acessível: `curl http://localhost:8080`

### Problema: Respostas da IA são genéricas

- Verificar se function calls estão sendo executadas
- Verificar configuração do Gemini API
- Verificar se histórico está sendo passado corretamente

## 📝 Logs Importantes para Verificar

```text
✅ Conectado ao WebSocket
🆔 Conversation ID: [id]
📤 ENVIANDO MENSAGEM: "[mensagem]"
🤖 RESPOSTA DA IA: [resposta completa]
🎯 MODAL DE FEEDBACK SOLICITADO!
```text

## 🔧 Desenvolvimento com Hot Reload

Como o Docker Compose usa volumes, as mudanças no código são aplicadas automaticamente. Após modificar o código:

1. Os logs mostrarão as mudanças
2. Reinicie o teste: `node test-ai-manual.js`

## 📚 Estrutura dos Testes

```text
test-ai-manual.js      # Teste completo dos casos de uso
test-history.js        # Teste específico do histórico
monitor-backend-logs.js # Monitor de logs em tempo real
```text

## 🎯 Próximos Passos

Após validar que os testes funcionam:

1. ✅ Implementar APIs de feedback se necessário
2. ✅ Ajustar prompts da IA se respostas não forem adequadas
3. ✅ Otimizar performance se necessário
4. ✅ Adicionar mais casos de teste edge cases

## 🔧 Desenvolvimento com Hot Reload

Como o Docker Compose usa volumes, as mudanças no código são aplicadas automaticamente. Após modificar o código:

1. Os logs mostrarão as mudanças
2. Reinicie o teste: `node test-ai-manual.js`

## 📚 Estrutura dos Testes

```text
test-ai-manual.js      # Teste completo dos casos de uso
test-history.js        # Teste específico do histórico
monitor-backend-logs.js # Monitor de logs em tempo real
```text

## 🎯 Próximos Passos

Após validar que os testes funcionam:

1. ✅ Implementar APIs de feedback se necessário
2. ✅ Ajustar prompts da IA se respostas não forem adequadas
3. ✅ Otimizar performance se necessário
4. ✅ Adicionar mais casos de teste edge cases
