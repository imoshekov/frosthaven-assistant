import { DamageService } from './damage.service';
import { Creature, CreatureConditions } from '../types/game-types';

/**
 * Guards the damage maths extracted out of AttackModalComponent, including the
 * condition-ordering fix: the original applied poison/brittle/ward in whatever order
 * they sat in the target's `conditions` array.
 */
describe('DamageService', () => {
  let service: DamageService;

  const target = (over: Partial<Creature> = {}): Creature => ({
    id: 't', armor: 0, roundArmor: 0, conditions: [], hp: 10, maxHp: 10, ...over,
  });

  beforeEach(() => { service = new DamageService(); });

  it('deals the plain attack value with no armour or conditions', () => {
    expect(service.compute({ baseAttack: 3, target: target() }).damage).toBe(3);
  });

  it('subtracts armour and round armour', () => {
    expect(service.compute({ baseAttack: 5, target: target({ armor: 1, roundArmor: 1 }) }).damage).toBe(3);
  });

  it('reduces armour by pierce but never below zero armour', () => {
    expect(service.compute({ baseAttack: 5, armorPen: 3, target: target({ armor: 2 }) }).damage).toBe(5);
  });

  it('never deals negative damage', () => {
    expect(service.compute({ baseAttack: 1, target: target({ armor: 5 }) }).damage).toBe(0);
  });

  describe('attack modifiers', () => {
    it('a miss deals nothing, whatever the conditions', () => {
      const result = service.compute({
        baseAttack: 6, modifier: 'miss',
        target: target({ conditions: [CreatureConditions.brittle] }),
      });
      expect(result.damage).toBe(0);
    });

    it('applies additive modifiers before armour', () => {
      // (3 + 2) - 1 armour = 4. Applied the other way round it would be 3 - 1 + 2 = 4
      // too, so use armour big enough to distinguish: (3 - 2) is clamped, (3+2)-4 = 1.
      expect(service.compute({ baseAttack: 3, modifier: 2, target: target({ armor: 4 }) }).damage).toBe(1);
    });

    it('doubles the attack value before armour', () => {
      expect(service.compute({ baseAttack: 3, modifier: 'x2', target: target({ armor: 2 }) }).damage).toBe(4);
    });

    it('clamps a negative modifier at zero attack', () => {
      expect(service.compute({ baseAttack: 1, modifier: -2, target: target() }).damage).toBe(0);
    });
  });

  /**
   * "All attacks targeting the figure gain +1" — poison raises the *attack value*, so
   * the modifier card multiplies it and shield is subtracted from the total. It used
   * to be tacked on at the very end, which both left it out of a ×2 and threw it away
   * whenever shield blocked the attack outright.
   */
  describe('poison', () => {
    it('adds one to the attack', () => {
      expect(service.compute({
        baseAttack: 3, target: target({ conditions: [CreatureConditions.poison] }),
      }).damage).toBe(4);
    });

    it('is doubled along with the rest of the attack by a x2', () => {
      expect(service.compute({
        baseAttack: 3, modifier: 'x2', target: target({ conditions: [CreatureConditions.poison] }),
      }).damage).toBe(8); // (3 + 1) × 2, not (3 × 2) + 1
    });

    it('survives a shield that would otherwise block the attack outright', () => {
      expect(service.compute({
        baseAttack: 3, target: target({ armor: 3, conditions: [CreatureConditions.poison] }),
      }).damage).toBe(1); // (3 + 1) − 3
    });

    it('is still blocked by a shield big enough to stop the poisoned total', () => {
      expect(service.compute({
        baseAttack: 3, target: target({ armor: 4, conditions: [CreatureConditions.poison] }),
      }).damage).toBe(0);
    });

    it('is not used up by the attack — it lasts until the figure is healed', () => {
      expect(service.compute({
        baseAttack: 3, target: target({ conditions: [CreatureConditions.poison] }),
      }).consumedConditions).toEqual([]);
    });

    it('adds nothing on a miss', () => {
      expect(service.compute({
        baseAttack: 3, modifier: 'miss', target: target({ conditions: [CreatureConditions.poison] }),
      }).damage).toBe(0);
    });
  });

  describe('target conditions', () => {
    it('brittle doubles', () => {
      expect(service.compute({
        baseAttack: 3, target: target({ conditions: [CreatureConditions.brittle] }),
      }).damage).toBe(6);
    });

    it('ward halves, rounding down', () => {
      expect(service.compute({
        baseAttack: 5, target: target({ conditions: [CreatureConditions.ward] }),
      }).damage).toBe(2);
    });

    it('brittle and ward cancel', () => {
      expect(service.compute({
        baseAttack: 5,
        target: target({ conditions: [CreatureConditions.brittle, CreatureConditions.ward] }),
      }).damage).toBe(5);
    });

    it('applies poison before ward regardless of array order', () => {
      // This is the bug the extraction fixed: the old code reduced over the
      // conditions array as ordered, so these two gave 3 and 2 respectively.
      const wardFirst = service.compute({
        baseAttack: 5,
        target: target({ conditions: [CreatureConditions.ward, CreatureConditions.poison] }),
      }).damage;
      const poisonFirst = service.compute({
        baseAttack: 5,
        target: target({ conditions: [CreatureConditions.poison, CreatureConditions.ward] }),
      }).damage;

      expect(wardFirst).toBe(poisonFirst);
      expect(wardFirst).toBe(3); // (5 + 1 poison) / 2 ward
    });

    it('does not apply condition maths to a fully blocked attack', () => {
      expect(service.compute({
        baseAttack: 2,
        target: target({ armor: 5, conditions: [CreatureConditions.brittle] }),
      }).damage).toBe(0);
    });
  });

  /**
   * Ward and brittle modify one instance of damage and are then gone. The service
   * reports which ones it spent; taking them off the creature is the caller's job.
   */
  describe('one-shot conditions', () => {
    it('reports the brittle it doubled with', () => {
      expect(service.compute({
        baseAttack: 3, target: target({ conditions: [CreatureConditions.brittle] }),
      }).consumedConditions).toEqual([CreatureConditions.brittle]);
    });

    it('reports the ward it halved with', () => {
      expect(service.compute({
        baseAttack: 4, target: target({ conditions: [CreatureConditions.ward] }),
      }).consumedConditions).toEqual([CreatureConditions.ward]);
    });

    it('spends a ward even when halving leaves nothing', () => {
      // 1 damage halved is 0, but the instance of damage still happened.
      const result = service.compute({
        baseAttack: 1, target: target({ conditions: [CreatureConditions.ward] }),
      });
      expect(result.damage).toBe(0);
      expect(result.consumedConditions).toEqual([CreatureConditions.ward]);
    });

    it('spends both when they cancel each other out', () => {
      expect(service.compute({
        baseAttack: 5,
        target: target({ conditions: [CreatureConditions.brittle, CreatureConditions.ward] }),
      }).consumedConditions).toEqual([CreatureConditions.brittle, CreatureConditions.ward]);
    });

    it('spends nothing on a miss — no damage instance, nothing to modify', () => {
      expect(service.compute({
        baseAttack: 5, modifier: 'miss', target: target({ conditions: [CreatureConditions.ward] }),
      }).consumedConditions).toEqual([]);
    });

    it('spends nothing when shield blocks the attack outright', () => {
      expect(service.compute({
        baseAttack: 2, target: target({ armor: 5, conditions: [CreatureConditions.ward] }),
      }).consumedConditions).toEqual([]);
    });

    it('leaves an unrelated condition alone', () => {
      expect(service.compute({
        baseAttack: 3, target: target({ conditions: [CreatureConditions.wound] }),
      }).consumedConditions).toEqual([]);
    });
  });

  /**
   * Retaliate answers the attack, not the damage — so it fires on a miss and on a
   * fully blocked hit alike. Range is not modelled: this app has no board.
   */
  describe('retaliate', () => {
    it('is zero for a target with none', () => {
      expect(service.retaliateDamage(target())).toBe(0);
    });

    it('reads the printed value', () => {
      expect(service.retaliateDamage(target({ retaliate: 2 }))).toBe(2);
    });

    it('adds a round-long retaliate on top', () => {
      expect(service.retaliateDamage(target({ retaliate: 2, roundRetaliate: 1 }))).toBe(3);
    });

    it('never goes negative', () => {
      expect(service.retaliateDamage(target({ retaliate: -3 }))).toBe(0);
    });
  });

  describe('healing', () => {
    it('raises hp', () => {
      expect(service.computeHeal(target({ hp: 4, maxHp: 10 }), 3)).toBe(7);
    });

    it('caps at max hp', () => {
      expect(service.computeHeal(target({ hp: 9, maxHp: 10 }), 5)).toBe(10);
    });

    it('never lowers hp', () => {
      expect(service.computeHeal(target({ hp: 8, maxHp: 10 }), -4)).toBe(8);
    });
  });

  it('reports a breakdown for the panel preview', () => {
    const result = service.compute({
      baseAttack: 3, modifier: 'x2',
      target: target({ armor: 1, conditions: [CreatureConditions.poison] }),
    });
    expect(result.damage).toBe(7); // (3 + 1 poison) × 2 = 8, − 1 shield
    expect(result.breakdown.length).toBeGreaterThan(1);
  });
});
