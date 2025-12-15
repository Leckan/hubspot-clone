import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display sign in page correctly', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Check page title and form elements
    await expect(page.locator('[data-slot="card-title"]')).toContainText('Sign in');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('a[href="/auth/register"]')).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Fill form with invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('should redirect to register page', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Click register link
    await page.click('a[href="/auth/register"]');
    
    // Should navigate to register page
    await expect(page).toHaveURL('/auth/register');
    await expect(page.locator('[data-slot="card-title"]')).toContainText('Create account');
  });
});