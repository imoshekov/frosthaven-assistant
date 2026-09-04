import { Creature } from './game-types';
import {
  actingInitiative,
  allHeroesSubmitted,
  bothHalvesSpent,
  isHalfLegal,
  isInitiativePartiallySubmitted,
  isInitiativeSubmitted,
  legalHalves,
  topActionExecuted,
} from './turn-state.util';

describe('turn-state.util', () => {
  const hero = (over: Partial<Creature> = {}): Creature => ({
    id: 'h', type: 'drifter', aggressive: false, level: 1,
    initiative: 0, hiddenInitiative: 0, secondaryHiddenInitiative: 0, ...over,
  });

  describe('submission readiness', () => {
    it('is not submitted with neither card entered', () => {
      expect(isInitiativeSubmitted(hero())).toBe(false);
    });

    it('is not submitted with only one card entered', () => {
      const partial = hero({ hiddenInitiative: 32 });
      expect(isInitiativeSubmitted(partial)).toBe(false);
      expect(isInitiativePartiallySubmitted(partial)).toBe(true);
    });

    it('is submitted once both cards are entered', () => {
      expect(isInitiativeSubmitted(hero({ hiddenInitiative: 32, secondaryHiddenInitiative: 20 }))).toBe(true);
    });

    it('is submitted once revealed', () => {
      expect(isInitiativeSubmitted(hero({ initiative: 32, hiddenInitiative: 0 }))).toBe(true);
    });

    it('holds the reveal until every hero has both cards in', () => {
      const ready = hero({ id: 'a', hiddenInitiative: 10, secondaryHiddenInitiative: 20 });
      const halfway = hero({ id: 'b', hiddenInitiative: 30 });
      const monster = { id: 'm', aggressive: true } as Creature;

      expect(allHeroesSubmitted([ready, halfway, monster])).toBe(false);
      expect(allHeroesSubmitted([ready, { ...halfway, secondaryHiddenInitiative: 40 }, monster])).toBe(true);
    });
  });

  describe('acting initiative', () => {
    it('always uses the main card, regardless of which value is higher', () => {
      expect(actingInitiative(hero({ initiative: 20, secondaryInitiative: 80 }))).toBe(20);
      expect(actingInitiative(hero({ initiative: 80, secondaryInitiative: 20 }))).toBe(80);
    });
  });

  describe('legal half combinations', () => {
    it('offers both halves of both cards at the start of a turn', () => {
      const halves = legalHalves(hero());
      expect(halves.filter(h => h.half === 'top').length).toBe(3);   // A, B, default
      expect(halves.filter(h => h.half === 'bottom').length).toBe(3);
    });

    it('locks out the same card supplying both halves', () => {
      // Top of A is played, so A's bottom is no longer available.
      const h = hero({ topHalfSlot: 'A', topHalfState: 'executed' });

      expect(isHalfLegal(h, 'A', 'bottom')).toBe(false);
      expect(isHalfLegal(h, 'B', 'bottom')).toBe(true);
      expect(isHalfLegal(h, 'default', 'bottom')).toBe(true);
    });

    it('offers no further top half once one is spent', () => {
      const h = hero({ topHalfSlot: 'A', topHalfState: 'executed' });
      expect(legalHalves(h).some(x => x.half === 'top')).toBe(false);
    });

    it('treats a skipped half as spent', () => {
      const h = hero({ bottomHalfSlot: 'B', bottomHalfState: 'skipped' });
      expect(legalHalves(h).some(x => x.half === 'bottom')).toBe(false);
      expect(isHalfLegal(h, 'B', 'top')).toBe(false);
      expect(isHalfLegal(h, 'A', 'top')).toBe(true);
    });

    it('completes the turn when a top and a bottom are both spent', () => {
      const h = hero({
        topHalfSlot: 'A', topHalfState: 'executed',
        bottomHalfSlot: 'B', bottomHalfState: 'skipped',
      });
      expect(bothHalvesSpent(h)).toBe(true);
      expect(topActionExecuted(h)).toBe(true);
    });

    it('distinguishes executed from skipped', () => {
      expect(topActionExecuted(hero({ topHalfState: 'skipped' }))).toBe(false);
      expect(topActionExecuted(hero({ topHalfState: 'executed' }))).toBe(true);
    });
  });
});
