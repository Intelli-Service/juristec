const { chromium } = require('playwright');

async function testRealisticConversationWithFeedback() {
  console.log('🚀 Testando conversa realista com feedback...');

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

    // Simular conversa realista
    const conversationSteps = [
      {
        message: "Olá! Tenho uma dúvida sobre contrato de trabalho.",
        description: "Saudação inicial e apresentação do problema"
      },
      {
        message: "Assinei um contrato de trabalho mas agora quero sair da empresa. Tenho que cumprir aviso prévio?",
        description: "Explicação detalhada do problema"
      },
      {
        message: "O contrato diz que o aviso prévio é de 30 dias. Mas estou grávida e a empresa tem condições de trabalho ruins.",
        description: "Mais detalhes sobre a situação"
      },
      {
        message: "Entendi. Mas e se eu estiver grávida? Existe alguma proteção especial?",
        description: "Pergunta de acompanhamento"
      },
      {
        message: "Perfeito! Você esclareceu completamente minha dúvida sobre o aviso prévio e as proteções para gestantes. Muito obrigada!",
        description: "Expressão de satisfação completa - deve disparar feedback",
        expectFeedback: true
      }
    ];

    for (let i = 0; i < conversationSteps.length; i++) {
      const step = conversationSteps[i];
      console.log(`\n📝 PASSO ${i + 1}: ${step.description}`);
      console.log(`📨 Enviando: "${step.message}"`);

      // Enviar mensagem
      const messageInput = await page.locator('input[placeholder*="mensagem"], textarea[placeholder*="mensagem"], input[type="text"]').first();
      await messageInput.fill(step.message);

      const sendButton = await page.locator('button:has-text("Enviar"), button[type="submit"]').first();
      await sendButton.click();

      console.log('⏳ Aguardando resposta da IA...');
      await page.waitForTimeout(10000); // Tempo maior para resposta da IA

      if (step.expectFeedback) {
        console.log('🎯 AGUARDANDO FEEDBACK - Esta mensagem deve disparar detect_conversation_completion...');

        // Aguardar um pouco mais para a function call ser processada
        await page.waitForTimeout(3000);

        // Verificar se modal de feedback apareceu
        const feedbackModal = await page.locator('[data-testid="feedback-modal"], .feedback-modal, div:has-text("avaliação"), div:has-text("feedback")').first();

        if (await feedbackModal.isVisible({ timeout: 5000 })) {
          console.log('✅ SUCESSO! Modal de feedback apareceu!');
          console.log('🎉 Sistema de feedback funcionando corretamente!');

          // Fazer screenshot do modal
          await page.screenshot({
            path: `/Users/jeanc/idea-app/feedback-success-${Date.now()}.png`,
            fullPage: true
          });
          console.log('📸 Screenshot salvo do modal de feedback');

          // Verificar conteúdo do modal
          const modalText = await feedbackModal.textContent();
          console.log(`📝 Conteúdo do modal: "${modalText?.substring(0, 200)}..."`);

          break; // Teste concluído com sucesso
        } else {
          console.log('❌ Modal de feedback NÃO apareceu');

          // Screenshot para debug
          await page.screenshot({
            path: `/Users/jeanc/idea-app/feedback-failed-${Date.now()}.png`,
            fullPage: true
          });
          console.log('📸 Screenshot salvo para análise');
        }
      } else {
        console.log('✅ Resposta da IA recebida, continuando conversa...');
      }
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    await page.screenshot({
      path: '/Users/jeanc/idea-app/error-screenshot.png',
      fullPage: true
    });
  }

  console.log('\n⏳ Aguardando 5 segundos antes de fechar...');
  await page.waitForTimeout(5000);

  await browser.close();
  console.log('🏁 Teste de conversa realista concluído!');
}

// Executar teste
testRealisticConversationWithFeedback();