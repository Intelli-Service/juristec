const { chromium } = require('playwright');

async function testFeedbackSystem() {
  console.log('🚀 Iniciando teste do sistema de feedback...');
  
  // Iniciar navegador
  const browser = await chromium.launch({ 
    headless: false, // Modo visual para debug
    slowMo: 1000 // Delay entre ações
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('📱 Navegando para o chat...');
    await page.goto('http://localhost:8080/chat');
    
    console.log('⏳ Aguardando carregamento da página...');
    await page.waitForTimeout(3000);
    
    console.log('➕ Clicando em "Nova Conversa"...');
    await page.click('button:has-text("+ Nova Conversa")');
    
    console.log('⏳ Aguardando interface de chat carregar...');
    await page.waitForTimeout(5000);
    
    // Procurar por input de mensagem
    console.log('📝 Procurando campo de entrada de mensagem...');
    const messageInput = await page.locator('input[placeholder*="mensagem"], textarea[placeholder*="mensagem"], input[type="text"]').first();
    
    if (await messageInput.isVisible()) {
      console.log('✅ Campo de mensagem encontrado!');
      
      // Testar mensagem que deve disparar feedback
      const testMessage = "Obrigado! Isso esclareceu tudo, minha dúvida foi resolvida completamente.";
      
      console.log('📨 Enviando mensagem de teste:', testMessage);
      await messageInput.fill(testMessage);
      
      // Procurar botão de enviar
      const sendButton = await page.locator('button:has-text("Enviar"), button[type="submit"], button:has([data-testid="send"])').first();
      
      if (await sendButton.isVisible()) {
        await sendButton.click();
        console.log('✅ Mensagem enviada!');
        
        console.log('⏳ Aguardando resposta da IA e possível feedback...');
        await page.waitForTimeout(10000);
        
        // Verificar se modal de feedback apareceu
        const feedbackModal = await page.locator('[data-testid="feedback-modal"], .feedback-modal, div:has-text("avaliação"), div:has-text("feedback")').first();
        
        if (await feedbackModal.isVisible({ timeout: 5000 })) {
          console.log('🎯 ✅ SUCESSO! Modal de feedback apareceu!');
          
          // Fazer screenshot do modal
          await page.screenshot({ 
            path: '/Users/jeanc/idea-app/feedback-modal-screenshot.png',
            fullPage: true 
          });
          console.log('📸 Screenshot salvo: feedback-modal-screenshot.png');
          
        } else {
          console.log('❌ Modal de feedback NÃO apareceu');
          
          // Fazer screenshot da página atual para debug
          await page.screenshot({ 
            path: '/Users/jeanc/idea-app/no-feedback-debug.png',
            fullPage: true 
          });
          console.log('📸 Screenshot de debug salvo: no-feedback-debug.png');
        }
        
      } else {
        console.log('❌ Botão de enviar não encontrado');
      }
      
    } else {
      console.log('❌ Campo de entrada de mensagem não encontrado');
      
      // Listar todos os elementos visíveis para debug
      const elements = await page.locator('input, textarea, button').all();
      console.log('🔍 Elementos encontrados na página:');
      for (let element of elements) {
        const tagName = await element.evaluate(el => el.tagName);
        const placeholder = await element.getAttribute('placeholder') || '';
        const text = await element.textContent() || '';
        console.log(`  - ${tagName}: placeholder="${placeholder}", text="${text.substring(0, 50)}"`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    
    // Screenshot de erro
    await page.screenshot({ 
      path: '/Users/jeanc/idea-app/error-screenshot.png',
      fullPage: true 
    });
    console.log('📸 Screenshot de erro salvo: error-screenshot.png');
  }
  
  console.log('⏳ Aguardando 5 segundos antes de fechar...');
  await page.waitForTimeout(5000);
  
  await browser.close();
  console.log('🏁 Teste concluído!');
}

// Verificar se playwright está disponível
try {
  testFeedbackSystem();
} catch (error) {
  console.error('❌ Erro: Playwright não está instalado. Instale com: npm install playwright');
  console.error('Erro completo:', error);
}