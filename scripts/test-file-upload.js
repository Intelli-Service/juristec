#!/usr/bin/env node

/**
 * Script para testar upload de arquivos
 */

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// Configurações
const API_URL = 'http://localhost:8080/api';
const NEXTAUTH_SECRET = 'juristec_auth_key_2025_32bytes_';

/**
 * Cria um JWT anônimo válido
 */
function createAnonymousJWT() {
  const crypto = require('crypto');
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
 * Testa upload de arquivo
 */
async function testFileUpload() {
  console.log('\n📁 Teste: Upload de arquivo');

  const token = createAnonymousJWT();
  console.log(`📝 Token JWT gerado: ${token.substring(0, 50)}...`);

  // Usar arquivo de teste existente
  const testFilePath = path.join(__dirname, '..', 'test-files', 'contrato-trabalho.txt');

  if (!fs.existsSync(testFilePath)) {
    console.error('❌ Arquivo de teste não encontrado:', testFilePath);
    return;
  }

  const fileBuffer = fs.readFileSync(testFilePath);
  const fileName = 'contrato-trabalho.txt';

  console.log(`📎 Fazendo upload do arquivo: ${fileName} (${fileBuffer.length} bytes)`);

  try {
    // Criar FormData
    const FormData = require('form-data');
    const form = new FormData();

    form.append('file', fileBuffer, {
      filename: fileName,
      contentType: 'text/plain'
    });
    form.append('conversationId', 'test-conversation-123');

const fetch = require('node-fetch');
    const response = await fetch(`${API_URL}/uploads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      },
      body: form
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Upload bem-sucedido!');
      console.log('📄 Resposta:', JSON.stringify(result, null, 2));
    } else {
      console.error('❌ Upload falhou:', response.status, result);
    }

  } catch (error) {
    console.error('❌ Erro no upload:', error.message);
  }
}

// Executar teste
testFileUpload().catch(console.error);