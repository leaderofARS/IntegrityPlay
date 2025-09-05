import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// Minimal smoke covering: Run Demo -> Alerts list -> Alert detail
// Assumes docker compose is running backend + frontend.
test('demo flow: run -> list -> detail', async ({ page }) => {
  await page.goto(BASE_URL);
  await page.getByRole('button', { name: 'Run Demo' }).click();
  // Navigate to alerts
  await page.goto(`${BASE_URL}/alerts`);
  // Wait for at least one alert row to show
  await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 30000 });
  const firstAlert = page.locator('table tbody tr').first();
  const idText = await firstAlert.locator('td').first().innerText();
  await firstAlert.click();
  // We should be on detail page
  await expect(page.locator('h1')).toContainText('Alert');
});

