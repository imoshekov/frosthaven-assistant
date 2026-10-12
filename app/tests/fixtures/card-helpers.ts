import { Page, expect } from '@playwright/test';

/**
 * Adds a monster and dismisses the add-monster panel, which otherwise stays mounted
 * over the board and swallows subsequent clicks.
 */
export async function addMonster(page: Page, type: string): Promise<void> {
  await page.getByRole('button', { name: 'Monster', exact: true }).click();
  await page.getByRole('textbox', { name: 'Type' }).click();
  await page.getByText(type, { exact: true }).click();
  await page.getByRole('button', { name: 'Confirm' }).click();

  const close = page.getByRole('button', { name: 'Close' });
  if (await close.count()) await close.first().click();
  await page.locator('app-add-monster').waitFor({ state: 'detached' }).catch(() => { });
}

/**
 * Submits both card initiatives for every hero, then waits for the automatic reveal.
 *
 * Readiness requires *both* of a hero's cards, and missing even one hero leaves every
 * initiative hidden and all hero names unclickable — so this walks the character list
 * by index (the list always shows the whole party, selecting one does not remove it)
 * and then asserts the reveal actually landed. A loud failure here beats a timeout on
 * whatever the caller does next.
 */
export async function revealAllInitiatives(page: Page): Promise<void> {
  // The party loads asynchronously from Supabase. Count heroes by their name bar:
  // monsters add group headers too, so a header count would overshoot.
  await page.locator('.name-trait').first().waitFor();
  const heroCount = await page.locator('.name-trait').count();

  for (let i = 0; i < heroCount; i++) {
    if (!(await page.locator('.bubble-panel').count())) {
      await page.locator('.bubble-btn').click();
    }

    // Get back to the character list if a character is already selected.
    const change = page.locator('.change-btn');
    if (await change.count()) await change.click();

    const heroes = page.locator('.char-btn');
    if (await heroes.count() <= i) break;
    await heroes.nth(i).click();

    const inputs = page.locator('.initiative-input');
    if (!(await inputs.count())) continue;   // this hero has already submitted

    // Distinct values per hero, and distinct within the pair.
    await inputs.nth(0).fill(String(11 + i * 5));
    await inputs.nth(1).fill(String(61 + i * 5));

    const submit = page.locator('.submit-btn');
    if (await submit.isEnabled()) await submit.click();
  }

  const close = page.locator('.bubble-panel .close-btn');
  if (await close.count()) await close.click();

  // The reveal is what makes hero names clickable, so everything downstream needs it.
  await expect(page.locator('.name-trait.clickable')).toHaveCount(heroCount);
}

/** Opens the card execution panel for the first hero, via their now-clickable name. */
export async function openCardPanel(page: Page): Promise<void> {
  await page.locator('.name-trait.clickable').first().click();
  await expect(
    page.locator('app-player-card-execution-panel .content')
  ).toBeVisible();
}
