/**
 * Player (hero) ability card definitions.
 *
 * Data lives in `app/src/data/character-decks/<class>.json`, generated from
 * gloomhavensecretariat by `extract-character-decks.js` at the repo root and
 * hand-extended thereafter. See that folder's README for the authoring format.
 *
 * Deliberately separate from `MonsterDeckAction` in data-file-types.ts: monsters
 * have no notion of top/bottom halves or persistent slots, and their `type` is an
 * untyped string that this feature needs narrowed.
 *
 * **Every card entry must be self-contained.** No action may reference anything
 * outside its own card — no i18n keys, no lookup ids, no "see other card". Prose is
 * stored literally in `text`, summon stats inline in `summon`. The single exception
 * is `image`, a path under `/images`, for the rare printed detail this schema
 * genuinely cannot express.
 */

/** Action types the execution panel can apply to game state. */
export enum ExecutableActionType {
  attack = 'attack',
  heal = 'heal',
  condition = 'condition',
  /** Infuses the named element (`elements: ['ice']`). */
  element = 'element',
  /**
   * An optional bonus gated on elements being active. The player may take it; doing so
   * consumes the elements in `elements`. Never applied automatically — see
   * `consumeMode` for whether all listed elements are consumed or just one.
   */
  elementBonus = 'elementBonus',
  /**
   * HP the acting hero loses for playing this half — "suffer 1 damage". Mandatory and
   * unavoidable: unlike an attack it draws no modifier and is reduced by nothing, since
   * shield and ward answer an attack, not a cost the card charges its own player.
   * Always the hero, so it needs no `selfOnly` and never takes a target.
   */
  sufferDamage = 'sufferDamage',
  /**
   * An optional bonus paid for in HP instead of elements — the `elementBonus` bargain
   * with a different currency. `value` is the damage the hero suffers to take it, and
   * it is offered only while they have the HP to spare. Never applied automatically.
   */
  sufferDamageBonus = 'sufferDamageBonus',
  /**
   * A bonus gated on a printed condition this app has no state for — "if you are the
   * only hero adjacent to the target", "if an ally is affected by an element" — so
   * nothing computes whether it applies. The player reads `text` and judges it
   * themselves; the checkbox means "this is true right now," not "I choose this."
   * Never applied automatically, same as `elementBonus`/`sufferDamageBonus`.
   */
  textBonus = 'textBonus',
  /**
   * An optional bonus with nothing to check and nothing to judge — always offered,
   * free to take. For a card whose choice is genuinely unconditional: no element to
   * consume, no HP to spend, no printed condition to read and decide is true. Where
   * `textBonus` still asks the player to judge something ("if you are adjacent"),
   * `bonus` asks nothing at all — it's simply "take this, or don't." Never applied
   * automatically, same as the other three.
   */
  bonus = 'bonus',
  /** Immediate experience for the acting hero. */
  xp = 'xp',
  shield = 'shield',
  retaliate = 'retaliate',
  pierce = 'pierce',
  /**
   * Bypasses the target's shield entirely, beating any amount of pierce alongside it.
   * The subAction spelling, nested under an `attack` the way `condition`/`pierce` are.
   * Prefer the `ignoreArmor: true` **property** on the attack (see `CardAction`) —
   * this form stays supported for the cards already authored with it.
   */
  ignoreArmor = 'ignoreArmor',
}

/** Action types rendered for a human to read but never executed. */
export enum DisplayActionType {
  /** Literal prose in `text`. Authored cards should prefer this over `custom`. */
  text = 'text',
  /** Summon with its stats inline in `summon`. */
  summon = 'summon',
  /** A persistent-ability slot track, with its slots spelled out in `slots`. */
  persistentTrack = 'persistentTrack',
  forceBox = 'forceBox',
  boxFhSubActions = 'boxFhSubActions',
  concatenation = 'concatenation',
  concatenationSpacer = 'concatenationSpacer',
  extra = 'extra',
  grant = 'grant',
  trigger = 'trigger',
  fly = 'fly',
  hint = 'hint',
}

