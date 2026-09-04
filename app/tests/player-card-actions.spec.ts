import { test, expect } from './fixtures/app-test';
import { revealAllInitiatives, addMonster, openCardPanel } from './fixtures/card-helpers';

/**
 * Covers the card-driven hero turn: two secret initiatives, the card execution panel, the
 * legal top/bottom combination lock, execution against a target, and turn completion.
 *
 * The default party comes from the live Supabase profile, so nothing here assumes a
 * particular character class — most Frosthaven decks have no authored action data yet,
 * and the panel's manual-entry fallback is exercised when that is the case.
 */
test.describe('player card actions', () => {

  test('submits two initiatives and rejects a duplicate pair', async ({ page }) => {
    await page.locator('.bubble-btn').click();
    await page.locator('.char-btn').first().click();

    const inputs = page.locator('.initiative-input');
    await expect(inputs).toHaveCount(2);

    const submit = page.locator('.submit-btn');
    await expect(submit).toBeDisabled();

    // You cannot play the same card twice.
    await inputs.nth(0).fill('32');
    await inputs.nth(1).fill('32');
    await expect(page.locator('.validation')).toBeVisible();
    await expect(submit).toBeDisabled();

    await inputs.nth(1).fill('20');
    await expect(page.locator('.validation')).toHaveCount(0);
    await expect(submit).toBeEnabled();

    await submit.click();
    // The badge shows only the main card's initiative.
    await expect(page.locator('.bubble-badge')).toHaveText('32');
  });

  test('does not leak another hero initiative before the reveal', async ({ page }) => {
    // The party loads asynchronously from Supabase.
    await page.locator('app-creature-group-header').first().waitFor();
    const heroCount = await page.locator('app-creature-group-header').count();
    test.skip(heroCount < 2, 'needs at least two heroes in the party');

    await page.locator('.bubble-btn').click();
    await page.locator('.char-btn').first().click();
    const inputs = page.locator('.initiative-input');
    await inputs.nth(0).fill('42');
    await inputs.nth(1).fill('43');
    await page.locator('.submit-btn').click();
    // Submitting closes the bubble itself, so there is nothing left to dismiss.
    await expect(page.locator('.bubble-panel')).toHaveCount(0);

    // With a submission pending and others outstanding, rows show the eye icon
    // rather than a number.
    await expect(page.locator('.initiative-status-icon').first()).toBeVisible();
    const rowText = await page.locator('app-game').innerText();
    expect(rowText).not.toContain('42');
  });

  test('plays a top and a bottom half, then completes the turn', async ({ page }) => {
    await addMonster(page, 'algox-guard');

    // Give the monster enough HP that the attack will not kill it.
    const hp = page.locator('app-creature .base-stat .stat-input').first();
    await hp.fill('20/20');
    await hp.blur();
    const hpBefore = await hp.inputValue();

    await revealAllInitiatives(page);

    // The hero's name becomes clickable (with an attack icon) once both cards are
    // revealed; that click opens the card execution panel.
    const heroName = page.locator('.name-trait').first();
    await expect(heroName).toHaveClass(/clickable/);
    await expect(heroName.locator('.icon.attack')).toBeVisible();
    await heroName.click();

    const panel = page.locator('app-player-card-execution-panel');
    // Assert on .content: the host itself has no box, since everything inside it is
    // position: fixed.
    await expect(panel.locator('.content')).toBeVisible();
    // Two cards, two halves each, plus the two default actions from the mat.
    await expect(panel.locator('.half-tile')).toHaveCount(6);

    // Take card B's top half.
    await panel.locator('.half-tile').filter({ hasText: 'B · TOP' }).locator('.tile-body').click();
    await expect(panel.locator('.resolve')).toBeVisible();

    // A half with no authored data needs its attack value read off the printed card.
    const manual = panel.locator('.manual .stat-input');
    if (await manual.count()) {
      await manual.fill('5');
      await manual.dispatchEvent('input');
    }

    await panel.locator('.target-slot').first().click();
    await panel.locator('.modifier-btn', { hasText: '±0' }).first().click();
    await expect(panel.locator('.preview')).toContainText('damage');
    await panel.locator('button.execute').click();

    await expect(hp).not.toHaveValue(hpBefore);
    await expect(panel.locator('.half-tile.spent').first()).toBeVisible();

    // The same card cannot supply both halves of one turn.
    await expect(
      panel.locator('.half-tile').filter({ hasText: 'B · BOTTOM' })
    ).toHaveClass(/disabled/);
    await expect(
      panel.locator('.half-tile').filter({ hasText: 'A · BOTTOM' })
    ).not.toHaveClass(/disabled/);

    // Spending a bottom half finishes the turn.
    await panel.locator('.half-tile').filter({ hasText: 'A · BOTTOM' })
      .locator('button.skip').click();
    await expect(panel.locator('.turn-state')).toBeVisible();

    await panel.locator('.footer-btn.done').click();
    await expect(
      page.locator('app-creature-group-header .creature-details.turn-completed')
    ).toHaveCount(1);
  });

  test('un-grays a half with its own undo button', async ({ page }) => {
    await addMonster(page, 'algox-guard');
    await revealAllInitiatives(page);

    await openCardPanel(page);
    const panel = page.locator('app-player-card-execution-panel');

    await panel.locator('.half-tile').filter({ hasText: 'B · TOP' })
      .locator('button.skip').click();
    await expect(panel.locator('.half-tile.spent').first()).toBeVisible();

    await panel.locator('.half-tile.spent').first().locator('button.undo').click();
    await expect(panel.locator('.half-tile.spent')).toHaveCount(0);
  });

  test('one log undo reverses the damage and the spent half together', async ({ page }) => {
    await addMonster(page, 'algox-guard');
    const hp = page.locator('app-creature .base-stat .stat-input').first();
    await hp.fill('20/20');
    await hp.blur();
    const hpBefore = await hp.inputValue();

    await revealAllInitiatives(page);
    await openCardPanel(page);
    const panel = page.locator('app-player-card-execution-panel');

    await panel.locator('.half-tile').filter({ hasText: 'B · TOP' }).locator('.tile-body').click();
    const manual = panel.locator('.manual .stat-input');
    if (await manual.count()) {
      await manual.fill('5');
      await manual.dispatchEvent('input');
    }
    await panel.locator('.target-slot').first().click();
    await panel.locator('.modifier-btn', { hasText: '±0' }).first().click();
    await panel.locator('button.execute').click();
    await expect(hp).not.toHaveValue(hpBefore);
    await panel.locator('.footer-btn.done').click();

    // Execution is emitted as a single creatures$ update, so it is one log batch.
    // The control is icon-only, hence the class rather than a text match.
    await page.locator('app-log .undo-btn').click();

    await expect(hp).toHaveValue(hpBefore);
    await openCardPanel(page);
    await expect(page.locator('app-player-card-execution-panel .half-tile.spent')).toHaveCount(0);
  });

  test('clears all card turn state on the next round', async ({ page }) => {
    await revealAllInitiatives(page);
    await openCardPanel(page);
    const panel = page.locator('app-player-card-execution-panel');
    await panel.locator('.footer-btn', { hasText: 'End turn early' }).click();
    await panel.locator('.footer-btn.done').click();
    await expect(
      page.locator('app-creature-group-header .creature-details.turn-completed')
    ).toHaveCount(1);

    await page.getByRole('button', { name: 'Next', exact: true }).first().click();

    await expect(
      page.locator('app-creature-group-header .creature-details.turn-completed')
    ).toHaveCount(0);
  });
});
