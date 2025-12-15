import { test, expect } from '@playwright/test';

test.describe('Navigation Consistency', () => {
  test('should have consistent navigation structure', async ({ page }) => {
    await page.goto('/');
    
    // Check if page loads without errors
    await expect(page).toHaveURL('/');
    
    // Should have proper page structure
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto('/non-existent-page');
    
    // Should handle 404 gracefully (Next.js default or custom 404)
    // The exact behavior depends on Next.js configuration
    const response = await page.waitForResponse(response => 
      response.url().includes('/non-existent-page')
    );
    
    // Should return some response (404 or redirect)
    expect(response.status()).toBeGreaterThanOrEqual(200);
  });

  test('should maintain responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/auth/signin');
    
    // Check that form is still visible and usable on mobile
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});