export type CardActionType = ExecutableActionType | DisplayActionType;

/** The six elements a card can infuse or consume. Matches `ElementType` in game-types.ts. */
export type ElementName = 'fire' | 'ice' | 'earth' | 'air' | 'light' | 'dark';

/**
 * The enhancement-sticker slots a card action can carry, per gloomhavensecretariat's
 * `EnhancementType`. Not applied by this app (no enhancement system), but kept on the
 * data because it is printed on the card.
 */
export type EnhancementTypeName = 'square' | 'circle' | 'diamond' | 'diamond_plus' | 'hex' | 'any';

/**
 * Every condition a `condition` action's `value` can name. The 12 real creature
 * conditions, plus `bless`/`curse` — attack-modifier deck cards that print as
 * conditions on a card but have no `CreatureConditions` entry (see
 * `NON_CREATURE_CONDITIONS`) and so are never applied.
 */
export type ConditionName =
  | 'poison' | 'wound' | 'muddle' | 'immobilize' | 'bane' | 'stun'
  | 'disarm' | 'brittle' | 'ward' | 'invisible' | 'strengthen' | 'regenerate'
  | 'bless' | 'curse';

/**
 * `bless` and `curse` appear as `condition` action values in the card data, but they
 * are attack-modifier deck cards rather than creature states and so are absent from
 * `CreatureConditions`. Execution must skip them; they still render as icons.
 */
export const NON_CREATURE_CONDITIONS: ReadonlySet<ConditionName> = new Set(['bless', 'curse']);

/**
 * Conditions you put on a friend, not an enemy. A half whose only effect is one of
 * these targets allies — otherwise the panel would offer monsters for snowflake's
 * "Frigid Growth" (Strengthen) or "Storm Wall" (Ward) and the buff would land on the
 * wrong figure. Everything not listed here is a debuff and targets enemies.
 */
export const BENEFICIAL_CONDITIONS: ReadonlySet<ConditionName> = new Set([
  'strengthen', 'regenerate', 'ward', 'invisible', 'bless',
]);

/**
 * The four action types that are an *offer* rather than an effect: the player may
 * take one — paying its cost (elements for `elementBonus`, HP for `sufferDamageBonus`),
 * judging its printed condition true (`textBonus`), or simply choosing to (`bonus`,
 * unconditional) — and only then does anything under it apply. Every "what does this
 * half do" walk has to skip their subtrees, or a card grants for free what it means to
 * gate.
 */
export const CONDITIONAL_BONUS_TYPES: ReadonlySet<string> = new Set([
  ExecutableActionType.elementBonus,
  ExecutableActionType.sufferDamageBonus,
  ExecutableActionType.textBonus,
  ExecutableActionType.bonus,
]);

/** Whether an action is an offer whose contents are locked behind taking it. */
export function isConditionalBonus(action: CardAction): boolean {
  return CONDITIONAL_BONUS_TYPES.has(String(action.type));
}

/** A slot on a persistent-ability track, and the XP for advancing into it. */
export interface CardPersistentSlot {
  xp?: number;
}

/**
 * A summoned figure, with everything the card prints held inline.
 *
 * `image` is the schema's one sanctioned escape hatch: a path under `/images` for a
 * printed detail that cannot be expressed as stats or actions.
 */
export interface CardSummon {
  name: string;

  // --- Printed stats. A summon gets the full monster stat line, since it is a real
  // figure on the board: it acts, takes damage, and can be healed or conditioned.
  health?: number | string;
  attack?: number | string;
  movement?: number | string;
  range?: number | string;
  /** Shield, as printed on the token. */
  armor?: number | string;
  retaliate?: number | string;
  /** Range of the retaliate, when the token prints one. */
  retaliateRange?: number | string;
  /** How many figures its attack hits. Defaults to 1. */
  attackTarget?: number | string;
  flying?: boolean;
  /** Conditions the summon cannot receive. */
  immunities?: ConditionName[];

