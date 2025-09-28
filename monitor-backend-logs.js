#!/usr/bin/env node

/**
 * Monitor de Logs do Backend
 * Mostra logs em tempo real durante os testes de IA
 */

const { spawn } = require('child_process');

console.log('📊 MONITORANDO LOGS DO BACKEND...');
console.log('Pressione Ctrl+C para parar\n');

const dockerLogs = spawn('docker', ['logs', '-f', 'juristec-backend'], {
  stdio: 'inherit'
});

dockerLogs.on('error', (error) => {
  console.error('❌ Erro ao monitorar logs:', error.message);
  console.log('💡 Certifique-se de que o container está rodando: docker-compose ps');
});

process.on('SIGINT', () => {
  console.log('\n🛑 Parando monitoramento de logs...');
  dockerLogs.kill();
  process.exit(0);
});