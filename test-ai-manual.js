#!/usr/bin/env node

/**
 * Script de Teste Manual do Sistema de IA
 * Simula um usuário real enviando mensagens via WebSocket
 * Verifica se o histórico de conversa está sendo passado para a IA
 */

const WebSocket = require('ws');
const http = require('http');
const io = require('socket.io-client');

// Configurações
const WS_URL = 'http://localhost:8080';
const API_URL = 'http://localhost:8080';
const TEST_USER = {
  email: 'test@example.com',
  password: 'test123'
};

// Casos de teste
const TEST_CASES = {
  simple: {
    name: 'Caso Simples - Férias',
    messages: [
      'Olá! Tenho uma dúvida simples: trabalho há 2 anos em uma empresa e quero saber quantos dias de férias tenho direito este ano.'
    ],
    expected: 'resolved_by_ai'
  },
  complex: {
    name: 'Caso Complexo - Demissão',
    messages: [
      'Olá! Estou passando por uma situação complicada no trabalho.',
      'Fui demitido sem justa causa após 5 anos de empresa, mas eles não estão pagando minhas verbas rescisórias completas.',
      'Além disso, acredito que sofri assédio moral durante esse período. Preciso de ajuda jurídica urgente para um processo trabalhista.'
    ],
    expected: 'assigned_to_lawyer'
  }
};

class AITester {
  constructor() {
    this.ws = null;
    this.conversationId = null;
    this.authToken = null;
    this.messages = [];
  }

  async login() {
    console.log('🔐 Fazendo login anônimo...');

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 8080,
        path: '/test/anonymous-login',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            console.log('📄 Resposta do login:', response);

            if (response.success) {
              this.authToken = response.token;
              console.log('✅ Login anônimo realizado com sucesso');
              resolve();
            } else {
              console.log('⚠️  Erro ao fazer parse da resposta, continuando como anônimo...');
              resolve(); // Continua como anônimo
            }
          } catch (error) {
            console.log('⚠️  Erro ao fazer parse da resposta, continuando como anônimo...');
            resolve();
          }
        });
      });

      req.on('error', (error) => {
        console.log('⚠️  Erro no login, continuando como anônimo:', error.message);
        resolve();
      });

      req.end();
    });
  }

  connectWebSocket() {
    return new Promise((resolve, reject) => {
      console.log('🔌 Conectando ao WebSocket...');

      const socketOptions = {
        transports: ['websocket'],
        upgrade: true,
        rememberUpgrade: true,
        timeout: 20000,
        forceNew: true
      };

      if (this.authToken) {
        socketOptions.extraHeaders = {
          'Authorization': `Bearer ${this.authToken}`
        };
      }

      this.ws = io('http://localhost:8080', socketOptions);

      this.ws.on('connect', () => {
        console.log('✅ Conectado ao WebSocket');
        resolve();
      });

      this.ws.on('disconnect', () => {
        console.log('🔌 Conexão WebSocket fechada');
      });

      this.ws.on('connect_error', (error) => {
        console.error('❌ Erro na conexão WebSocket:', error.message);
        reject(error);
      });

      // Eventos específicos da aplicação
      this.ws.on('conversation_started', (data) => {
        this.conversationId = data.conversationId;
        console.log(`🆔 Conversation ID: ${this.conversationId}`);
      });

      this.ws.on('ai_response', (data) => {
        console.log('\n🤖 RESPOSTA DA IA:');
        console.log(data.message || data.content || JSON.stringify(data, null, 2));

        if (data.shouldShowFeedback) {
          console.log('🎯 MODAL DE FEEDBACK SOLICITADO!');
        }
      });

      this.ws.on('conversation_status_updated', (data) => {
        console.log('\n� STATUS DA CONVERSA ATUALIZADO:');
        console.log('Novo status:', data.status);
        console.log('Dados completos:', JSON.stringify(data, null, 2));
      });
    });
  }

  sendMessage(text) {
    return new Promise((resolve) => {
      console.log(`\n📤 ENVIANDO MENSAGEM: "${text}"`);

      this.ws.emit('send-message', {
        text,
        conversationId: this.conversationId
      });

      // Aguardar um pouco para a resposta
      setTimeout(resolve, 3000);
    });
  }

  async testCase(testCase) {
    console.log(`\n🧪 INICIANDO TESTE: ${testCase.name}`);
    console.log('='.repeat(50));

    // Reset da conversa
    this.conversationId = null;
    this.messages = [];

    // Enviar primeira mensagem para iniciar conversa
    await this.sendMessage(testCase.messages[0]);

    // Aguardar resposta inicial
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Enviar mensagens subsequentes se houver
    for (let i = 1; i < testCase.messages.length; i++) {
      await this.sendMessage(testCase.messages[i]);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Aguardar processamento final
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log(`\n✅ TESTE CONCLUÍDO: ${testCase.name}`);
    console.log('Esperado:', testCase.expected);
  }

  async run() {
    try {
      // Fazer login
      await this.login();

      // Conectar ao WebSocket
      await this.connectWebSocket();

      // Executar casos de teste
      for (const [key, testCase] of Object.entries(TEST_CASES)) {
        await this.testCase(testCase);

        // Aguardar entre testes
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Fechar conexão
      this.ws.close();

      console.log('\n🎉 TODOS OS TESTES CONCLUÍDOS!');

    } catch (error) {
      console.error('❌ Erro durante os testes:', error);
    }
  }
}

// Executar testes
if (require.main === module) {
  const tester = new AITester();
  tester.run();
}

module.exports = AITester;