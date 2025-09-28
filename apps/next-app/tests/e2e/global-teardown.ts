// Teardown global executado após todos os testes
async function globalTeardown() {
  console.log('🧹 Limpando ambiente de testes E2E...');

  // Aqui você pode adicionar limpeza específica se necessário
  // Por exemplo: limpar dados de teste, fechar conexões, etc.

  console.log('✅ Teardown global concluído');
}

export default globalTeardown;