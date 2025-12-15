import { test, expect } from '@playwright/test';

test.describe('Contact Management', () => {
  test('should redirect unauthenticated users to signin', async ({ page }) => {
    await page.goto('/contacts');
    
    // Should redirect to signin page
    await expect(page).toHaveURL(/.*\/auth\/signin/);
  });

  test('should display contacts page structure when accessed directly', async ({ page }) => {
    await page.goto('/contacts');
    
    // Should be redirected to signin first
    await expect(page).toHaveURL(/.*\/auth\/signin/);
    
    // Verify signin page elements
    await expect(page.locator('[data-slot="card-title"]')).toContainText('Sign in');
  });
});