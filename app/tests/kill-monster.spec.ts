import { test, expect } from './fixtures/app-test';

test('kill-monster', async ({ page }) => {
    await page.getByRole('button', { name: '+ Monster' }).click();
    await page.getByRole('textbox', { name: 'Type' }).click();
    await page.getByText('algox-guard').click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await page.getByRole('button', { name: 'Close' }).click();
    const guardCard = page.locator('app-creature', { hasText: /algox-guard/i }).first();
    await page.locator('app-creature').filter({ hasText: 'Attack' }).getByRole('textbox').nth(1).click();
    await page.locator('app-creature').filter({ hasText: 'Attack' }).getByRole('textbox').nth(1).fill('0');
    await page.locator('.creature-standee').click();
    await expect(guardCard).toHaveCount(0); 
});