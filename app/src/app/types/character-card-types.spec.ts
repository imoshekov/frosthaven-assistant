import {
  CardAction,
  bonusXp,
  collectElementBonuses,
  sumUnconditionalXp,
} from './character-card-types';

/**
 * Guards the XP accounting rule that matters most in play: XP behind a conditional
 * element bonus is only earned if the player actually takes that bonus, so it must
 * never be counted as part of a half's automatic XP.
 */
describe('character-card-types', () => {
  // snowflake #331 "Enticing Breeze": attack 1 with range/pull, and an optional
  // "consume ICE for +2 Attack and 1 XP".
  const encitingBreeze: CardAction[] = [{
    type: 'attack', value: 1, subActions: [
      { type: 'range', value: 3, small: true },
      { type: 'pull', value: 2, small: true },
      {
        type: 'elementBonus', elements: ['ice'], consumeMode: 'all',
        subActions: [
          { type: 'attack', value: 2, valueType: 'add', small: true },
          { type: 'xp', value: 1 },
        ],
      },
    ],
  }];

  describe('sumUnconditionalXp', () => {
    it('counts inline xp actions', () => {
      expect(sumUnconditionalXp([{ type: 'xp', value: 2 }])).toBe(2);
    });

    it('counts xp nested inside ordinary actions', () => {
      expect(sumUnconditionalXp([
        { type: 'attack', value: 1, subActions: [{ type: 'xp', value: 1 }] },
      ])).toBe(1);
    });

    it('excludes xp locked behind a conditional element bonus', () => {
      // The 1 XP here is only earned by consuming ICE, so it is not automatic.
      expect(sumUnconditionalXp(encitingBreeze)).toBe(0);
    });

    it('is zero for an empty or missing action list', () => {
      expect(sumUnconditionalXp([])).toBe(0);
      expect(sumUnconditionalXp(undefined)).toBe(0);
    });
  });

  describe('bonusXp', () => {
    it('reports the xp a bonus grants when taken', () => {
      const bonus = collectElementBonuses(encitingBreeze)[0];
      expect(bonus).toBeTruthy();
      expect(bonusXp(bonus)).toBe(1);
    });

    it('is zero for a bonus that grants no xp', () => {
      expect(bonusXp({
        type: 'elementBonus', elements: ['air'], consumeMode: 'all',
        subActions: [{ type: 'move', value: 2, valueType: 'add' }],
      })).toBe(0);
    });
  });

  describe('collectElementBonuses', () => {
    it('finds bonuses nested anywhere in the tree', () => {
      const found = collectElementBonuses(encitingBreeze);
      expect(found.length).toBe(1);
      expect(found[0].elements).toEqual(['ice']);
      expect(found[0].consumeMode).toBe('all');
    });

    it('returns nothing when a half has no bonuses', () => {
      expect(collectElementBonuses([{ type: 'attack', value: 3 }])).toEqual([]);
    });

    it('keeps an either-or bonus intact', () => {
      // snowflake #357 consumes ICE or AIR, the player's choice.
      const found = collectElementBonuses([{
        type: 'elementBonus', elements: ['ice', 'air'], consumeMode: 'any',
        subActions: [{ type: 'text', text: 'Range -2 instead' }],
      }]);
      expect(found[0].consumeMode).toBe('any');
      expect(found[0].elements).toEqual(['ice', 'air']);
    });
  });
});
