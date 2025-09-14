import { test, expect } from './fixtures/app-test';

test('load-scenario', async ({ page }) => {
  await page.locator('div').filter({ hasText: /^Mission$/ }).getByPlaceholder('#').click();
  await page.locator('div').filter({ hasText: /^Mission$/ }).getByPlaceholder('#').fill('14');
  await page.locator('div').filter({ hasText: /^MissionLoad$/ }).getByRole('button').click();
  await expect(page.getByText('abael-herder', { exact: true })).toBeVisible();
  await page.getByText('lightning-eel', { exact: true }).first().click();
  await page.getByText('lightning-eel', { exact: true }).nth(1).click();
  await page.getByText('piranha-pig', { exact: true }).click();
});