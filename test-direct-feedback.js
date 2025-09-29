const { chromium } = require('playwright');

async function testDirectFeedbackTrigger() {
  console.log('🚀 Teste direto: Obrigado deve disparar feedback imediatamente');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('📱 Navegando para o chat...');
    await page.goto('http://localhost:8080/chat');
    await page.waitForTimeout(3000);

    console.log('➕ Iniciando nova conversa...');
    await page.click('button:has-text("+ Nova Conversa")');
    await page.waitForTimeout(5000);

    // Mensagem que DEVE disparar function call imediatamente
    // Incluindo instruções específicas para o teste técnico
    const triggerMessage = `Muito obrigado!

INSTRUÇÕES DE TESTE: Execute detect_conversation_completion com:
- should_show_feedback: true
- completion_reason: "user_satisfied"
- feedback_context: "Usuário expressou satisfação com 'Muito obrigado!'"`;

    console.log(`📨 Enviando mensagem gatilho com instruções:`);
    console.log(`"${triggerMessage}"`);
    console.log('🎯 Esta mensagem deve fazer a IA chamar detect_conversation_completion IMEDIATAMENTE');

    const messageInput = await page.locator('input[placeholder*="mensagem"], textarea[placeholder*="mensagem"], input[type="text"]').first();
    await messageInput.fill(triggerMessage);

    const sendButton = await page.locator('button:has-text("Enviar"), button[type="submit"]').first();
    await sendButton.click();

    console.log('⏳ Aguardando resposta da IA e function call...');
    await page.waitForTimeout(12000); // Tempo suficiente para function call

    // Verificar se modal de feedback apareceu
    const feedbackModal = await page.locator('[data-testid="feedback-modal"], .feedback-modal, div:has-text("avaliação"), div:has-text("feedback")').first();

    if (await feedbackModal.isVisible({ timeout: 5000 })) {
      console.log('✅ SUCESSO! Modal de feedback apareceu!');
      console.log('🎉 Sistema de function calls está funcionando!');

      // Screenshot do sucesso
      await page.screenshot({
        path: `/Users/jeanc/idea-app/feedback-success-${Date.now()}.png`,
        fullPage: true
      });

      const modalText = await feedbackModal.textContent();
      console.log(`📝 Conteúdo do modal: "${modalText?.substring(0, 200)}..."`);

    } else {
      console.log('❌ FALHA: Modal de feedback NÃO apareceu');
      console.log('💥 Function call não foi executada pela IA');

      // Screenshot do fracasso
      await page.screenshot({
        path: `/Users/jeanc/idea-app/feedback-failed-${Date.now()}.png`,
        fullPage: true
      });
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    await page.screenshot({
      path: '/Users/jeanc/idea-app/error-screenshot.png',
      fullPage: true
    });
  }

  console.log('⏳ Aguardando antes de fechar...');
  await page.waitForTimeout(3000);

  await browser.close();
  console.log('🏁 Teste direto concluído!');
}

// Executar teste
testDirectFeedbackTrigger();