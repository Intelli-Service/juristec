import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('should pass accessibility audit on landing page', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Log violations for debugging
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Accessibility violations found:');
      accessibilityScanResults.violations.forEach(violation => {
        console.log(`- ${violation.id}: ${violation.description}`);
        console.log(`  Impact: ${violation.impact}`);
        console.log(`  Elements: ${violation.nodes.length}`);
      });
    }

    // Should have no critical accessibility violations
    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations).toHaveLength(0);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');

    // Start from the beginning
    await page.keyboard.press('Tab');

    // First focusable element should be visible
    const firstFocusable = page.locator(':focus-visible').first();
    await expect(firstFocusable).toBeVisible();

    // Navigate through key elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to reach main navigation
    const focusedElement = page.locator(':focus-visible');
    await expect(focusedElement).toBeVisible();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/chat');

    // Chat input should have proper label
    const chatInput = page.locator('[data-testid="chat-input"]');
    const ariaLabel = await chatInput.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();

    // Buttons should have accessible names
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const accessibleName = await button.getAttribute('aria-label') ||
                           await button.textContent();
      expect(accessibleName?.trim()).toBeTruthy();
    }
  });
});