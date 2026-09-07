import {
  CardAction,
  bonusSelfDamage,
  bonusXp,
  collectAttacks,
  collectConditionalBonuses,
  sumSelfDamage,
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
      const bonus = collectConditionalBonuses(encitingBreeze)[0];
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

  describe('collectConditionalBonuses', () => {
    it('finds bonuses nested anywhere in the tree', () => {
      const found = collectConditionalBonuses(encitingBreeze);
      expect(found.length).toBe(1);
      expect(found[0].elements).toEqual(['ice']);
      expect(found[0].consumeMode).toBe('all');
    });

    it('returns nothing when a half has no bonuses', () => {
      expect(collectConditionalBonuses([{ type: 'attack', value: 3 }])).toEqual([]);
    });

    it('keeps an either-or bonus intact', () => {
      // snowflake #357 consumes ICE or AIR, the player's choice.
      const found = collectConditionalBonuses([{
        type: 'elementBonus', elements: ['ice', 'air'], consumeMode: 'any',
        subActions: [{ type: 'text', text: 'Range -2 instead' }],
      }]);
      expect(found[0].consumeMode).toBe('any');
      expect(found[0].elements).toEqual(['ice', 'air']);
    });

    it('finds HP-paid bonuses alongside element ones, in document order', () => {
      const found = collectConditionalBonuses([
        { type: 'sufferDamageBonus', value: 1, subActions: [{ type: 'xp', value: 1 }] },
        { type: 'elementBonus', elements: ['fire'], consumeMode: 'all', subActions: [{ type: 'xp', value: 2 }] },
      ]);
      expect(found.map(b => b.type)).toEqual(['sufferDamageBonus', 'elementBonus']);
    });
  });

  /**
   * A `sufferDamageBonus` is an offer exactly as an `elementBonus` is, so every walk
   * that treats one as "don't look inside until it's paid for" has to treat the other
   * the same way — otherwise a card grants for free what it means to charge HP for.
   */
  describe('an HP-paid bonus is an offer, not an effect', () => {
    const recklessSwing: CardAction[] = [{
      type: 'attack', value: 2, subActions: [{
        type: 'sufferDamageBonus', value: 1,
        subActions: [
          { type: 'attack', value: 3, valueType: 'add', small: true },
          { type: 'xp', value: 1 },
        ],
      }],
    }];

    it('hides its xp from the half\'s automatic total', () => {
      expect(sumUnconditionalXp(recklessSwing)).toBe(0);
    });

    it('hides its attack from the half\'s independent strikes', () => {
      // One printed attack, not two: the bonus only ever adds to that one's value.
      expect(collectAttacks(recklessSwing).length).toBe(1);
    });

    it('reports the xp and the cost it carries once taken', () => {
      const bonus = collectConditionalBonuses(recklessSwing)[0];
      expect(bonusXp(bonus)).toBe(1);
      expect(bonusSelfDamage(bonus)).toBe(1);
    });

    it('costs nothing for an element bonus, which is paid in elements', () => {
      expect(bonusSelfDamage(collectConditionalBonuses(encitingBreeze)[0])).toBe(0);
    });
  });

  describe('sumSelfDamage', () => {
    it('sums the printed costs on a half', () => {
      expect(sumSelfDamage([
        { type: 'attack', value: 3 },
        { type: 'sufferDamage', value: 2 },
      ])).toBe(2);
    });

    it('finds a cost nested under the attack it is printed with', () => {
      expect(sumSelfDamage([
        { type: 'attack', value: 3, subActions: [{ type: 'sufferDamage', value: 1 }] },
      ])).toBe(1);
    });

    it('ignores a cost that only exists inside a bonus', () => {
      // That one is charged by taking the bonus, not by playing the half.
      expect(sumSelfDamage([{
        type: 'sufferDamageBonus', value: 1,
        subActions: [{ type: 'sufferDamage', value: 5 }],
      }])).toBe(0);
    });

    it('is zero for a half that costs nothing', () => {
      expect(sumSelfDamage([{ type: 'attack', value: 3 }])).toBe(0);
      expect(sumSelfDamage(undefined)).toBe(0);
    });
  });
});
