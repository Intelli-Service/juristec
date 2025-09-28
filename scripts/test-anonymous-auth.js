#!/usr/bin/env node

/**
 * Script de teste para o novo sistema de autenticação anônima
 * Testa a criação automática de sessão anônima e conexão WebSocket
 */

const io = require('socket.io-client');

// Configurações
const NEXTAUTH_URL = 'http://localhost:8080';
const WS_URL = 'http://localhost:8080';

/**
 * Simula a criação de um JWT anônimo (como o NextAuth faria)
 */
function createAnonymousJWT() {
  const crypto = require('crypto');
  const jwt = require('jsonwebtoken');

  const NEXTAUTH_SECRET = 'juristec_auth_key_2025_32bytes_';
  const anonymousId = `anon_${crypto.randomBytes(16).toString('hex')}`;

  const payload = {
    userId: anonymousId,
    email: `${anonymousId}@anonymous.juristec`,
    name: 'Usuário Anônimo',
    role: 'client',
    permissions: ['access_own_chat'],
    isAnonymous: true,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24h
  };

  return jwt.sign(payload, NEXTAUTH_SECRET);
}

/**
 * Testa conexão WebSocket com token anônimo
 */
function testWebSocketConnection() {
  return new Promise((resolve, reject) => {
    console.log('🔌 Testando conexão WebSocket com token anônimo...');

    const token = createAnonymousJWT();
    console.log(`Token JWT gerado: ${token.substring(0, 50)}...`);

    const socket = io(WS_URL, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    let testResults = {
      connected: false,
      joinedRoom: false,
      receivedHistory: false,
      error: null
    };

    socket.on('connect', () => {
      console.log('✅ Conectado ao WebSocket');
      testResults.connected = true;

      // Tentar entrar na sala
      console.log('📨 Enviando join-room...');
      socket.emit('join-room', {});
    });

    socket.on('load-history', (messages) => {
      console.log(`📚 Histórico recebido: ${messages.length} mensagens`);
      testResults.receivedHistory = true;

      // Teste concluído com sucesso
      setTimeout(() => {
        socket.disconnect();
        resolve(testResults);
      }, 1000);
    });

    socket.on('error', (error) => {
      console.log(`❌ Erro recebido:`, error);
      testResults.error = error;
    });

    socket.on('disconnect', () => {
      console.log('🔌 Desconectado do WebSocket');
    });

    // Timeout após 10 segundos
    setTimeout(() => {
      if (!testResults.receivedHistory) {
        console.log('⏰ Timeout - teste incompleto');
        socket.disconnect();
        reject(new Error('Timeout no teste WebSocket'));
      }
    }, 10000);
  });
}

/**
 * Teste completo do fluxo
 */
async function runCompleteTest() {
  console.log('🚀 Iniciando teste do sistema de autenticação anônima...\n');

  try {
    // Teste 1: Geração de JWT anônimo
    console.log('📝 Teste 1: Geração de JWT anônimo');
    const token = createAnonymousJWT();
    console.log(`✅ Token gerado com sucesso`);
    console.log(`📏 Tamanho: ${token.length} caracteres`);
    console.log();

    // Teste 2: Conexão WebSocket
    console.log('🔌 Teste 2: Conexão WebSocket');
    const results = await testWebSocketConnection();

    console.log('\n📊 Resultados do teste:');
    console.log(`✅ Conectado: ${results.connected}`);
    console.log(`✅ Entrou na sala: ${results.joinedRoom}`);
    console.log(`✅ Histórico carregado: ${results.receivedHistory}`);

    if (results.error) {
      console.log(`❌ Erro: ${results.error.message}`);
    }

    if (results.connected && results.receivedHistory) {
      console.log('\n🎉 TESTE APROVADO - Sistema funcionando corretamente!');
    } else {
      console.log('\n❌ TESTE FALHADO - Verificar implementação');
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

// Executar teste se script for chamado diretamente
if (require.main === module) {
  runCompleteTest().catch(console.error);
}

module.exports = {
  createAnonymousJWT,
  testWebSocketConnection
};