  /** How many figures are summoned. Defaults to 1. */
  count?: number;
  /**
   * Abilities printed on the token, e.g. `{ type: 'pierce', value: 3 }`. Condition
   * actions here are inflicted by its attacks and render as icons on its row, exactly
   * as a monster's own condition actions do.
   */
  abilities?: CardAction[];
  /** Literal prose for anything the fields above cannot carry. */
  notes?: string[];
  /** Path under `/images`, e.g. 'summons/fh.png'. */
  image?: string;
}

export interface CardAction {
  /**
   * A `CardActionType` in practice. Typed as a widened string so unrecognised data
   * from a future deck renders as a plain label instead of throwing.
   */
  type: CardActionType | string;
  /**
   * The source data mixes `1` and `"1"` — always read through `actionValue()`.
   * For a `condition` action this is a `ConditionName`; for `specialTarget` it is a
   * gloomhavensecretariat `ActionSpecialTarget` name, optionally suffixed `:N` for a
   * count (e.g. `"allies:3"`). Left as `string | number` rather than narrowed to
   * either, since the same field carries plain numbers for most other action types.
   */
  value?: string | number;
  valueType?: 'plus' | 'minus' | 'add' | 'subtract' | 'fixed';
  subActions?: CardAction[];
  /** FH convention for a modifier riding on its parent action; renders smaller. */
  small?: boolean;
  /**
   * `heal`/`condition` only. Applies to the acting hero rather than the picked
   * target — a self-heal or a self-inflicted condition (Strengthen, Muddle, …)
   * printed alongside an attack or a targeted effect on the same half. Excluded
   * from `selectedHealValue`/`selectedConditions` (the target-facing values) and
   * applied instead through `selectedSelfHealValue`/`selectedSelfConditions` in the
   * execution panel, so it never needs a picked target and never lands on one.
   */
  selfOnly?: boolean;
  /**
   * `condition` or `attack` only. Marks a picked (not self-inflicted) effect as
   * landing on an ally/summon instead of an enemy:
   *
   * - on a `condition`, a card that curses or wounds a targeted teammate rather than
   *   the acting hero (that's `selfOnly`) or a foe (the default). `targetsAreHeroes`
   *   in the execution panel switches the target strip to heroes/summons when every
   *   non-self condition on the half is either beneficial or flagged this way.
   * - on an `attack`, a card whose strike is aimed at an ally/summon instead of an
   *   enemy — e.g. a friendly-fire drawback, or a "deal damage to your summon to
   *   trigger X" cost. Scoped to that one `attack` action (per-strike for a
   *   multi-attack half, same as `pierce`/`condition`), so only that strike offers
   *   allies; another attack on the same half without the flag still targets enemies.
   *
   * Still needs a target chosen from the strip either way. Mutually exclusive with
   * `selfOnly` — the validator rejects both on the same action.
   */
  targetAlly?: boolean;
  /**
   * `attack` only. This strike bypasses the target's shield entirely — its `armor` and
   * `roundArmor` both count as 0, which beats any amount of pierce, and it draws no
   * attack modifier either (see `needsModifier`): this app treats it as direct damage.
   * Poison's +1 does not apply to it for the same reason.
   *
   * The preferred spelling, parallel to `multiTarget` and `targetAlly` — it carries no
   * value and belongs to exactly one attack, so it reads better as a flag than as a
   * child action. The older `{ "type": "ignoreArmor" }` subAction means the same thing
   * and still works; `selectedIgnoreArmor` accepts either, and both scope per-strike in
   * a multi-attack half.
   */
  ignoreArmor?: boolean;
  enhancementTypes?: EnhancementTypeName[];
  /**
   * This action hits more than one target. `true` leaves the count open — "each
   * adjacent enemy", an unknown number the app has no board to count, so the player
   * picks as many as apply. A **number** is a hard cap the card prints: `2` for
   * "attack up to 2 enemies", and the picker stops offering targets once that many
   * have been hit.
   *
   * On an `attack`, every target is still a separate strike with its own modifier
   * draw, and no target may be hit twice by the same attack action — two independent
   * `attack` actions are how a card hits one enemy twice (see `collectAttacks`).
   * One pierce value applies to all of them, but each target's own armour and
   * conditions compute its damage independently. Never combine with `elementBonus`'s
   * own nested `attack` — that one only ever adds to the base value (see
   * `takenBonusAttack` in the execution panel), it never targets on its own.
   */
  multiTarget?: boolean | number;
  /**
   * Literal English prose. The only place prose lives — never an i18n key. On a
   * `textBonus`, this is the printed condition itself ("if you are the only hero
   * adjacent to the target") — required there, since it's the only thing telling the
   * player what they're judging.
   */
  text?: string;

