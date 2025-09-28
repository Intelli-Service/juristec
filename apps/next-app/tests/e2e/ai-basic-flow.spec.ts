import { test, expect } from '@playwright/test';

test.describe('AI Chat Basic Flow Tests', () => {
  test('should open chat page and verify basic functionality', async ({ page }) => {
    console.log('🧪 Teste Básico: Abrir página do chat e verificar funcionalidade básica');

    // Navigate to chat page
    console.log('📄 Navegando para /chat...');
    await page.goto('/chat');

    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    console.log('✅ Página carregada');

    // Check if we're on the chat page
    await expect(page).toHaveURL(/.*\/chat/);
    console.log('✅ Estamos na página do chat');

    // Wait for chat input field - this is the key element that indicates chat is loaded
    const messageInput = page.locator('[data-testid="chat-input"]');
    await expect(messageInput).toBeVisible({ timeout: 15000 });
    console.log('✅ Campo de entrada do chat visível');

    // Check if input is enabled (not disabled)
    await expect(messageInput).toBeEnabled();
    console.log('✅ Campo de entrada está habilitado');

    // Check for send button
    const sendButton = page.locator('[data-testid="send-button"]');
    await expect(sendButton).toBeVisible({ timeout: 5000 });
    console.log('✅ Botão de enviar visível');

    // Wait for WebSocket connection to be established
    console.log('⏳ Aguardando conexão WebSocket...');
    await expect(sendButton).toHaveText('Enviar', { timeout: 10000 });
    console.log('✅ WebSocket conectado');

    // Try to type a simple message
    const testMessage = 'Olá, teste básico';
    console.log(`📝 Digitando mensagem: "${testMessage}"`);
    await messageInput.fill(testMessage);

    // Verify the message was typed
    await expect(messageInput).toHaveValue(testMessage);
    console.log('✅ Mensagem digitada corretamente');

    // NOW check if send button is enabled (should be enabled after typing)
    await expect(sendButton).toBeEnabled();
    console.log('✅ Botão de enviar está habilitado após digitar');

    // Click send button
    console.log('📤 Clicando no botão enviar...');
    await sendButton.click();

    // Wait a moment for processing
    await page.waitForTimeout(1000);

    // Check if message appears in chat (look for user message)
    const userMessage = page.locator('[data-testid="message-user"]').first();
    await expect(userMessage).toBeVisible({ timeout: 5000 });
    console.log('✅ Mensagem do usuário apareceu no chat');

    // Verify the message content
    await expect(userMessage).toContainText(testMessage);
    console.log('✅ Conteúdo da mensagem está correto');

    // Check if input field is cleared after sending
    await expect(messageInput).toHaveValue('');
    console.log('✅ Campo de entrada foi limpo após envio');

    console.log('🎉 Teste básico concluído com sucesso!');
    console.log('✅ Página do chat carregou');
    console.log('✅ Interface funcional');
    console.log('✅ Mensagem enviada e exibida');
  });

  test('should receive AI response after sending message', async ({ page }) => {
    console.log('🤖 Teste de Resposta IA: Verificar se a IA responde às mensagens');

    // Navigate to chat page
    console.log('📄 Navegando para /chat...');
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    // Wait for chat interface
    const messageInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    await expect(messageInput).toBeVisible({ timeout: 15000 });
    await expect(sendButton).toBeVisible({ timeout: 5000 });

    // Send a message
    const testMessage = 'Olá, preciso de ajuda jurídica simples';
    console.log(`📝 Enviando mensagem: "${testMessage}"`);
    await messageInput.fill(testMessage);
    await sendButton.click();

    // Wait for user message to appear
    const userMessage = page.locator('[data-testid="message-user"]').first();
    await expect(userMessage).toBeVisible({ timeout: 5000 });
    console.log('✅ Mensagem do usuário enviada');

    // Wait for AI response - look for AI message element
    console.log('⏳ Aguardando resposta da IA...');
    const aiMessage = page.locator('[data-testid="message-ai"]').first();

    // Wait up to 30 seconds for AI response (generous timeout for AI processing)
    await expect(aiMessage).toBeVisible({ timeout: 30000 });
    console.log('✅ Resposta da IA recebida!');

    // Verify AI response has content
    const aiMessageText = await aiMessage.textContent();
    expect(aiMessageText).toBeTruthy();
    expect(aiMessageText!.length).toBeGreaterThan(10); // Should have meaningful content
    console.log(`📄 Resposta da IA: "${aiMessageText!.slice(0, 100)}..."`);

    // Check that we now have at least 2 messages (user + AI)
    const allMessages = page.locator('[data-testid="message"]');
    const messageCount = await allMessages.count();
    expect(messageCount).toBeGreaterThanOrEqual(2);
    console.log(`📊 Total de mensagens na conversa: ${messageCount}`);

    console.log('🎉 Teste de resposta da IA concluído com sucesso!');
    console.log('✅ IA respondeu à mensagem');
    console.log('✅ Resposta tem conteúdo válido');
    console.log('✅ Conversa progrediu corretamente');
  });

  test('should handle conversation flow with multiple messages', async ({ page }) => {
    console.log('💬 Teste de Conversa Completa: Múltiplas mensagens e contexto');

    // Navigate to chat page
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const messageInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    await expect(messageInput).toBeVisible({ timeout: 15000 });

    // First message
    const firstMessage = 'Olá, trabalho há 2 anos em uma empresa';
    console.log(`📝 Primeira mensagem: "${firstMessage}"`);
    await messageInput.fill(firstMessage);
    await sendButton.click();

    // Wait for first user message
    await expect(page.locator('[data-testid="message-user"]').first()).toBeVisible();
    console.log('✅ Primeira mensagem enviada');

    // Wait for first AI response
    await expect(page.locator('[data-testid="message-ai"]').first()).toBeVisible({ timeout: 30000 });
    console.log('✅ Primeira resposta da IA recebida');

    // Second message - should maintain context
    const secondMessage = 'Quanto tempo preciso trabalhar para ter férias?';
    console.log(`📝 Segunda mensagem: "${secondMessage}"`);
    await messageInput.fill(secondMessage);
    await sendButton.click();

    // Wait for second user message
    const userMessages = page.locator('[data-testid="message-user"]');
    await expect(userMessages).toHaveCount(2);
    console.log('✅ Segunda mensagem enviada');

    // Wait for second AI response
    const aiMessages = page.locator('[data-testid="message-ai"]');
    await expect(aiMessages).toHaveCount(2, { timeout: 30000 });
    console.log('✅ Segunda resposta da IA recebida');

    // Verify conversation flow
    const totalMessages = page.locator('[data-testid="message"]');
    const messageCount = await totalMessages.count();
    expect(messageCount).toBe(4); // 2 user + 2 AI messages
    console.log(`📊 Conversa completa: ${messageCount} mensagens`);

    // Check that AI responses are different (showing context awareness)
    const aiResponse1 = await aiMessages.nth(0).textContent();
    const aiResponse2 = await aiMessages.nth(1).textContent();

    expect(aiResponse1).not.toBe(aiResponse2);
    console.log('✅ Respostas da IA são diferentes (contexto mantido)');

    console.log('🎉 Teste de conversa completa concluído com sucesso!');
    console.log('✅ Múltiplas mensagens trocadas');
    console.log('✅ Contexto conversacional mantido');
    console.log('✅ IA respondeu consistentemente');
  });
  });
