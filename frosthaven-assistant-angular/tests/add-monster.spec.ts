import { test, expect } from './fixtures/app-test';

test('add-monster', async ({ page }) => {
    await page.getByRole('button', { name: '+ Monster' }).click();
    await page.getByRole('textbox', { name: 'Type' }).click();
    await page.getByText('abael-herder').click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await page.getByRole('textbox', { name: 'Type' }).click();
    await page.getByText('abael-scout').click();
    await page.locator('#elite-monster').check();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByText('abael-herder', { exact: true })).toBeVisible();
    await page.locator('.stat-input.initiative').first().click();
    await page.getByText('abael-scout', { exact: true }).click();
    await page.locator('.container.abael-scout > .creature-standee > .stat-input.initiative').click();
});