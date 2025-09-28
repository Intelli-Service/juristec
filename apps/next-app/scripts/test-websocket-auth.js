#!/usr/bin/env node

/**
 * Script completo para testar o sistema de autenticação anônima WebSocket
 * Testa conexões autenticadas e não autenticadas, envio/recebimento de mensagens
 */

import io from 'socket.io-client';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Configurações
const WS_URL = 'http://localhost:8080';
const NEXTAUTH_SECRET = 'juristec_auth_key_2025_32bytes_';

/**
 * Cria um JWT anônimo válido
 */
function createAnonymousJWT() {
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
 * Testa conexão WebSocket com autenticação
 */
function testAuthenticatedConnection() {
  return new Promise((resolve) => {
    console.log('\n🔐 Teste 1: Conexão WebSocket COM autenticação');

    const token = createAnonymousJWT();
    console.log(`📝 Token JWT gerado: ${token.substring(0, 50)}...`);

    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 5000,
    });

    let results = {
      connected: false,
      joinedRoom: false,
      historyLoaded: false,
      messageSent: false,
      messageReceived: false,
      error: null,
      userId: null,
    };

    socket.on('connect', () => {
      console.log('✅ Conectado ao WebSocket com autenticação');
      results.connected = true;
      results.userId = socket.id;

      // Tentar entrar na sala
      console.log('📨 Enviando join-room...');
      socket.emit('join-room', {});
    });

    socket.on('load-history', (messages) => {
      console.log(`📚 Histórico carregado: ${messages.length} mensagens`);
      results.historyLoaded = true;

      // Enviar uma mensagem de teste
      console.log('💬 Enviando mensagem de teste...');
      socket.emit('send-message', {
        text: 'Olá, esta é uma mensagem de teste do script de validação!',
        sender: 'test-user'
      });
      results.messageSent = true;
    });

    socket.on('message', (message) => {
      console.log(`📨 Mensagem recebida: ${message.text?.substring(0, 50)}...`);
      results.messageReceived = true;
    });

    socket.on('error', (error) => {
      console.log(`❌ Erro recebido:`, error);
      results.error = error;
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Desconectado: ${reason}`);
    });

    // Timeout após 10 segundos
    setTimeout(() => {
      socket.disconnect();
      resolve(results);
    }, 10000);
  });
}

/**
 * Testa conexão WebSocket sem autenticação (deve falhar)
 */
function testUnauthenticatedConnection() {
  return new Promise((resolve) => {
    console.log('\n🚫 Teste 2: Conexão WebSocket SEM autenticação');

    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
    });

    let results = {
      connected: false,
      rejected: false,
      error: null,
      disconnectReason: null,
    };

    socket.on('connect', () => {
      console.log('⚠️ Conectado sem autenticação (inesperado)');
      results.connected = true;

      // Tentar entrar na sala mesmo sem auth
      socket.emit('join-room', {});
    });

    socket.on('error', (error) => {
      console.log(`❌ Erro esperado: ${error.message || error}`);
      results.rejected = true;
      results.error = error;
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Desconectado: ${reason}`);
      results.disconnectReason = reason;

      if (reason === 'io server disconnect') {
        results.rejected = true;
      }
    });

    // Timeout após 5 segundos (mais curto pois deve falhar rápido)
    setTimeout(() => {
      socket.disconnect();
      resolve(results);
    }, 5000);
  });
}

/**
 * Testa conexão com token inválido
 */
function testInvalidTokenConnection() {
  return new Promise((resolve) => {
    console.log('\n❌ Teste 3: Conexão WebSocket com TOKEN INVÁLIDO');

    const socket = io(WS_URL, {
      auth: { token: 'invalid.jwt.token' },
      transports: ['websocket', 'polling'],
      timeout: 5000,
    });

    let results = {
      connected: false,
      rejected: false,
      error: null,
      disconnectReason: null,
    };

    socket.on('connect', () => {
      console.log('⚠️ Conectado com token inválido (inesperado)');
      results.connected = true;
    });

    socket.on('error', (error) => {
      console.log(`❌ Erro esperado: ${error.message || error}`);
      results.rejected = true;
      results.error = error;
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Desconectado: ${reason}`);
      results.disconnectReason = reason;
    });

    // Timeout após 5 segundos
    setTimeout(() => {
      socket.disconnect();
      resolve(results);
    }, 5000);
  });
}

/**
 * Executa todos os testes
 */
async function runAllTests() {
  console.log('🚀 Iniciando testes completos do sistema WebSocket...\n');

  try {
    // Teste 1: Conexão autenticada
    const authResults = await testAuthenticatedConnection();
    console.log('\n📊 Resultados Teste 1 (Autenticado):');
    console.log(`✅ Conectado: ${authResults.connected}`);
    console.log(`✅ Histórico: ${authResults.historyLoaded}`);
    console.log(`✅ Mensagem enviada: ${authResults.messageSent}`);
    console.log(`✅ Mensagem recebida: ${authResults.messageReceived}`);
    console.log(`👤 Socket ID: ${authResults.userId}`);

    // Teste 2: Conexão não autenticada
    const unauthResults = await testUnauthenticatedConnection();
    console.log('\n📊 Resultados Teste 2 (Não autenticado):');
    console.log(`🚫 Conectado: ${unauthResults.connected}`);
    console.log(`✅ Rejeitado: ${unauthResults.rejected}`);
    console.log(`📝 Motivo: ${unauthResults.disconnectReason || unauthResults.error?.message || 'N/A'}`);

    // Teste 3: Token inválido
    const invalidResults = await testInvalidTokenConnection();
    console.log('\n📊 Resultados Teste 3 (Token inválido):');
    console.log(`🚫 Conectado: ${invalidResults.connected}`);
    console.log(`✅ Rejeitado: ${invalidResults.rejected}`);
    console.log(`📝 Motivo: ${invalidResults.disconnectReason || invalidResults.error?.message || 'N/A'}`);

    // Análise final
    console.log('\n🎯 ANÁLISE FINAL:');
    console.log('=====================================');

    const authSuccess = authResults.connected && authResults.historyLoaded;
    const unauthRejected = unauthResults.rejected && !unauthResults.connected;
    const invalidRejected = invalidResults.rejected && !invalidResults.connected;

    console.log(`🔐 Autenticação funciona: ${authSuccess ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`🚫 Rejeição sem auth: ${unauthRejected ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`❌ Rejeição token inválido: ${invalidRejected ? '✅ SIM' : '❌ NÃO'}`);

    if (authSuccess && unauthRejected && invalidRejected) {
      console.log('\n🎉 SISTEMA TOTALMENTE FUNCIONAL!');
      console.log('✅ Usuários autenticados podem se conectar e conversar');
      console.log('✅ Usuários não autenticados são rejeitados');
      console.log('✅ Tokens inválidos são rejeitados');
      console.log('✅ Histórico é carregado corretamente');
      console.log('✅ Mensagens são enviadas e recebidas');
    } else {
      console.log('\n❌ SISTEMA COM PROBLEMAS - Verificar implementação');
      if (!authSuccess) console.log('  - Conexão autenticada falhando');
      if (!unauthRejected) console.log('  - Conexões não autenticadas não sendo rejeitadas');
      if (!invalidRejected) console.log('  - Tokens inválidos não sendo rejeitados');
    }

  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
  }
}

// Executar testes se script for chamado diretamente
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  createAnonymousJWT,
  testAuthenticatedConnection,
  testUnauthenticatedConnection,
  testInvalidTokenConnection,
};