import { test, expect } from '@playwright/test';

test.describe('Advanced Frontend Tests', () => {
  test('should animate elements smoothly on scroll', async ({ page }) => {
    await page.goto('/');

    // Wait for animations to load
    await page.waitForLoadState('networkidle');

    // Check fade-in animation on hero section
    const heroTitle = page.locator('h1').first();
    await expect(heroTitle).toBeVisible();

    // Scroll to trigger animations
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(1000);

    // Check if benefits section animated in
    const benefitsSection = page.locator('[id="beneficios"]');
    await expect(benefitsSection).toBeVisible();

    // Verify animation classes are applied
    await expect(benefitsSection).toHaveClass(/animate-fade-in/);
  });

  test('should handle real user interactions in chat', async ({ page }) => {
    await page.goto('/chat');

    // Simulate real user typing with delays
    const input = page.locator('[data-testid="chat-input"]');

    await input.click();
    await page.keyboard.type('Olá, preciso de ajuda com', { delay: 100 });
    await page.keyboard.press('Enter');

    // Wait for AI response
    await page.waitForTimeout(2000);

    // Check if response appears
    const messages = page.locator('[data-testid="message"]');
    await expect(messages).toHaveCount(2); // User message + AI response

    // Test file upload interaction
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles('./test-files/document.pdf');
      await expect(page.locator(':text("document.pdf")')).toBeVisible();
    }
  });

  test('should maintain responsive design across devices', async ({ page }) => {
    await page.goto('/');

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('nav')).toHaveClass(/mobile-menu/);

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('nav')).toHaveClass(/tablet-menu/);

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('nav')).toHaveClass(/desktop-menu/);
  });

  test('should handle network failures gracefully', async ({ page }) => {
    await page.goto('/chat');

    // Intercept network requests and simulate failure
    await page.route('**/api/chat/**', route => route.abort());

    const input = page.locator('[data-testid="chat-input"]');
    await input.fill('Test message');
    await input.press('Enter');

    // Should show error message to user
    await expect(page.locator(':text("Erro de conexão")')).toBeVisible({ timeout: 5000 });
  });
});