import { chromium } from '@playwright/test';

// Setup global executado antes de todos os testes
async function globalSetup() {
  console.log('🚀 Configurando ambiente de testes E2E...');

  // Simples verificação - apenas log, sem lançar browser
  // O browser será lançado nos testes individuais
  console.log('✅ Setup global concluído - browser será lançado nos testes');
}

export default globalSetup;