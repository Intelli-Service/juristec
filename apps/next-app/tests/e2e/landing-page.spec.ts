import { test, expect } from '@playwright/test';

test.describe('Landing Page E2E Tests', () => {
  test('should load the landing page successfully', async ({ page }) => {
    await page.goto('/');

    // Check if the page loads without errors
    await expect(page).toHaveTitle(/Juristec/);
    
    // Check for main elements
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should navigate to chat page', async ({ page }) => {
    await page.goto('/');

    // Look for chat button or link
    const chatButton = page.locator('a[href="/chat"], button:has-text("Chat"), a:has-text("Começar")').first();
    
    if (await chatButton.isVisible()) {
      await chatButton.click();
      
      // Should navigate to chat page
      await expect(page).toHaveURL(/.*\/chat.*/);
      
      // Check if chat interface elements are present
      await expect(page.locator('input[type="text"], textarea').first()).toBeVisible({ timeout: 10000 });
    } else {
      console.log('Chat button not found on landing page - skipping navigation test');
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    await page.goto('/');

    // Page should still be functional on mobile
    await expect(page.locator('h1')).toBeVisible();
    
    // Check if mobile navigation works
    const mobileMenu = page.locator('button[aria-label="Menu"], .mobile-menu-toggle').first();
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      // Mobile menu should be visible after clicking
      await expect(page.locator('.mobile-menu, [role="menu"]').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have proper meta tags for SEO', async ({ page }) => {
    await page.goto('/');

    // Check for essential meta tags
    const metaDescription = page.locator('meta[name="description"]');
    if (await metaDescription.count() > 0) {
      const content = await metaDescription.getAttribute('content');
      expect(content).toBeTruthy();
      expect(content!.length).toBeGreaterThan(10);
    }

    // Check for viewport meta tag
    await expect(page.locator('meta[name="viewport"]')).toHaveCount(1);
  });

  test('should load without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Check for JavaScript errors (allow some common warnings)
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('Warning') && 
      !error.includes('DevTools') &&
      !error.includes('favicon.ico')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('should handle user interaction flows', async ({ page }) => {
    await page.goto('/');

    // Test basic interaction flows
    const interactiveElements = page.locator('button, a[href], input');
    const count = await interactiveElements.count();
    
    expect(count).toBeGreaterThan(0);

    // Test first few interactive elements
    for (let i = 0; i < Math.min(3, count); i++) {
      const element = interactiveElements.nth(i);
      if (await element.isVisible()) {
        await expect(element).toBeEnabled();
      }
    }
  });
});