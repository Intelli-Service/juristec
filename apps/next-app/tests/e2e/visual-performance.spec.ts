import { test, expect } from '@playwright/test';

test.describe('Visual & Performance Tests', () => {
  test('should render without visual regressions', async ({ page }) => {
    await page.goto('/');

    // Wait for all animations to complete
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for animations

    // Take screenshot for visual comparison
    const screenshot = await page.screenshot({ fullPage: true });

    // In CI, this would compare against baseline
    expect(screenshot).toMatchSnapshot('landing-page.png');
  });

  test('should load within performance budget', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const domContentLoaded = Date.now() - startTime;

    await page.waitForLoadState('networkidle');
    const fullyLoaded = Date.now() - startTime;

    // Performance budgets
    expect(domContentLoaded).toBeLessThan(2000); // 2s for DOM content
    expect(fullyLoaded).toBeLessThan(5000); // 5s for full load

    console.log(`DOM Content Loaded: ${domContentLoaded}ms`);
    console.log(`Fully Loaded: ${fullyLoaded}ms`);
  });

  test('should handle slow network gracefully', async ({ page }) => {
    // Simulate slow 3G connection
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      await route.continue();
    });

    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Should still load within reasonable time on slow network
    expect(loadTime).toBeLessThan(10000); // 10s on slow network

    // Content should still be visible
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should maintain layout during window resize', async ({ page }) => {
    await page.goto('/');

    // Test different viewport sizes
    const sizes = [
      { width: 320, height: 568 },   // Mobile
      { width: 768, height: 1024 },  // Tablet
      { width: 1920, height: 1080 }  // Desktop
    ];

    for (const size of sizes) {
      await page.setViewportSize(size);

      // Layout should not break
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('nav')).toBeVisible();

      // No horizontal scroll should be present
      const scrollWidth = await page.evaluate(() => {
        return document.documentElement.scrollWidth - document.documentElement.clientWidth;
      });
      expect(scrollWidth).toBeLessThanOrEqual(20); // Allow small margin
    }
  });
});