  /**
   * `element`: the elements infused.
   * `elementBonus`: the elements consumed when the player takes the bonus.
   */
  elements?: ElementName[];
  /**
   * `elementBonus`: 'all' consumes every element in `elements`; 'any' consumes
   * exactly one of them, the player's choice. `element` reads the same 'all'/'any'
   * the same way, aimed at infusing instead: 'all' (the default — need not be
   * written) infuses every one named; 'any' infuses only whichever one the player
   * picks. Meaningless — and rejected — on an `element` naming just one.
   */
  consumeMode?: 'all' | 'any';

  /** `summon` only. */
  summon?: CardSummon;
  /** `persistentTrack` only. */
  slots?: CardPersistentSlot[];
  /** Path under `/images` for a detail this schema cannot express. */
  image?: string;
}

export interface CardHalf {
  /**
   * Empty for halves with no action data yet (878 of 1008 at time of writing) — see
   * `hasCardData()`. The panel degrades to the card name plus manual entry and the
   * default actions for those.
   */
  actions: CardAction[];
  /**
   * Experience gained for playing this half, as printed in its corner. Applied to the
   * hero on execution. XP that depends on a choice (consuming an element, say) belongs
   * on that `elementBonus` action instead, not here.
   */
  xp?: number;
  lost?: boolean;
  persistent?: boolean;
  round?: boolean;
  loss?: boolean;
}

export interface CharacterAbilityCard {
  /** Unique across all 17 Frosthaven decks, so it alone identifies a card. */
  cardId: number;
  name: string;
  /** 1..9, or 'X' for level-X cards, which are available from level 1. */
  level: number | 'X';
  /** As printed. Blinkblade packs its two identities into one value: 2050 = 20/50. */
  initiative: number;
  initiativeFast?: number;
  initiativeSlow?: number;
  top: CardHalf;
  bottom: CardHalf;
}

/** The 17 Frosthaven classes, matching `Creature.type` for heroes. */
export type CharacterClassName =
  | 'astral' | 'banner-spear' | 'blinkblade' | 'boneshaper' | 'coral'
  | 'deathwalker' | 'drifter' | 'drill' | 'fist' | 'geminate' | 'kelp'
  | 'meteor' | 'prism' | 'shackles' | 'shards' | 'snowflake' | 'trap';

export interface CharacterDeck {
  characterClass: CharacterClassName;
  edition: string;
  handSize?: number;
  cards: CharacterAbilityCard[];
}

/** Which of a hero's two played cards a half came from. */
export type CardSlot = 'A' | 'B';

/** How a card half was spent. */
export type HalfDisposition = 'executed' | 'skipped';

export type CardHalfName = 'top' | 'bottom';

/**
 * The two actions every character may always take instead of a card half.
 * `slot: 'default'` is legal against either card.
 */
export const DEFAULT_ATTACK: CardHalf = {
  actions: [{ type: ExecutableActionType.attack, value: 2 }],
};

/**
 * Not an `ExecutableActionType` — moving isn't board state this app tracks — but the
 * default itself is a system affordance, not authored card data, so it is exempt from
 * the "no non-board actions" rule that governs `character-decks/*.json`.
 */
