/**
 * Pure predicates over a hero's initiative and card-turn state.
 *
 * "Ready" was previously computed inline in four places — AppContext.revealIfAllReady,
 * InitiativeBubbleComponent.initiativesLocked, CreatureGroupHeaderComponent.initiativesRevealed
 * and InitiativeNagService.findLoneStaller. Now that readiness means *both* cards are
 * submitted, those four must agree, so the definition lives here and they all call it.
 */
import { Creature } from './game-types';
import { CardHalfName, CardSlot } from './character-card-types';

/** Initiative values are 1..99; 0 and null both mean "nothing submitted". */
function isSet(value: number | null | undefined): boolean {
  return typeof value === 'number' && value > 0;
}

/**
 * A player character. Deliberately *not* just `!aggressive`: summons are friendly too,
 * but they never submit initiative, hold cards, gain XP or block the reveal, so every
 * hero-only rule has to exclude them.
 */
export function isHero(creature: Creature): boolean {
  return !creature.aggressive && !creature.isSummon;
}

/** A summoned figure: friendly like a hero, statted like a monster. */
export function isSummon(creature: Creature): boolean {
  return !!creature.isSummon;
}

/**
 * The initiative a creature is ordered by. A summon has none of its own — it acts on
 * its owner's initiative, immediately before them — so it borrows the owner's value.
 */
export function effectiveInitiative(creature: Creature, creatures: Creature[]): number {
  if (creature.isSummon && creature.summonOwnerId) {
    const owner = creatures.find(c => c.id === creature.summonOwnerId);
    if (owner) return owner.initiative ?? 0;
  }
  return creature.initiative ?? 0;
}

/**
 * The second card's initiative a creature is tie-broken by, when two turn-order
 * entries land on the same `effectiveInitiative()`. A summon borrows its owner's the
 * same way it borrows the main one, so a tie between two heroes still resolves their
 * summons into the right clusters rather than lumping every tied summon together
 * ahead of every tied hero.
 */
export function effectiveSecondaryInitiative(creature: Creature, creatures: Creature[]): number {
  if (creature.isSummon && creature.summonOwnerId) {
    const owner = creatures.find(c => c.id === creature.summonOwnerId);
    if (owner) return owner.secondaryInitiative ?? 0;
  }
  return creature.secondaryInitiative ?? 0;
}

/** True once this hero's initiatives are public. */
export function isInitiativeRevealed(creature: Creature): boolean {
  return isSet(creature.initiative) && !isSet(creature.hiddenInitiative);
}

/**
 * True when the hero has committed their turn — either both secret initiatives are in,
 * or they have already been revealed.
 */
export function isInitiativeSubmitted(creature: Creature): boolean {
  if (isInitiativeRevealed(creature)) return true;
  return isSet(creature.hiddenInitiative) && isSet(creature.secondaryHiddenInitiative);
}

/** True when a submission is started but incomplete — one card entered, not the other. */
export function isInitiativePartiallySubmitted(creature: Creature): boolean {
  if (isInitiativeSubmitted(creature)) return false;
  return isSet(creature.hiddenInitiative) || isSet(creature.secondaryHiddenInitiative);
}

/** Every hero has submitted, so initiatives may be revealed. */
export function allHeroesSubmitted(creatures: Creature[]): boolean {
  const heroes = creatures.filter(isHero);
  return heroes.length > 0 && heroes.every(isInitiativeSubmitted);
}

/** At least one hero is mid-submission, so other players' numbers must stay hidden. */
export function anyHeroPending(creatures: Creature[]): boolean {
  return creatures.filter(isHero).some(c => isSet(c.hiddenInitiative));
}

/** The initiative that sets this hero's place in turn order: always the main card's. */
export function actingInitiative(creature: Creature): number {
  return creature.initiative ?? 0;
}

/** The second card's initiative, for display alongside the acting one. */
export function trailingInitiative(creature: Creature): number {
  return creature.secondaryInitiative ?? 0;
}

export function halfDisposition(creature: Creature, half: CardHalfName) {
  return half === 'top' ? creature.topHalfState ?? null : creature.bottomHalfState ?? null;
}

export function halfSlot(creature: Creature, half: CardHalfName): CardSlot | null {
  return (half === 'top' ? creature.topHalfSlot : creature.bottomHalfSlot) ?? null;
}

/** Spent = executed or skipped; either way the half is no longer available. */
export function isHalfSpent(creature: Creature, half: CardHalfName): boolean {
  return halfDisposition(creature, half) !== null;
}

/**
 * The flags the feature request named. Kept as derived helpers rather than stored
 * booleans so they cannot drift out of sync with the disposition they describe.
 */
export function topActionExecuted(creature: Creature): boolean {
  return creature.topHalfState === 'executed';
}

export function bottomActionExecuted(creature: Creature): boolean {
  return creature.bottomHalfState === 'executed';
}

export function bothHalvesSpent(creature: Creature): boolean {
  return isHalfSpent(creature, 'top') && isHalfSpent(creature, 'bottom');
}

export interface HalfRef {
  slot: CardSlot | 'default';
  half: CardHalfName;
}

/**
 * Which card halves the hero may still play.
 *
 * A turn is one top and one bottom, and never two halves of the same card — so it is
 * top-A + bottom-B, or bottom-A + top-B. The two default actions are always legal
 * because they come from the character mat rather than a card.
 */
export function legalHalves(creature: Creature): HalfRef[] {
  const out: HalfRef[] = [];
  const slots: (CardSlot | 'default')[] = ['A', 'B', 'default'];

  for (const half of ['top', 'bottom'] as CardHalfName[]) {
    if (isHalfSpent(creature, half)) continue;
    const otherHalf: CardHalfName = half === 'top' ? 'bottom' : 'top';
    const usedByOtherHalf = halfSlot(creature, otherHalf);

    for (const slot of slots) {
      // A card that already supplied the other half cannot supply this one too.
      if (slot !== 'default' && slot === usedByOtherHalf) continue;
      out.push({ slot, half });
    }
  }
  return out;
}

export function isHalfLegal(creature: Creature, slot: CardSlot | 'default', half: CardHalfName): boolean {
  return legalHalves(creature).some(h => h.slot === slot && h.half === half);
}
