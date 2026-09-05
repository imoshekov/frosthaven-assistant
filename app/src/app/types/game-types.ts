import { MonsterAbilityCard } from "./data-file-types";
import { CardSlot, HalfDisposition } from "./character-card-types";

export enum CreatureConditions {
  poison = "poison",
  wound = "wound",
  muddle = "muddle",
  immobilize = "immobilize",
  bane = "bane",
  stun = "stun",
  disarm = "disarm",
  brittle = "brittle",
  ward = "ward",
  invisible = "invisible",
  strengthen = "strengthen",
  regenerate = "regenerate"
}

/**
 * Conditions that only ever benefit their recipient. By the rules these can only be
 * placed on allies (a hero/summon on another hero/summon, a monster on another
 * monster) - never on an enemy of whoever is applying them.
 */
export const POSITIVE_CONDITIONS: CreatureConditions[] = [
  CreatureConditions.ward,
  CreatureConditions.invisible,
  CreatureConditions.strengthen,
  CreatureConditions.regenerate
];

export interface CreatureAction {
  type: string;
  value?: string | number;
}

export type CreatureRetaliate = {
  value: number;   
  range: number;   
};


export interface Creature {
  id?: string;
  name?: string;
  /** Phonetic spelling of `name` for speech synthesis. Falls back to `name` when unset. */
  namePronunciation?: string;
  standee?: number | string,
  type?: string;
  aggressive?: boolean;
  /**
   * True for a summoned figure. A summon is friendly like a hero (`aggressive` is
   * false) but statted and managed like a monster, so most hero-only logic keys off
   * `isHero()` rather than `!aggressive`. Summons only ever enter play through a card's
   * summon action.
   */
  isSummon?: boolean;
  /**
   * The hero who summoned it. A summon has no initiative of its own — it acts on its
   * owner's, immediately before them — so ordering borrows the owner's value.
   */
  summonOwnerId?: string;
  /** Token art for a summon, as a path under `/images`, taken from the card. */
  summonImage?: string;
  /** Literal prose printed on a summon token that no stat field can express. */
  summonNotes?: string[];
  /** Attack range printed on a summon token. Monsters get range from ability cards. */
  range?: number;
  isElite?: boolean; 
  level?: number; 
  hp?: number;
  maxHp?: number;
  attack?: number;
  attackTarget?: number;
  /** Fixed armor penetration a summon's printed attack carries. Monsters get pierce from the attack-modifier deck instead. */
  pierce?: number;
  movement?: number | null;
  initiative?: number;
  hiddenInitiative?: number | null;
  armor?: number;
  retaliate?: number;
  retaliateRange?: number;
  flying?: boolean;
  boss?: boolean;
  conditions?: CreatureConditions[];
  /** Round number each active condition was applied on, keyed by condition. */
  conditionRounds?: Partial<Record<CreatureConditions, number>>;
  immunities?: CreatureConditions[];
  roundArmor?: number,
  roundRetaliate?: number,
  sessionExperience?: number;
  log?: any[];
  traits?: string[],
  player2?: string,
  player3?: string,
  player4?: string;
  actions?: CreatureAction[];
  abilityCards?: MonsterAbilityCard[]; 
  totalXp?: number;

  // --- Hero card turn state (predicates live in turn-state.util.ts) -----------
  // Only meaningful when `aggressive` is false. Monster turns stay fully manual.

  /** The second played card's initiative, before reveal. Mirrors `hiddenInitiative`. */
  secondaryHiddenInitiative?: number | null;
  /** The second played card's initiative, once revealed. Mirrors `initiative`. */
  secondaryInitiative?: number;

  /**
   * The two played cards, held as ids rather than objects: the whole `Creature[]` is
   * broadcast on every state change, and monsters already ship entire decks that way.
   * `cardId` is unique across all 17 Frosthaven decks, so an id alone resolves a card.
   */
  cardAId?: number | null;
  cardBId?: number | null;

  /** Which card supplied the spent top half, and whether it was executed or skipped. */
  topHalfSlot?: CardSlot | null;
  topHalfState?: HalfDisposition | null;
  bottomHalfSlot?: CardSlot | null;
  bottomHalfState?: HalfDisposition | null;

  /** Set when both halves are spent, or forced by "End Turn Early". */
  isTurnCompleted?: boolean;
}


export enum ElementState {
  None = 'none',
  Full = 'full',
  Half = 'half'
}

export enum ElementType {
  Fire = 'fire',
  Ice = 'ice',
  Earth = 'earth',
  Air = 'air',
  Light = 'light',
  Dark = 'dark'
}

export interface Element {
  type: ElementType;
  state: ElementState;
  /** Rounds the element keeps its current state. -1 holds it until manually released. */
  holdRounds?: number;
}

export const ELEMENT_HOLD_INDEFINITE = -1;

/** Values cycled through by the element hold control. */
export const ELEMENT_HOLD_CYCLE = [0, 1, 2, 3, ELEMENT_HOLD_INDEFINITE];

export const LEVEL_XP = [0, 45, 95, 150, 210, 275, 345, 420, 500]; 
export const MAX_LEVEL = 9;