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
  /**
   * One-shot conditions this attack used up on the target — ward and brittle, which
   * the rules remove the moment they modify an instance of damage. The caller is
   * responsible for taking them off the creature; this service computes only.
   */
  consumedConditions: CreatureConditions[];
}

/**
 * The single implementation of the app's attack damage maths, shared by the manual
 * attack modal and the player card execution panel.
 *
 * Extracted from AttackModalComponent.calculateDamage(), which applied the target's
 * condition effects in whatever order they happened to sit in the `conditions` array —
 * so a target warded-then-poisoned took different damage from one poisoned-then-warded.
 *
 * The order is the rulebook's: poison raises the *attack value*, then the modifier
 * card, then shield (reduced by pierce), then brittle/ward on the damage that lands.
 */
@Injectable({ providedIn: 'root' })
export class DamageService {

  compute(input: DamageInput): DamageResult {
    const { baseAttack, modifier, target } = input;
    const armorPen = input.armorPen ?? 0;
    const breakdown: string[] = [];
    const conditions = target.conditions ?? [];

    // 1. Poison. "All attacks targeting the figure gain +1" — it raises the *attack
    // value*, so it is part of what the modifier card multiplies and what shield is
    // then subtracted from. It used to be added at the very end instead, which both
    // dropped it out of a ×2 and lost it entirely whenever shield blocked the attack.
    const poisoned = conditions.includes(CreatureConditions.poison);
    const attackValue = baseAttack + (poisoned ? 1 : 0);

    // 2. Attack modifier. A miss short-circuits: no shield, no condition maths, and
    // nothing is used up — a null deals no damage, so no damage instance occurs.
    let damage = applyAttackModifier(attackValue, modifier);
    if (modifier === 'miss') {
      return { damage: 0, breakdown: ['Miss — no damage'], consumedConditions: [] };
    }
    breakdown.push(poisoned ? `Attack ${baseAttack} + poison = ${attackValue}` : `Attack ${baseAttack}`);
    if (modifier !== undefined && modifier !== null && modifier !== 0) {
      breakdown.push(`${attackModifierLabel(modifier)} = ${damage}`);
    }

    // 3. Shield, reduced by pierce and never negative — unless ignored outright, which
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

    // A fully blocked attack lands no instance of damage, so brittle and ward have
    // nothing to modify and stay on the target for the next attack.
    if (damage <= 0) {
      return { damage: 0, breakdown: [...breakdown, 'Blocked — no damage'], consumedConditions: [] };
    }

    // 4. Brittle doubles and ward halves (rounded down); held together they cancel.
    // All three cases are one-shot: the condition is spent modifying this instance of
    // damage and comes off the target, which is what `consumedConditions` reports.
    const brittle = conditions.includes(CreatureConditions.brittle);
    const ward = conditions.includes(CreatureConditions.ward);
    const consumedConditions: CreatureConditions[] = [];
    if (brittle && ward) {
      consumedConditions.push(CreatureConditions.brittle, CreatureConditions.ward);
      breakdown.push('brittle and ward cancel, both removed');
    } else if (brittle) {
      damage *= 2;
      consumedConditions.push(CreatureConditions.brittle);
      breakdown.push(`× brittle = ${damage}`);
    } else if (ward) {
      damage = Math.floor(damage / 2);
      consumedConditions.push(CreatureConditions.ward);
      breakdown.push(`÷ ward = ${damage}`);
    }

    return { damage: Math.max(damage, 0), breakdown, consumedConditions };
  }

  /**
   * What a target deals back to whoever just attacked it.
   *
   * Retaliate triggers on *being attacked*, not on taking damage, so it fires even
   * when the attack misses or is blocked outright — the caller applies it whenever an
   * attack was made. Range is the caller's problem: this app has no board, so whether
   * the attacker actually stood within the retaliate range is the player's call.
   */
  retaliateDamage(target: Pick<Creature, 'retaliate' | 'roundRetaliate'>): number {
    return Math.max((target.retaliate ?? 0) + (target.roundRetaliate ?? 0), 0);
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
