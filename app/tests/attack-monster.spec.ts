import { test, expect } from './fixtures/app-test';

test('attack-monster', async ({ page }) => {
    await page.getByRole('button', { name: '+ Monster' }).click();
    await page.getByRole('textbox', { name: 'Type' }).click();
    await page.getByText('algox-guard').click();
    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.locator('app-add-monster')).toBeHidden();
    await page.locator('app-toast-notification .toast')
        .waitFor({ state: 'hidden', timeout: 1200 })
        .catch(() => { });
    await page.addStyleTag({
        content: `
    app-toast-notification, app-toast-notification .toast { pointer-events: none !important; }
  `});

    await page.getByRole('button', { name: 'Close' }).click();
    await page.getByRole('button', { name: 'Attack' }).scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Attack' }).click({ force: true });
    await page.locator('app-attack-modal').getByRole('textbox').click();
    await page.locator('app-attack-modal').getByRole('textbox').fill('5');
    await page.locator('.icon.poison').click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(
        page.locator('app-creature').filter({ hasText: 'Attack' }).getByRole('textbox').nth(1)
    ).toBeVisible();
    await expect(page.locator('app-conditions div').nth(1)).toBeVisible();
});
