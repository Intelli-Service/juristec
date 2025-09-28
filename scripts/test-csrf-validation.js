#!/usr/bin/env node

/**
 * Script de teste para validação de tokens CSRF do NextAuth
 * Testa a viabilidade de usar tokens CSRF para identificação de usuários
 * e carregamento de histórico de mensagens no chat
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Configurações baseadas no NextAuth
const NEXTAUTH_SECRET = 'juristec_auth_key_2025_32bytes_';

// Simulação de dados de teste
const mockMessages = [
  { id: 1, userId: 'csrf_user_123', message: 'Olá, preciso de ajuda jurídica', timestamp: new Date() },
  { id: 2, userId: 'csrf_user_123', message: 'Tenho um problema trabalhista', timestamp: new Date() },
  { id: 3, userId: 'csrf_user_456', message: 'Consulta sobre divórcio', timestamp: new Date() },
];

/**
 * Gera um token CSRF simulado (como o NextAuth faz)
 * Formato: token|hash
 */
function generateCSRFToken() {
  // Gera token aleatório de 32 bytes (como NextAuth)
  const token = crypto.randomBytes(32).toString('hex');

  // Cria hash SHA-256 do token + secret (como NextAuth)
  const hash = crypto.createHash('sha256')
    .update(token + NEXTAUTH_SECRET)
    .digest('hex');

  return `${token}|${hash}`;
}

/**
 * Valida um token CSRF
 */
