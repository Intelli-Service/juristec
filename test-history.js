#!/usr/bin/env node

/**
 * Teste Específico do Histórico de Conversa
 * Verifica se a IA está recebendo o contexto completo da conversa
 */

const WebSocket = require('ws');

// Configurações
const WS_URL = 'ws://localhost:8080';

class HistoryTester {
  constructor() {
    this.ws = null;
    this.conversationId = null;
  }

  connectWebSocket() {
    return new Promise((resolve, reject) => {
      console.log('🔌 Conectando ao WebSocket (modo anônimo)...');

      this.ws = new WebSocket(WS_URL);

      this.ws.on('open', () => {
        console.log('✅ Conectado ao WebSocket');
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.log('📨 Mensagem recebida (não-JSON):', data.toString());
        }
      });

      this.ws.on('error', (error) => {
        console.error('❌ Erro no WebSocket:', error.message);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('🔌 Conexão WebSocket fechada');
      });
    });
  }

  handleMessage(message) {
    console.log('\n📨 MENSAGEM RECEBIDA:');
    console.log('Tipo:', message.type);

    if (message.type === 'conversation_started') {
      this.conversationId = message.data.conversationId;
      console.log(`🆔 Conversation ID: ${this.conversationId}`);
    }

    if (message.type === 'receive-message' && message.data.sender === 'ai') {
      console.log('\n🤖 RESPOSTA DA IA:');
      console.log(message.data.text);
    }

    if (message.type === 'show-feedback-modal') {
      console.log('\n🎯 MODAL DE FEEDBACK SOLICITADO!');
      console.log('Motivo:', message.data.reason);
      console.log('Contexto:', message.data.context);
    }
  }

  sendMessage(text, roomId = 'test-room') {
    return new Promise((resolve) => {
      const message = {
        type: 'send-message',
        data: {
          roomId,
          text
        }
      };

      console.log(`\n📤 ENVIANDO MENSAGEM: "${text}"`);

      this.ws.send(JSON.stringify(message));

      // Aguardar resposta
      setTimeout(resolve, 3000);
    });
  }

  async testConversationHistory() {
    console.log('🧪 TESTANDO HISTÓRICO DE CONVERSA');
    console.log('================================');

    // Sequência de mensagens para testar se a IA lembra do contexto
    const messages = [
      'Olá! Meu nome é João Silva e trabalho há 3 anos na empresa XYZ.',
      'Recentemente descobri que tenho direito a férias, mas não sei quantos dias.',
      'Você pode me explicar melhor sobre as férias proporcionais?',
      'Obrigado pela explicação! Agora entendi perfeitamente.'
    ];

    for (const message of messages) {
      await this.sendMessage(message);
    }

    console.log('\n✅ Teste de histórico concluído!');
    console.log('Verifique nos logs do backend se a IA recebeu todo o contexto da conversa.');
  }

  async run() {
    try {
      await this.connectWebSocket();
      await this.testConversationHistory();
      this.ws.close();
    } catch (error) {
      console.error('❌ Erro durante o teste:', error);
    }
  }
}

// Executar teste
if (require.main === module) {
  const tester = new HistoryTester();
  tester.run();
}

module.exports = HistoryTester;