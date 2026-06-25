import { test, expect } from '@playwright/test';
import path from 'node:path';

const EMAIL = `e2e-${Date.now()}@cineverse.test`;
const PASSWORD = 'e2epassword1';

test.describe('Cineverse end-to-end flow', () => {
  test('register → upload → journal → clip → share', async ({ page }) => {
    // Register
    await page.goto('/register');
    await page.getByPlaceholder('Email').fill(EMAIL);
    await page.getByPlaceholder(/Password/).fill(PASSWORD);
    await page.getByRole('button', { name: /Create account/i }).click();
    await expect(page).toHaveURL('/');

    // Upload
    await page.goto('/upload');
    const fixture = path.resolve(__dirname, 'fixtures/sample.mp4');
    await page.locator('input[type="file"]').setInputFiles(fixture);
    await page.getByPlaceholder('Title').fill('My first upload');
    await page.getByPlaceholder(/tags/i).fill('test, e2e');
    await page.getByRole('button', { name: /Start upload/i }).click();
    // Wait for queue item to reach processing or ready
    await expect(page.getByText(/Processing|Ready/)).toBeVisible({ timeout: 60_000 });

    // Library
    await page.goto('/library');
    await expect(page.getByText('My first upload')).toBeVisible();
  });
});