function validateCSRFToken(csrfToken) {
  try {
    const [token, providedHash] = csrfToken.split('|');

    if (!token || !providedHash) {
      return { valid: false, error: 'Formato inválido' };
    }

    // Recalcula o hash esperado
    const expectedHash = crypto.createHash('sha256')
      .update(token + NEXTAUTH_SECRET)
      .digest('hex');

    if (providedHash !== expectedHash) {
      return { valid: false, error: 'Hash inválido' };
    }

    return { valid: true, token };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Gera um userId consistente a partir do token CSRF
 * Usa SHA-256 do primeiro token para consistência
 */
function generateUserIdFromCSRF(csrfToken) {
  const validation = validateCSRFToken(csrfToken);
  if (!validation.valid) {
    throw new Error('Token CSRF inválido');
  }

  const [token] = csrfToken.split('|');
  return crypto.createHash('sha256')
    .update(token)
    .digest('hex')
    .substring(0, 16); // 16 caracteres para userId
}

/**
 * Simula busca de mensagens por userId
 */
function getMessagesByUserId(userId) {
  return mockMessages.filter(msg => msg.userId === userId);
}

/**
 * Simula criação de JWT de sessão (para usuários autenticados)
 */
function generateSessionJWT(userData) {
  return jwt.sign({
    userId: userData.id,
    email: userData.email,
    name: userData.name,
    role: userData.role,
    permissions: userData.permissions,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24h
  }, NEXTAUTH_SECRET);
}

/**
 * Valida JWT de sessão
 */
function validateSessionJWT(token) {
  try {
    return jwt.verify(token, NEXTAUTH_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Estratégia principal: determinar userId baseado no tipo de token
 */
function getUserIdFromToken(token, tokenType = 'csrf') {
  if (tokenType === 'session') {
    // Usuário autenticado - usar JWT de sessão
    const sessionData = validateSessionJWT(token);
    if (!sessionData) {
      throw new Error('Token de sessão inválido');
    }
    return sessionData.userId;
  } else {
    // Usuário anônimo - usar CSRF token
    return generateUserIdFromCSRF(token);
  }
}

/**
 * Teste completo do fluxo
 */
async function runTests() {
  console.log('🚀 Iniciando testes de validação de tokens CSRF...\n');

  // Teste 1: Geração e validação de token CSRF
  console.log('📝 Teste 1: Geração e validação de token CSRF');
  const csrfToken = generateCSRFToken();
  console.log(`Token CSRF gerado: ${csrfToken}`);

  const validation = validateCSRFToken(csrfToken);
  console.log(`Validação: ${validation.valid ? '✅ Válido' : '❌ Inválido'}`);
  if (!validation.valid) {
    console.log(`Erro: ${validation.error}`);
  }
  console.log();

  // Teste 2: Geração de userId consistente
  console.log('🔑 Teste 2: Geração de userId consistente');
  try {
    const userId1 = generateUserIdFromCSRF(csrfToken);
    const userId2 = generateUserIdFromCSRF(csrfToken);
    console.log(`UserId 1: ${userId1}`);
    console.log(`UserId 2: ${userId2}`);
    console.log(`Consistente: ${userId1 === userId2 ? '✅ Sim' : '❌ Não'}`);
  } catch (error) {
    console.log(`Erro: ${error.message}`);
  }
  console.log();

  // Teste 3: Busca de mensagens por userId
  console.log('💬 Teste 3: Busca de mensagens por userId');
  try {
    const userId = generateUserIdFromCSRF(csrfToken);
    const messages = getMessagesByUserId(userId);
    console.log(`Mensagens encontradas para userId ${userId}: ${messages.length}`);
    messages.forEach(msg => {
      console.log(`  - ${msg.message}`);
    });
  } catch (error) {
    console.log(`Erro: ${error.message}`);
  }
  console.log();

  // Teste 4: JWT de sessão para usuário autenticado
  console.log('🔐 Teste 4: JWT de sessão para usuário autenticado');
  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    name: 'João Silva',
    role: 'client',
    permissions: ['access_own_chat']
  };

  const sessionToken = generateSessionJWT(mockUser);
  console.log(`JWT de sessão gerado: ${sessionToken.substring(0, 50)}...`);

  const sessionData = validateSessionJWT(sessionToken);
  console.log(`Validação JWT: ${sessionData ? '✅ Válido' : '❌ Inválido'}`);
  if (sessionData) {
    console.log(`UserId da sessão: ${sessionData.userId}`);
    console.log(`Role: ${sessionData.role}`);
  }
  console.log();

  // Teste 5: Estratégia unificada de identificação
  console.log('🎯 Teste 5: Estratégia unificada de identificação');

  // Cenário 1: Usuário anônimo (CSRF)
  try {
    const anonymousUserId = getUserIdFromToken(csrfToken, 'csrf');
    console.log(`UserId anônimo: ${anonymousUserId}`);
  } catch (error) {
    console.log(`Erro anônimo: ${error.message}`);
  }

  // Cenário 2: Usuário autenticado (JWT)
  try {
    const authenticatedUserId = getUserIdFromToken(sessionToken, 'session');
    console.log(`UserId autenticado: ${authenticatedUserId}`);
  } catch (error) {
    console.log(`Erro autenticado: ${error.message}`);
  }
  console.log();

  // Teste 6: Simulação de transição anônimo → autenticado
  console.log('🔄 Teste 6: Transição anônimo → autenticado');
  try {
    // Usuário começa anônimo
    const anonymousId = getUserIdFromToken(csrfToken, 'csrf');
    console.log(`ID anônimo inicial: ${anonymousId}`);

    // Depois faz login
    const authenticatedId = getUserIdFromToken(sessionToken, 'session');
    console.log(`ID após login: ${authenticatedId}`);

    // Sistema precisaria migrar mensagens do anonymousId para authenticatedId
    console.log(`✅ Migração necessária: ${anonymousId} → ${authenticatedId}`);

    // Simulação de migração
    const anonymousMessages = getMessagesByUserId(anonymousId);
    console.log(`Mensagens a migrar: ${anonymousMessages.length}`);

  } catch (error) {
    console.log(`Erro na transição: ${error.message}`);
  }
  console.log();

  console.log('✅ Todos os testes concluídos!');
}

// Executar testes se script for chamado diretamente
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  generateCSRFToken,
  validateCSRFToken,
  generateUserIdFromCSRF,
  generateSessionJWT,
  validateSessionJWT,
  getUserIdFromToken
};