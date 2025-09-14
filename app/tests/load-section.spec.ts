import { test, expect } from './fixtures/app-test';

test('load-section', async ({ page }) => {
  await page.locator('div').filter({ hasText: /^Room$/ }).getByPlaceholder('#').click();
  await page.locator('div').filter({ hasText: /^Room$/ }).getByPlaceholder('#').fill('25.1');
  await page.locator('div').filter({ hasText: /^RoomLoad$/ }).getByRole('button').click();
  await expect(page.getByText('savvas-icestorm', { exact: true })).toBeVisible();
  await page.getByText('the-collector', { exact: true }).click();
});