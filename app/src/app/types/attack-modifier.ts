/**
 * The attack-modifier deck values a player can draw, for the execution panel's
 * quick-apply row. This models the *values*, not the deck itself — no shuffling,
 * no card tracking; the physical deck stays the source of truth.
 */
export type AttackModifier = 'miss' | -2 | -1 | 0 | 1 | 2 | 'x2';

export const ATTACK_MODIFIERS: { value: AttackModifier; label: string; title: string }[] = [
  { value: 'miss', label: 'Miss', title: 'Null — the attack deals no damage' },
  { value: -2, label: '−2', title: 'Minus 2' },
  { value: -1, label: '−1', title: 'Minus 1' },
  { value: 0, label: '±0', title: 'No modifier' },
  { value: 1, label: '+1', title: 'Plus 1' },
  { value: 2, label: '+2', title: 'Plus 2' },
  { value: 'x2', label: '×2', title: 'Double — the attack value is doubled' },
];

/**
 * Applies a drawn modifier to a base attack value.
 *
 * A miss deals nothing. ×2 doubles the printed attack, and additive modifiers are
 * applied before shield — both per the rules, and both handled here rather than in the
 * damage pipeline so the two are independently testable.
 */
export function applyAttackModifier(baseAttack: number, modifier: AttackModifier | null | undefined): number {
  if (modifier === 'miss') return 0;
  if (modifier === 'x2') return Math.max(baseAttack * 2, 0);
  if (typeof modifier === 'number') return Math.max(baseAttack + modifier, 0);
  return Math.max(baseAttack, 0);
}

export function attackModifierLabel(modifier: AttackModifier | null | undefined): string {
  return ATTACK_MODIFIERS.find(m => m.value === modifier)?.label ?? '';
}