export const DEFAULT_MOVE: CardHalf = {
  actions: [{ type: 'move', value: 2 }],
};

/**
 * Whether a half has any real action data, as opposed to an empty/unauthored stub.
 * Tolerates a half with no `actions` array at all (a malformed hand-edit — the
 * validator rejects this in committed data, but a half being edited live shouldn't be
 * able to crash the whole panel's rendering over it) the same way an unauthored stub
 * already degrades to manual entry.
 */
export function hasCardData(half: CardHalf | null | undefined): boolean {
  return !!half && Array.isArray(half.actions) && half.actions.length > 0;
}

/** Coerces an action value to a number, tolerating the data's mixed string/number form. */
export function actionValue(action: CardAction | undefined): number {
  const n = Number(action?.value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * The printed "Attack X" — a value the card leaves to the player, typed into the
 * execution panel when the half is resolved rather than fixed in the data.
 *
 * Spelled as the literal string `"X"`, matching both the printed card and the way this
 * schema already writes a variable card `level`. This is the one place that literal is
 * interpreted: everywhere else keeps reading values through `actionValue`, which
 * coerces `"X"` to 0 and so stays safe for any code that has not been taught about it.
 *
 * An entered 0 is a real attack, not an absent one — it still takes a target, draws a
 * modifier, provokes retaliate and lands whatever conditions ride on it.
 */
export function isManualValue(action: CardAction | undefined): boolean {
  return typeof action?.value === 'string' && action.value.trim().toUpperCase() === 'X';
}

/** Depth-first search for the first action of a given type in a half's action tree. */
export function findAction(actions: CardAction[] | undefined, type: string): CardAction | null {
  for (const action of actions ?? []) {
    if (action.type === type) return action;
    const nested = findAction(action.subActions, type);
    if (nested) return nested;
  }
  return null;
}

/** Collects every action of a given type in a half's action tree. */
export function collectActions(actions: CardAction[] | undefined, type: string): CardAction[] {
  const out: CardAction[] = [];
  for (const action of actions ?? []) {
    if (action.type === type) out.push(action);
    out.push(...collectActions(action.subActions, type));
  }
  return out;
}

/**
 * Every independent attack in a half — its own modifier draw and damage instance —
 * as opposed to an `attack` nested inside an `elementBonus`'s `subActions`, which only
 * adds to the base attack's value if the player takes the bonus (see `takenBonusAttack`
 * in the execution panel). A half with more than one of these is a "multi-attack" half
 * (e.g. drifter's "Vile Assault": Attack 2 Poison, Attack 2 Wound) — the panel resolves
 * them one at a time, see `currentAttack` there.
 */
export function collectAttacks(actions: CardAction[] | undefined): CardAction[] {
  const out: CardAction[] = [];
  for (const action of actions ?? []) {
    if (action.type === ExecutableActionType.attack) {
      out.push(action);
      continue;
    }
    if (isConditionalBonus(action)) continue;
    out.push(...collectAttacks(action.subActions));
  }
  return out;
}

/**
 * Same walk as `collectActions`, but skipping two kinds of subtree:
 *
 * - when `currentAttack` is given, every *other* independent attack, so a condition or
 *   pierce nested under one attack of a multi-attack half doesn't leak into another
 *   attack's resolution;
 * - always, a conditional bonus, because everything under one is an **offer**. Whatever
 *   a bonus grants only applies if the player takes it and pays its cost — elements for
 *   `elementBonus`, HP for `sufferDamageBonus` — so it must never be picked up by a
 *   plain "what does this half do" scan; that's how a Disarm locked behind a Light bonus
 *   (snowflake #342) used to land for free. The taken bonuses are read separately, from
 *   `collectConditionalBonuses` plus the panel's `takenBonus*` getters. Matches how
 *   `collectAttacks` and `sumUnconditionalXp` already treat them.
 *
 * Actions nested under neither (a self-buff alongside a single attack, say) always
 * apply.
 */
export function collectActionsScoped(
  actions: CardAction[] | undefined,
  type: string,
  currentAttack: CardAction | null,
): CardAction[] {
  const out: CardAction[] = [];
  for (const action of actions ?? []) {
    if (action.type === type) out.push(action);
    // The bonus action itself is collected above (that's how collectConditionalBonuses
    // finds them); only what it *grants* is out of reach until it's taken.
    if (isConditionalBonus(action)) continue;
    if (currentAttack && action.type === ExecutableActionType.attack && action !== currentAttack) continue;
    out.push(...collectActionsScoped(action.subActions, type, currentAttack));
  }
  return out;
}

/** First match of `collectActionsScoped`, for single-valued fields like `pierce`. */
export function findActionScoped(
  actions: CardAction[] | undefined,
  type: string,
  currentAttack: CardAction | null,
): CardAction | null {
  return collectActionsScoped(actions, type, currentAttack)[0] ?? null;
}

/**
 * Every conditional bonus in a half — element-paid and HP-paid alike — in document
 * order. Scoped to `currentAttack` when given, the same way `collectActionsScoped` is.
 *
 * These are offers, not effects: the panel shows one only when its cost can be met, and
 * charges that cost only if the player takes it. Both kinds share one list because they
 * share one flow: the panel indexes `takenBonuses` into exactly this order.
 */
export function collectConditionalBonuses(
  actions: CardAction[] | undefined,
  currentAttack: CardAction | null = null,
): CardAction[] {
  const out: CardAction[] = [];
  for (const action of actions ?? []) {
    if (isConditionalBonus(action)) {
      // Collected, but not descended into: a bonus nested inside another bonus is not
      // a thing any card prints, and the inner one would have no cost of its own.
      out.push(action);
      continue;
    }
    if (currentAttack && action.type === ExecutableActionType.attack && action !== currentAttack) continue;
    out.push(...collectConditionalBonuses(action.subActions, currentAttack));
  }
  return out;
}

/**
 * Total immediate XP in an action subtree, excluding anything under a conditional
 * bonus — that XP is only earned if the player takes the bonus.
 */
export function sumUnconditionalXp(actions: CardAction[] | undefined): number {
  let total = 0;
  for (const action of actions ?? []) {
    if (isConditionalBonus(action)) continue;
    if (action.type === ExecutableActionType.xp) total += actionValue(action);
    total += sumUnconditionalXp(action.subActions);
  }
  return total;
}

/**
 * HP the hero pays to take a bonus: the `value` of a `sufferDamageBonus`, and zero for
 * an `elementBonus`, which is paid for in elements instead.
 */
export function bonusSelfDamage(bonus: CardAction): number {
  if (bonus.type !== ExecutableActionType.sufferDamageBonus) return 0;
  return Math.max(actionValue(bonus), 0);
}

/**
 * HP the acting hero loses outright for playing this half — every `sufferDamage` on it,
 * summed. Scoped like every other "what does this half do" walk, so a `sufferDamage`
 * that only exists inside a bonus is not charged until that bonus is taken.
 *
 * **Not the panel's own path.** `selectedSelfDamage` walks the same actions itself,
 * because a `"value": "X"` cost is worth whatever the player typed into the panel —
 * state this pure function has no access to. Use it only where that distinction
 * genuinely does not matter; anything resolving a real half wants the panel's value.
 */
export function sumSelfDamage(actions: CardAction[] | undefined): number {
  return collectActionsScoped(actions, ExecutableActionType.sufferDamage, null)
    .reduce((total, action) => total + Math.max(actionValue(action), 0), 0);
}

/** XP granted by taking a specific conditional bonus. */
export function bonusXp(bonus: CardAction): number {
  let total = 0;
  for (const action of bonus.subActions ?? []) {
    if (action.type === ExecutableActionType.xp) total += actionValue(action);
    total += sumUnconditionalXp(action.subActions);
  }
  return total;
}
