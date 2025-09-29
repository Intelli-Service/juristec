const { chromium } = require('playwright');

async function testMultipleFeedbackScenarios() {
  console.log('🚀 Testando múltiplos cenários de feedback...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 800 
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Cenários de teste
  const scenarios = [
    {
      name: 'Resolução Completa',
      message: 'Perfeito! Você resolveu completamente minha dúvida jurídica.',
      expectedStatus: 'resolved_by_ai'
    },
    {
      name: 'Caso Complexo',
      message: 'Este caso é muito complexo, preciso de um advogado especialista.',
      expectedStatus: 'assigned_to_lawyer'
    },
    {
      name: 'Satisfação com Atendimento',
      message: 'Muito obrigado, estou completamente satisfeito com o atendimento!',
      expectedStatus: 'user_satisfied'
    },
    {
      name: 'Agradecer e Finalizar',
      message: 'Obrigado! Isso esclareceu tudo, minha dúvida foi resolvida.',
      expectedStatus: 'resolved_by_ai'
    }
  ];
  
  try {
    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      console.log(`\n📋 CENÁRIO ${i + 1}: ${scenario.name}`);
      
      // Navegar para o chat
      console.log('📱 Navegando para o chat...');
      await page.goto('http://localhost:8080/chat');
      await page.waitForTimeout(3000);
      
      // Nova conversa
      console.log('➕ Iniciando nova conversa...');
      await page.click('button:has-text("+ Nova Conversa")');
      await page.waitForTimeout(5000);
      
      // Enviar mensagem
      console.log(`📨 Enviando: "${scenario.message}"`);
      const messageInput = await page.locator('input[placeholder*="mensagem"], textarea[placeholder*="mensagem"], input[type="text"]').first();
      await messageInput.fill(scenario.message);
      
      const sendButton = await page.locator('button:has-text("Enviar"), button[type="submit"]').first();
      await sendButton.click();
      
      console.log('⏳ Aguardando resposta da IA...');
      await page.waitForTimeout(8000);
      
      // Verificar feedback modal
      const feedbackModal = await page.locator('[data-testid="feedback-modal"], .feedback-modal, div:has-text("avaliação"), div:has-text("feedback")').first();
      
      if (await feedbackModal.isVisible({ timeout: 5000 })) {
        console.log(`✅ SUCESSO! Modal de feedback apareceu para "${scenario.name}"`);
        
        // Screenshot do cenário
        await page.screenshot({ 
          path: `/Users/jeanc/idea-app/feedback-scenario-${i + 1}-${scenario.name.replace(/\s+/g, '-').toLowerCase()}.png`,
          fullPage: true 
        });
        
        // Verificar conteúdo do modal (se possível)
        const modalText = await feedbackModal.textContent();
        console.log(`📝 Conteúdo do modal: "${modalText?.substring(0, 100)}..."`);
        
        // Fechar modal para próximo teste
        const closeButton = await page.locator('button:has-text("Fechar"), button:has-text("×"), [aria-label="Fechar"]').first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
          console.log('❌ Modal fechado');
        }
        
      } else {
        console.log(`❌ FALHA! Modal de feedback NÃO apareceu para "${scenario.name}"`);
        
        // Screenshot para debug
        await page.screenshot({ 
          path: `/Users/jeanc/idea-app/feedback-fail-${i + 1}.png`,
          fullPage: true 
        });
      }
      
      console.log('⏳ Aguardando antes do próximo teste...');
      await page.waitForTimeout(2000);
    }
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    await page.screenshot({ 
      path: '/Users/jeanc/idea-app/feedback-error.png',
      fullPage: true 
    });
  }
  
  await browser.close();
  console.log('\n🏁 Todos os testes concluídos!');
}

// Executar testes
testMultipleFeedbackScenarios();