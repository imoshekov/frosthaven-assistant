import { Injectable } from '@angular/core';
import { Creature, CreatureConditions } from '../types/game-types';
import { AttackModifier, applyAttackModifier, attackModifierLabel } from '../types/attack-modifier';

export interface DamageInput {
  /** The printed attack value, before any modifier draw. */
  baseAttack: number;
  /** A drawn attack-modifier card, if any. */
  modifier?: AttackModifier | null;
  /** Pierce / armour penetration. */
  armorPen?: number;
  /**
   * Skips the target's shield entirely — its own `armor` and `roundArmor` both count
   * as 0. Stronger than any amount of pierce, so `armorPen` is moot alongside it; the
   * attack modal disables its pierce input for exactly that reason.
   */
  ignoreArmor?: boolean;
  target: Pick<Creature, 'armor' | 'roundArmor' | 'conditions'>;
}

export interface DamageResult {
  damage: number;
  /** Human-readable steps, for the execution panel's live preview. */
  breakdown: string[];
}

/**
 * The single implementation of the app's attack damage maths, shared by the manual
 * attack modal and the player card execution panel.
 *
 * Extracted from AttackModalComponent.calculateDamage(), which applied the target's
 * condition effects in whatever order they happened to sit in the `conditions` array —
 * so a target warded-then-poisoned took different damage from one poisoned-then-warded.
 * The order is fixed here: modifier, then armour (reduced by pierce), then poison,
 * then brittle/ward.
 */
@Injectable({ providedIn: 'root' })
export class DamageService {

  compute(input: DamageInput): DamageResult {
    const { baseAttack, modifier, target } = input;
    const armorPen = input.armorPen ?? 0;
    const breakdown: string[] = [];

    // 1. Attack modifier. A miss short-circuits: no armour, no condition maths.
    let damage = applyAttackModifier(baseAttack, modifier);
    if (modifier === 'miss') {
      return { damage: 0, breakdown: ['Miss — no damage'] };
    }
    breakdown.push(
      modifier === undefined || modifier === null || modifier === 0
        ? `Attack ${baseAttack}`
        : `Attack ${baseAttack} ${attackModifierLabel(modifier)} = ${damage}`
    );

    // 2. Armour, reduced by pierce and never negative — unless ignored outright, which
    // beats any amount of pierce and so skips this step altogether.
    const printedArmor = (target.armor ?? 0) + (target.roundArmor ?? 0);
    if (input.ignoreArmor) {
      if (printedArmor > 0) breakdown.push(`shield ${printedArmor} ignored`);
    } else {
      const effectiveArmor = Math.max(printedArmor - armorPen, 0);
      if (printedArmor > 0 || armorPen > 0) {
        damage = damage - effectiveArmor;
        breakdown.push(
          armorPen > 0
            ? `− shield ${printedArmor} (pierce ${armorPen}) = ${Math.max(damage, 0)}`
            : `− shield ${printedArmor} = ${Math.max(damage, 0)}`
        );
      }
    }
    damage = Math.max(damage, 0);

    // A blocked attack still deals no condition-modified damage.
    if (damage <= 0) {
      return { damage: 0, breakdown: [...breakdown, 'Blocked — no damage'] };
    }

    const conditions = target.conditions ?? [];

    // 3. Poison adds a flat 1.
    if (conditions.includes(CreatureConditions.poison)) {
      damage += 1;
      breakdown.push(`+ poison = ${damage}`);
    }

    // 4. Brittle doubles and ward halves; held together they cancel.
    const brittle = conditions.includes(CreatureConditions.brittle);
    const ward = conditions.includes(CreatureConditions.ward);
    if (brittle && ward) {
      breakdown.push('brittle and ward cancel');
    } else if (brittle) {
      damage *= 2;
      breakdown.push(`× brittle = ${damage}`);
    } else if (ward) {
      damage = Math.floor(damage / 2);
      breakdown.push(`÷ ward = ${damage}`);
    }

    return { damage: Math.max(damage, 0), breakdown };
  }

  /**
   * Healing, which the app previously had no path for at all — the attack modal
   * early-returns on a non-positive attack value. Capped at the target's max HP.
   */
  computeHeal(target: Pick<Creature, 'hp' | 'maxHp'>, amount: number): number {
    const current = target.hp ?? 0;
    const max = target.maxHp ?? current;
    return Math.max(Math.min(current + Math.max(amount, 0), max), current);
  }
}
