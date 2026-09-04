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

  describe('target conditions', () => {
    it('poison adds one', () => {
      expect(service.compute({
        baseAttack: 3, target: target({ conditions: [CreatureConditions.poison] }),
      }).damage).toBe(4);
    });

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
    expect(result.damage).toBe(6); // (3*2) - 1 = 5, +1 poison
    expect(result.breakdown.length).toBeGreaterThan(1);
  });
});
