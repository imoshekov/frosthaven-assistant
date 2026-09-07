import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AppContext, CustomAttackResult, HalfEffectOnTarget } from '../../../app-context';
import { Creature, CreatureConditions, ElementState, ElementType } from '../../../types/game-types';
import {
  CardAction,
  CardHalf,
  CardHalfName,
  CardSlot,
  CardSummon,
  CharacterAbilityCard,
  ConditionName,
  DEFAULT_ATTACK,
  DEFAULT_MOVE,
  BENEFICIAL_CONDITIONS,
  NON_CREATURE_CONDITIONS,
  actionValue,
  bonusSelfDamage,
  bonusXp,
  collectActions,
  collectAttacks,
  collectActionsScoped,
  collectConditionalBonuses,
  findAction,
  findActionScoped,
  hasCardData,
  isManualValue,
  sumUnconditionalXp,
} from '../../../types/character-card-types';
import {
  ATTACK_MODIFIERS,
  AttackModifier,
  applyAttackModifier,
} from '../../../types/attack-modifier';
import {
  bothHalvesSpent,
  halfDisposition,
  halfSlot,
  isHalfLegal,
  isHalfSpent,
} from '../../../types/turn-state.util';
import { CardCandidate, CharacterDeckService } from '../../../services/character-deck.service';
import { DamageService } from '../../../services/damage.service';
import { LogService } from '../../../services/log.service';
import { XpService } from '../../../services/xp.service';
import { CardActionComponent } from './card-action.component';

/** A selectable card half: one of the two played cards, or a default action. */
export type HalfSource = CardSlot | 'default';

interface HalfTile {
  source: HalfSource;
  half: CardHalfName;
  /** Null for the default actions and for unresolved slots. */
  card: CharacterAbilityCard | null;
  content: CardHalf | null;
  label: string;
}

@Component({
  selector: 'app-player-card-execution-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, CardActionComponent],
  templateUrl: './player-card-execution-panel.component.html',
  styleUrls: ['./player-card-execution-panel.component.scss'],
})
export class PlayerCardExecutionPanelComponent implements OnInit, OnDestroy {
  readonly modifiers = ATTACK_MODIFIERS;
  readonly conditionList = Object.values(CreatureConditions);
  /** Typed so strictTemplates can narrow it where the template iterates slots. */
  readonly slots: CardSlot[] = ['A', 'B'];

  /** The half the user is currently resolving. */
  selected: { source: HalfSource; half: CardHalfName } | null = null;
  targetId: string | null = null;
  /**
   * Targets for a multi-target action with *no* attack behind it — a condition or heal
   * on "each adjacent enemy". Those have no modifier to draw, so every target is
   * picked at once. A multi-target attack does not use this: it resolves one target at
   * a time through `targetId`, since each target draws its own modifier.
   */
  selectedTargetIds = new Set<string>();
  /**
   * Targets already struck by the attack action being resolved. No enemy may be hit
   * twice by the same attack action, so these drop out of `targetOptions`. Cleared
   * when the next attack action starts, which is what lets a second attack action on
   * the same half hit an enemy the first one already hit.
   */
  struckTargetIds = new Set<string>();
  /**
   * The drawn attack-modifier card, or null for "nothing drawn yet" — which is why
   * this is not initialised to `0`: ±0 is a real card the player can draw, and an
   * attack must not be executable until one of the seven has actually been drawn
   * (see `needsModifier`). Cleared back to null after every strike.
   */
  modifier: AttackModifier | null = null;
  /**
   * Index into `selectedAttacks` of the strike currently being resolved. A
   * multi-attack half (two independent `attack` actions, e.g. "Attack 2 Poison, Attack
   * 2 Wound") is resolved one attack at a time: each gets its own target, modifier
   * draw and damage instance before the next is offered. Reset on every half selection.
   */
  attackIndex = 0;
  /**
   * Whether the half's separate heal-then-attack step (see `isHealBeforeAttack`) has
   * already applied its heal. A half mixing a target-facing heal with an attack — e.g.
   * shackles "Reversal of Fate": Heal 5 to an ally, Attack 5 to an enemy — needs two
   * independent targets, so the heal resolves first as its own step before the attack
   * (or attacks) that follow. Reset on every half selection.
   */
  healStepDone = false;
  /**
   * Per-attack value adjustments from the +/- buttons, keyed by index into
   * `selectedAttacks` — for a bonus the card itself can't know about (an item, an
   * ally's buff). Deliberately outlives the individual strikes of a multi-target
   * attack, so the bonus applies to every target it hits, and is dropped with the
   * rest of the half's resolution state once the half is spent.
   */
  attackAdjustments = new Map<number, number>();
  /**
   * The +/- adjustment on the half's heal value, for a bonus the card can't know
   * about — the same idea as `attackAdjustments`, but a half has at most one
   * target-facing (or one self-only) heal, so this doesn't need to be keyed by
   * index. Reset with the rest of the half's resolution state.
   */
  healAdjustment = 0;
  /**
   * The value typed in for a `"value": "X"` heal. Unindexed for the same reason
   * `healAdjustment` is: a half prints at most one target-facing heal and one
   * self-only one, so there is never a second box to keep apart.
   */
  manualHealValue = 0;
  /**
   * The value typed in for a `"value": "X"` sufferDamage — "Suffer X, where X is the
   * number of enemies hit," say. Unindexed for the same reason `manualHealValue` is: a
   * half charges self-damage once, never per-strike, so there is only ever one box.
   */
  manualSelfDamageValue = 0;
  /** Attack value typed in by hand, for halves with no authored action data. */
  manualAttack = 0;
  /**
   * Values typed in for the half's `"value": "X"` attacks, keyed by their index in
   * `selectedAttacks` — the same keying as `attackAdjustments`, and for the same
   * reason: a multi-attack half can pair a variable strike with a fixed one, and the
   * two must not share a box. Distinct from `manualAttack`, which serves a half with
   * no authored data at all rather than an authored attack whose value is left open.
   */
  manualAttackValues = new Map<number, number>();
  /**
   * Whether the target's retaliate comes back at the hero. On by default, because an
   * attack that provokes it is the normal case, but the app has no board and so cannot
   * know whether the hero stood inside the retaliate range — a ranged attacker turns
   * this off. Reset with each half.
   */
  applyRetaliate = true;

  /**
   * Values handed back from the attack modal after "Custom…", once the player
   * confirms there. Set, they override the card-derived attack/pierce for the
   * currently-selected half; the drawn attack-modifier row is ignored, since these
   * already are the final numbers. Cleared on every new half selection and after
   * Execute applies them.
   */
  customOverride: CustomAttackResult | null = null;

  /**
   * Conditional bonuses the player has chosen to take, keyed by their index in
   * `selectedBonuses`. Taking one pays its cost on execution — the element(s) for an
   * `elementBonus`, HP for a `sufferDamageBonus`.
   */
  takenBonuses = new Set<number>();
  /**
   * For a bonus that consumes one of several elements ("ice or air"), which one the
   * player picked. Keyed the same way.
   */
  bonusElementChoice = new Map<number, ElementType>();
  /**
   * For an `element` action printing more than one element with `consumeMode: 'any'`
   * ("infuse ICE or AIR"), which one the player picked to actually infuse. Keyed by
   * that action's index among `elementActions` — the same indexing scheme
   * `bonusElementChoice` uses for bonuses, kept separate because infusing is never an
   * opt-in bonus: it always happens, so there's no "taken" state to key off of, only
   * which element.
   */
  infuseElementChoice = new Map<number, ElementType>();

  /** Candidates per slot, when an initiative resolves to more than one card. */
  candidatesA: CardCandidate[] = [];
  candidatesB: CardCandidate[] = [];

  private unsubscribe$ = new Subject<void>();

  constructor(
    public appContext: AppContext,
    private deckService: CharacterDeckService,
    private damageService: DamageService,
    private logService: LogService,
    private xpService: XpService,
  ) {}

  ngOnInit(): void {
    // Re-read on every state change so half graying stays in step with other clients.
    this.appContext.creatures$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(() => this.refreshCandidates());

    // "Custom…" only ever emits here from this panel's own openCustom(), so any
    // result belongs to whichever half is currently selected.
    this.appContext.customAttackResult$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(result => { this.customOverride = result; });

    const hero = this.hero;
    if (hero?.id && hero?.type) {
      const heroId = hero.id;
      this.deckService.loadDeck(hero.type).then(() => {
        this.refreshCandidates();
        // Normally already bound by AppContext right after reveal (see
        // AppContext.autoBindHeroCards); this covers edge cases such as a deck that
        // failed to load then, or a level-up resolving a previously ambiguous slot.
        this.appContext.autoBindHeroCards(heroId);
      });
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  // --- The acting hero -------------------------------------------------------
  // Read live rather than copied in the constructor, so remote updates land.

  get hero(): Creature | null {
    const id = this.appContext.cardPanelCreatureId;
    if (!id) return null;
    return this.appContext.getCreatures().find(c => c.id === id) ?? null;
  }

  get heroLevel(): number {
    return this.hero?.level ?? 1;
  }

  get heroPortrait(): string {
    return `./images/character/thumbnail/fh-${this.hero?.type}.png`;
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).src = './images/bb/daemon-skull.svg';
  }

  // --- Card binding ---------------------------------------------------------

  private refreshCandidates(): void {
    const hero = this.hero;
    if (!hero?.type) {
      this.candidatesA = [];
      this.candidatesB = [];
      return;
    }
    this.candidatesA = this.deckService.resolve(hero.type, this.heroLevel, hero.initiative ?? 0);
    this.candidatesB = this.deckService.resolve(hero.type, this.heroLevel, hero.secondaryInitiative ?? 0);
  }

  chooseCard(slot: CardSlot, cardId: number): void {
    const hero = this.hero;
    if (!hero?.id) return;
    this.appContext.bindHeroCards(hero.id, slot === 'A' ? { cardAId: cardId } : { cardBId: cardId });
  }

  clearCard(slot: CardSlot): void {
    const hero = this.hero;
    if (!hero?.id) return;
    this.appContext.bindHeroCards(hero.id, slot === 'A' ? { cardAId: null } : { cardBId: null });
  }

  /** True while a slot has several possible cards and none is chosen yet. */
  needsChoice(slot: CardSlot): boolean {
    const hero = this.hero;
    if (!hero) return false;
    const bound = slot === 'A' ? hero.cardAId : hero.cardBId;
    return bound == null && this.candidatesFor(slot).length > 1;
  }

  candidatesFor(slot: CardSlot): CardCandidate[] {
    return slot === 'A' ? this.candidatesA : this.candidatesB;
  }

  cardFor(slot: CardSlot): CharacterAbilityCard | null {
    const hero = this.hero;
    if (!hero) return null;
    return this.deckService.cardById(slot === 'A' ? hero.cardAId : hero.cardBId);
  }

  initiativeFor(slot: CardSlot): number {
    const hero = this.hero;
    if (!hero) return 0;
    return (slot === 'A' ? hero.initiative : hero.secondaryInitiative) ?? 0;
  }

  candidateLabel(candidate: CardCandidate): string {
    const level = candidate.card.level === 'X' ? 'X' : candidate.card.level;
    const identity = candidate.identity ? ` · ${candidate.identity}` : '';
    return `${candidate.card.name} (L${level}${identity})`;
  }

  // --- Half tiles -----------------------------------------------------------

  /**
   * Ordered top-half-then-bottom-half (not per-card) so the 3-column grid lays out
   * every top action on the first row and every bottom action on the second.
   */
  get tiles(): HalfTile[] {
    const bySlot = (slot: CardSlot, half: CardHalfName): HalfTile => {
      const card = this.cardFor(slot);
      return {
        source: slot,
        half,
        card,
        content: card ? card[half] : null,
        label: card ? card.name : `${slot === 'A' ? 'Main Card' : 'Second Card'} — initiative ${this.initiativeFor(slot) || '?'}`,
      };
    };

    return [
      bySlot('A', 'top'),
      bySlot('B', 'top'),
      { source: 'default', half: 'top', card: null, content: DEFAULT_ATTACK, label: 'Default Attack 2' },
      bySlot('A', 'bottom'),
      bySlot('B', 'bottom'),
      { source: 'default', half: 'bottom', card: null, content: DEFAULT_MOVE, label: 'Default Move 2' },
    ];
  }

  /** A half is spent when its own half slot was filled by this tile's card. */
  isTileSpent(tile: HalfTile): boolean {
    const hero = this.hero;
    if (!hero) return false;
    if (!isHalfSpent(hero, tile.half)) return false;
    const usedSlot = halfSlot(hero, tile.half);
    // A default action records no slot, so it grays every tile of that half.
    return usedSlot === null || tile.source === 'default' || usedSlot === tile.source;
  }

  /**
   * Disabled means "not spent, but illegal": the sibling half of this same card is
   * already played, so this card cannot supply both halves of one turn.
   */
  isTileDisabled(tile: HalfTile): boolean {
    const hero = this.hero;
    if (!hero) return true;
    if (this.isTileSpent(tile)) return false;
    if (isHalfSpent(hero, tile.half)) return true;
    return !isHalfLegal(hero, tile.source, tile.half);
  }

  isTileSelected(tile: HalfTile): boolean {
    return this.selected?.source === tile.source && this.selected?.half === tile.half;
  }

  tileDisposition(tile: HalfTile): string | null {
    const hero = this.hero;
    if (!hero || !this.isTileSpent(tile)) return null;
    return halfDisposition(hero, tile.half);
  }

  selectTile(tile: HalfTile): void {
    if (this.isTileDisabled(tile) || this.isTileSpent(tile)) return;
    this.selected = { source: tile.source, half: tile.half };
    this.modifier = null;
    this.manualAttack = 0;
    this.targetId = null;
    this.selectedTargetIds.clear();
    this.struckTargetIds.clear();
    this.attackIndex = 0;
    this.healStepDone = false;
    this.attackAdjustments.clear();
    this.manualAttackValues.clear();
    this.manualHealValue = 0;
    this.manualSelfDamageValue = 0;
    this.healAdjustment = 0;
    this.takenBonuses.clear();
    this.bonusElementChoice.clear();
    this.infuseElementChoice.clear();
    this.customOverride = null;
    this.applyRetaliate = true;
  }

  /**
   * Retaliate the currently aimed-at target(s) would deal back. Zero unless this half
   * actually attacks: retaliate answers an attack, not a heal or a bare condition.
   */
  get retaliateTotal(): number {
    if (!this.isResolvingAttack) return 0;
    return this.targets.reduce((sum, t) => sum + this.damageService.retaliateDamage(t), 0);
  }

  /** The longest retaliate range among the aimed-at targets, for the prompt's label. */
  get retaliateRange(): number {
    return this.targets.reduce((max, t) => Math.max(max, Number(t.retaliateRange) || 0), 0);
  }

  toggleRetaliate(): void {
    this.applyRetaliate = !this.applyRetaliate;
  }

  get selectedTile(): HalfTile | null {
    if (!this.selected) return null;
    return this.tiles.find(t => t.source === this.selected!.source && t.half === this.selected!.half) ?? null;
  }

  get selectedContent(): CardHalf | null {
    return this.selectedTile?.content ?? null;
  }

  /** Template-callable wrapper: whether a half has real action data. */
  hasData(content: CardHalf | null | undefined): boolean {
    return hasCardData(content);
  }

  /** Halves with no action data fall back to a manual value the DM reads off the card. */
  get isSelectedUnauthored(): boolean {
    return !hasCardData(this.selectedContent);
  }

  // --- What the selected half does ------------------------------------------

  /**
   * Every independent attack in the half, in document order. Length > 1 means this is
   * a multi-attack half — see `attackIndex`.
   */
  get selectedAttacks(): CardAction[] {
    return collectAttacks(this.selectedContent?.actions);
  }

  /**
   * The strike currently being resolved, or null for halves with no `attack` action —
   * and, deliberately, also null while `isResolvingHealStep` is true. That makes every
   * attack-derived getter (`isResolvingAttack`, `needsModifier`, `isSequentialAttack`
   * among them) read as "no attack yet" for the length of the heal step, with no need
   * to special-case each of them separately.
   */
  get currentAttack(): CardAction | null {
    if (this.isResolvingHealStep) return null;
    return this.selectedAttacks[this.attackIndex] ?? null;
  }

  /**
   * A half pairing a target-facing heal with an attack — e.g. shackles "Reversal of
   * Fate": Heal 5 to an ally, Attack 5 to an enemy, on the same top action. The two
   * effects land on different targets, so they cannot share one target pick the way an
   * attack's own damage and conditions do; the heal is resolved as its own step before
   * the attack(s) that follow.
   */
  get isHealBeforeAttack(): boolean {
    return this.healActions.some(a => !a.selfOnly) && this.selectedAttacks.length > 0;
  }

  /** Whether the half is still waiting on its heal step, ahead of any attack. */
  get isResolvingHealStep(): boolean {
    return this.isHealBeforeAttack && !this.healStepDone;
  }

  get isMultiAttack(): boolean {
    return this.selectedAttacks.length > 1;
  }

  /** Whether `execute()` should finalize the whole half rather than just this strike. */
  get isLastAttack(): boolean {
    return this.attackIndex >= this.selectedAttacks.length - 1;
  }

  /**
   * The current attack's printed value, plus any conditional bonus the player has
   * taken and any +/- adjustment they made to this attack. The drawn attack modifier
   * is applied on top of this, in DamageService.
   */
  get selectedAttackValue(): number {
    if (this.isSelectedUnauthored) return Number(this.manualAttack) || 0;
    const attack = this.currentAttack;
    if (!attack) return 0;

    // An "Attack X" is worth whatever the player typed, and stays a live attack even
    // at 0 — so it does not take the short-circuit below, and bonuses and the +/- row
    // still stack onto it exactly as they would onto a printed value.
    const manual = isManualValue(attack);
    const base = manual ? this.manualAttackValueFor(this.attackIndex) : actionValue(attack);
    if (base <= 0 && !manual) return base;
    return Math.max(base + this.takenBonusAttack + this.adjustmentFor(this.attackIndex), 0);
  }

  // --- "Attack X": a value the card leaves to the player ---------------------

  /** Whether the attack at `index` prints "X" instead of a number. */
  isManualAttack(index: number): boolean {
    return isManualValue(this.selectedAttacks[index]);
  }

  /** Whether the strike being resolved right now is an "Attack X". */
  get isCurrentAttackManual(): boolean {
    return isManualValue(this.currentAttack ?? undefined);
  }

  /** What the player has typed for one "Attack X", 0 until they type something. */
  manualAttackValueFor(index: number): number {
    return this.manualAttackValues.get(index) ?? 0;
  }

  /** Stores a typed "Attack X" value. Refused once that attack has been resolved. */
  setManualAttackValue(index: number, value: number | string): void {
    if (this.isAttackDone(index)) return;
    const n = Number(value);
    this.manualAttackValues.set(index, Number.isFinite(n) ? Math.max(n, 0) : 0);
  }

  /**
   * Whether this resolution is an attack at all, as opposed to a heal or a bare
   * condition. Deliberately not `effectiveBaseAttack > 0`: an "Attack X" the player
   * entered 0 for is still an attack, so it takes a target, draws a modifier, provokes
   * the target's retaliate and lands its conditions — it simply deals no damage.
   */
  get isResolvingAttack(): boolean {
    return this.effectiveBaseAttack > 0 || this.isCurrentAttackManual;
  }

  // --- Per-attack value adjustment ------------------------------------------
  // The +/- buttons beside each attack, for a bonus the card cannot know about (an
  // item, an ally's buff). Scoped to one attack of the half, not the half as a whole,
  // so a multi-attack card's two strikes can be adjusted independently.

  adjustmentFor(index: number): number {
    return this.attackAdjustments.get(index) ?? 0;
  }

  /** The value an attack would hit for right now, adjustment and bonuses included. */
  attackDisplayValue(index: number): number {
    const attack = this.selectedAttacks[index];
    if (!attack) return 0;
    const base = isManualValue(attack) ? this.manualAttackValueFor(index) : actionValue(attack);
    const bonus = index === this.attackIndex ? this.takenBonusAttack : 0;
    return Math.max(base + bonus + this.adjustmentFor(index), 0);
  }

  /** Nudges one attack's value. Refused for an attack already spent. */
  adjustAttack(index: number, delta: number): void {
    if (this.isAttackDone(index)) return;
    const attack = this.selectedAttacks[index];
    if (!attack) return;

    // Clamp so the printed value can be reduced to 0 but never past it — a negative
    // attack is not a thing, and DamageService would floor it anyway. For an
    // "Attack X" the typed value is what the adjustment is measured against.
    const base = isManualValue(attack) ? this.manualAttackValueFor(index) : actionValue(attack);
    const floor = -(base + (index === this.attackIndex ? this.takenBonusAttack : 0));
    this.attackAdjustments.set(index, Math.max(this.adjustmentFor(index) + delta, floor));
  }

  /** Spent already: earlier in the half's order than the attack now being resolved. */
  isAttackDone(index: number): boolean {
    return index < this.attackIndex;
  }

  /**
   * The attack the panel is resolving right now — the only one Execute applies. False
   * for all of them while `isResolvingHealStep` holds the half back on its heal.
   */
  isAttackCurrent(index: number): boolean {
    return !this.isResolvingHealStep && index === this.attackIndex;
  }

  /** Whether that specific attack hits several targets, one strike at a time. */
  isAttackMultiTarget(index: number): boolean {
    return !!this.selectedAttacks[index]?.multiTarget;
  }

  /** That attack's own `multiTarget: N` cap, for its row's tag. Null when uncapped. */
  attackTargetLimit(index: number): number | null {
    const limit = this.selectedAttacks[index]?.multiTarget;
    return typeof limit === 'number' && limit > 0 ? limit : null;
  }

  /**
   * The half's printed heal plus whatever a taken element bonus adds to it. Read
   * through the scoped walker so a heal that only exists *inside* a bonus isn't
   * applied for free — that one arrives via `takenBonusHeal` once the bonus is taken.
   */
  /** Every `heal` action on the half, self-only and target-facing alike. */
  private get healActions(): CardAction[] {
    return collectActionsScoped(this.selectedContent?.actions, 'heal', null);
  }

  get selectedHealValue(): number {
    if (this.isSelectedUnauthored) return 0;
    const heal = this.healActions.find(a => !a.selfOnly);
    if (!heal) return this.takenBonusHeal > 0 ? this.takenBonusHeal : 0;
    const base = isManualValue(heal) ? this.manualHealValue : actionValue(heal);
    return Math.max(base + this.takenBonusHeal + this.healAdjustment, 0);
  }

  /** A `"value": "X"` heal aimed at a target — drifter "Survivalist" and the like. */
  get hasManualTargetHeal(): boolean {
    return isManualValue(this.healActions.find(a => !a.selfOnly));
  }

  /**
   * Whether the heal row shown on the panel is an "X" the player supplies. Checks
   * *either* heal rather than only the target-facing one: a half pairing a printed
   * "Heal 2" with a self-only "Heal X" still needs the box, and `manualHealValue` is
   * only ever read by whichever of the two actually carries the `"X"`.
   */
  get isCurrentHealManual(): boolean {
    return this.healActions.some(isManualValue);
  }

  /** Stores the typed value for a "Heal X". */
  setManualHealValue(value: number | string): void {
    const n = Number(value);
    this.manualHealValue = Number.isFinite(n) ? Math.max(n, 0) : 0;
  }

  /**
   * Every `selfOnly` heal on the half, summed — shackles "Cleansing Fire" prints two
   * ("Heal 1. Heal 2."), both landing on the acting hero, so this must not stop at the
   * first one the way a target-facing heal (at most one per half) safely can.
   */
  private get selfHealBase(): number {
    return this.healActions
      .filter(a => a.selfOnly)
      .reduce((sum, heal) => sum + (isManualValue(heal) ? this.manualHealValue : actionValue(heal)), 0);
  }

  /**
   * A heal the card flags `selfOnly` — always the acting hero, never the picked
   * target, so it applies once at `finalizeHalf()` alongside XP/shield/retaliate
   * rather than through `computeTargetPatches`.
   */
  get selectedSelfHealValue(): number {
    if (!this.healActions.some(a => a.selfOnly)) return 0;
    return Math.max(this.selfHealBase + this.healAdjustment, 0);
  }

  /** Whether the half prints a heal at all — target-facing or self-only — for the +/- row. */
  get hasSelectedHeal(): boolean {
    return this.healActions.length > 0 && !this.isSelectedUnauthored;
  }

  /** Whichever heal is on the half — target-facing takes priority, same as `adjustHeal`. */
  get healDisplayValue(): number {
    return this.healActions.some(a => !a.selfOnly) ? this.selectedHealValue : this.selectedSelfHealValue;
  }

  /** Whether the heal row's value is the acting hero's own (`self` tag) or a picked target's. */
  get isCurrentHealSelfOnly(): boolean {
    return !this.healActions.some(a => !a.selfOnly) && this.healActions.some(a => a.selfOnly);
  }

  /** Nudges the half's heal value, the same +/- idea `adjustAttack` offers an attack. */
  adjustHeal(delta: number): void {
    const targetHeal = this.healActions.find(a => !a.selfOnly);
    const hasSelfHeal = this.healActions.some(a => a.selfOnly);
    if (!targetHeal && !hasSelfHeal) return;

    // Clamp so the printed value can be reduced to 0 but never past it, matching
    // adjustAttack's floor. Target-facing takes priority, same as `healDisplayValue` —
    // a half printing both shares this one +/- row, same as `healAdjustment` already
    // landing on whichever of `selectedHealValue`/`selectedSelfHealValue` applies.
    const base = targetHeal
      ? (isManualValue(targetHeal) ? this.manualHealValue : actionValue(targetHeal))
      : this.selfHealBase;
    const bonus = targetHeal ? this.takenBonusHeal : 0;
    const floor = -(base + bonus);
    this.healAdjustment = Math.max(this.healAdjustment + delta, floor);
  }

  /** Pierce for the current attack — scoped so one attack's pierce isn't applied to another. */
  get selectedPierce(): number {
    const pierce = findActionScoped(this.selectedContent?.actions, 'pierce', this.currentAttack);
    return pierce ? actionValue(pierce) : 0;
  }

  /**
   * Whether the card itself prints "ignore armor" on the current attack — scoped the
   * same way pierce is, so it doesn't leak from one attack of a multi-attack half into
   * another. Combines with whatever else that attack does (poison, wound, …), same as
   * pierce and condition already do.
   *
   * Both spellings count: the `ignoreArmor: true` flag on the attack itself (preferred,
   * and what most authored cards use), or the older `{ type: 'ignoreArmor' }` subAction
   * nested under it. The flag is read off `currentAttack`, so it is per-strike already.
   */
  get selectedIgnoreArmor(): boolean {
    if (this.currentAttack?.ignoreArmor) return true;
    return !!findActionScoped(this.selectedContent?.actions, 'ignoreArmor', this.currentAttack);
  }

  /**
   * The half's printed `shield` — scoped like `healActions`/`selectedConditions`, so a
   * `shield` nested inside an `elementBonus`/`sufferDamageBonus`/`textBonus` (its
   * grant, not a printed value beside it) is excluded here and only counted through
   * `takenBonusShield` once the bonus is actually taken. `findAction` would not have
   * made that distinction — it has no notion of a conditional-bonus boundary.
   */
  get selectedShield(): number {
    const shield = findActionScoped(this.selectedContent?.actions, 'shield', null);
    return shield ? actionValue(shield) : 0;
  }

  /** Same scoping as `selectedShield`, for the same reason. */
  get selectedRetaliate(): number {
    const retaliate = findActionScoped(this.selectedContent?.actions, 'retaliate', null);
    return retaliate ? actionValue(retaliate) : 0;
  }

  /**
   * XP the half awards unconditionally: the value printed in its corner plus any
   * inline `xp` action. XP that only arrives with a conditional bonus is added
   * separately by `takenBonusXp`.
   */
  get selectedXp(): number {
    return (this.selectedContent?.xp ?? 0) + sumUnconditionalXp(this.selectedContent?.actions);
  }

  // --- Conditional bonuses --------------------------------------------------
  // A bonus is an offer: it shows only while it can be taken, and taking it pays
  // whatever it costs — elements for an `elementBonus`, HP for a `sufferDamageBonus`,
  // or nothing at all for a `textBonus`, whose "cost" is the player judging its printed
  // condition true. Nothing here applies automatically.

  get selectedBonuses(): CardAction[] {
    return collectConditionalBonuses(this.selectedContent?.actions, this.currentAttack);
  }

  /** A bonus bought with HP rather than elements. */
  isSelfDamageBonus(bonus: CardAction): boolean {
    return bonus.type === 'sufferDamageBonus';
  }

  /**
   * A bonus gated on a condition this app has no state to compute — "if you are the
   * only hero adjacent to the target". The checkbox means "this is true," not "I
   * choose this," so it carries no cost and is always offered.
   */
  isTextBonus(bonus: CardAction): boolean {
    return bonus.type === 'textBonus';
  }

  /** What taking this bonus costs the hero in HP. Zero for an element bonus. */
  bonusSelfDamageCost(bonus: CardAction): number {
    return bonusSelfDamage(bonus);
  }

  private elementState(element: ElementType): ElementState {
    return this.appContext.getElements().find(e => e.type === element)?.state ?? ElementState.None;
  }

  /** An element counts as available while it is infused, full or waning. */
  isElementAvailable(element: ElementType): boolean {
    return this.elementState(element) !== ElementState.None;
  }

  elementsOf(bonus: CardAction): ElementType[] {
    const known = Object.values(ElementType) as string[];
    return (bonus.elements ?? [])
      .filter(e => known.includes(e))
      .map(e => e as ElementType);
  }

  /**
   * Whether the bonus can be taken at all — whether its cost can actually be paid.
   *
   * For an element bonus: 'any' needs one of its elements active, 'all' needs every one
   * of them. For an HP bonus: the hero must have *more* HP than it costs, not merely
   * as much. Paying down to exactly zero is exhaustion, not a bargain, and this app has
   * no exhaustion state to put them in — so the offer is withheld rather than silently
   * flooring the hero at 0 HP and leaving them standing. A `textBonus` has no cost to
   * check — the player's own judgment of the printed text *is* the check — so it is
   * always available.
   */
  isBonusAvailable(bonus: CardAction): boolean {
    if (this.isSelfDamageBonus(bonus)) {
      const cost = this.bonusSelfDamageCost(bonus);
      return cost > 0 && (this.hero?.hp ?? 0) > cost;
    }
    if (this.isTextBonus(bonus)) return true;
    const elements = this.elementsOf(bonus);
    if (elements.length === 0) return false;
    return bonus.consumeMode === 'any'
      ? elements.some(e => this.isElementAvailable(e))
      : elements.every(e => this.isElementAvailable(e));
  }

  /** Why a bonus is greyed out, for the row's tag. Never shown for a `textBonus`. */
  bonusUnavailableReason(bonus: CardAction): string {
    return this.isSelfDamageBonus(bonus) ? 'not enough HP' : 'not active';
  }

  isBonusTaken(index: number): boolean {
    return this.takenBonuses.has(index);
  }

  toggleBonus(index: number, bonus: CardAction): void {
    if (!this.isBonusAvailable(bonus)) return;
    if (this.takenBonuses.has(index)) {
      this.takenBonuses.delete(index);
      this.bonusElementChoice.delete(index);
      return;
    }
    this.takenBonuses.add(index);
    // Default an "any" bonus to the first available element; the player can change it.
    if (bonus.consumeMode === 'any') {
      const first = this.elementsOf(bonus).find(e => this.isElementAvailable(e));
      if (first) this.bonusElementChoice.set(index, first);
    }
  }

  /** Which element an "any" bonus will consume. */
  chosenElement(index: number, bonus: CardAction): ElementType | null {
    if (bonus.consumeMode !== 'any') return null;
    return this.bonusElementChoice.get(index) ?? null;
  }

  chooseBonusElement(index: number, element: ElementType): void {
    if (!this.isElementAvailable(element)) return;
    this.bonusElementChoice.set(index, element);
  }

  private get takenBonusList(): { bonus: CardAction; index: number }[] {
    return this.selectedBonuses
      .map((bonus, index) => ({ bonus, index }))
      .filter(({ bonus, index }) => this.takenBonuses.has(index) && this.isBonusAvailable(bonus));
  }

  /** Attack added by the bonuses the player has taken. */
  get takenBonusAttack(): number {
    return this.sumTakenBonus('attack');
  }

  /**
   * Heal added by the taken bonuses — snowflake #348 "Zephyr Barrier" pays Air for
   * `heal +1`. Without this the element was spent and the XP awarded while the heal
   * stayed at its printed value.
   */
  get takenBonusHeal(): number {
    return this.sumTakenBonus('heal');
  }

  /**
   * Shield added (or, with `valueType: 'minus'`/`'subtract'`, removed) by the bonuses
   * the player has taken — a downside on an otherwise-beneficial bonus, e.g. "if you
   * use it, remove 1 shield". Combined with the half's own printed `shield` by
   * `totalShield`, the same pairing `selectedHealValue`/`takenBonusHeal` already are.
   */
  get takenBonusShield(): number {
    return this.sumTakenBonus('shield');
  }

  /** The half's printed `shield` plus whatever the taken bonuses add or remove. */
  get totalShield(): number {
    return this.selectedShield + this.takenBonusShield;
  }

  /**
   * Retaliate added (or removed) by the taken bonuses — shackles #317 "Reprisal" pays
   * Air for `retaliate +1`. Without this the element was spent and the retaliate stayed
   * at its printed value, exactly the way `takenBonusHeal` was added for the heal.
   */
  get takenBonusRetaliate(): number {
    return this.sumTakenBonus('retaliate');
  }

  /** The half's printed `retaliate` plus whatever the taken bonuses add or remove. */
  get totalRetaliate(): number {
    return this.selectedRetaliate + this.takenBonusRetaliate;
  }

  private sumTakenBonus(type: string): number {
    let total = 0;
    for (const { bonus } of this.takenBonusList) {
      for (const action of bonus.subActions ?? []) {
        if (action.type === type) total += this.signedBonusDelta(action);
      }
    }
    return total;
  }

  /**
   * A bonus subAction's value, signed by its `valueType` the same way its `−N`/`+N`
   * display already is: `valueType: 'minus'`/`'subtract'` means *remove* this much,
   * everything else (including no `valueType` at all) means *add* it. The printed
   * number is always a magnitude — `valueType` alone carries the direction, matching
   * how the card itself prints it.
   */
  private signedBonusDelta(action: CardAction): number {
    const magnitude = Math.abs(actionValue(action));
    return action.valueType === 'minus' || action.valueType === 'subtract' ? -magnitude : magnitude;
  }

  /**
   * Conditions the taken bonuses inflict — e.g. snowflake #342 "Blinding Vortex"
   * pays Light for a Disarm. These are deliberately *not* part of the half's own
   * conditions (see `collectActionsScoped`): until the bonus is taken and the element
   * spent, the card cannot apply them.
   */
  get takenBonusConditions(): CreatureConditions[] {
    const out: string[] = [];
    for (const { bonus } of this.takenBonusList) {
      for (const action of collectActions(bonus.subActions, 'condition')) {
        if (action.value !== undefined) out.push(String(action.value));
      }
    }
    return this.toCreatureConditions(out);
  }

  /** XP added by the bonuses the player has taken. */
  get takenBonusXp(): number {
    return this.takenBonusList.reduce((sum, { bonus }) => sum + bonusXp(bonus), 0);
  }

  // --- Self-damage ----------------------------------------------------------
  // HP the half costs its own player. Applied once per half at finalizeHalf(), never
  // per strike — the same treatment a `selfOnly` heal or condition gets, and for the
  // same reason: it lands on the hero, not on anything they picked.

  /**
   * HP the half charges outright — its printed `sufferDamage`, which is not optional.
   * A `"value": "X"` one is worth whatever the player typed instead of a fixed cost.
   */
  get selectedSelfDamage(): number {
    if (this.isSelectedUnauthored) return 0;
    return collectActionsScoped(this.selectedContent?.actions, 'sufferDamage', null)
      .reduce((total, action) => total + Math.max(
        isManualValue(action) ? this.manualSelfDamageValue : actionValue(action), 0
      ), 0);
  }

  /** Whether the half's `sufferDamage` is a `"value": "X"` the player supplies. */
  get isSelfDamageManual(): boolean {
    return collectActionsScoped(this.selectedContent?.actions, 'sufferDamage', null)
      .some(isManualValue);
  }

  /** Stores the typed value for a manual `sufferDamage` ("Suffer X"). */
  setManualSelfDamageValue(value: number | string): void {
    const n = Number(value);
    this.manualSelfDamageValue = Number.isFinite(n) ? Math.max(n, 0) : 0;
  }

  /** HP the bonuses the player has taken charge on top of that. */
  get takenBonusSelfDamage(): number {
    return this.takenBonusList.reduce((sum, { bonus }) => sum + bonusSelfDamage(bonus), 0);
  }

  /** Every HP this resolution costs the hero, mandatory and opted-into together. */
  get totalSelfDamage(): number {
    return this.selectedSelfDamage + this.takenBonusSelfDamage;
  }

  /** Every element that taking the chosen bonuses will consume. */
  get elementsToConsume(): ElementType[] {
    const out: ElementType[] = [];
    for (const { bonus, index } of this.takenBonusList) {
      if (bonus.consumeMode === 'any') {
        const chosen = this.bonusElementChoice.get(index);
        if (chosen) out.push(chosen);
      } else {
        out.push(...this.elementsOf(bonus).filter(e => this.isElementAvailable(e)));
      }
    }
    return [...new Set(out)];
  }

  /**
   * Conditions this resolution inflicts: the ones the half prints outright, plus the
   * ones any taken element bonus grants. Bless and curse drop out — those are
   * attack-modifier deck cards rather than creature states, so they have no
   * CreatureConditions entry.
   */
  get selectedConditions(): CreatureConditions[] {
    const printed = collectActionsScoped(this.selectedContent?.actions, 'condition', this.currentAttack)
      .filter(a => !a.selfOnly)
      .map(a => String(a.value));
    return [...new Set([...this.toCreatureConditions(printed), ...this.takenBonusConditions])];
  }

  /**
   * Conditions the card flags `selfOnly` — always the acting hero, never the
   * picked target. Unscoped by `currentAttack`: like a self-heal, a self-inflicted
   * condition applies once for the whole half, at `finalizeHalf()`, not per strike.
   */
  get selectedSelfConditions(): CreatureConditions[] {
    const printed = collectActionsScoped(this.selectedContent?.actions, 'condition', null)
      .filter(a => a.selfOnly)
      .map(a => String(a.value));
    return this.toCreatureConditions(printed);
  }

  /**
   * Narrows raw `condition` values to conditions that can actually be applied.
   * The cast is safe because `NON_CREATURE_CONDITIONS.has()` only ever returns true
   * for its own two known members, never for an arbitrary string.
   */
  private toCreatureConditions(values: string[]): CreatureConditions[] {
    return values
      .filter(v => !NON_CREATURE_CONDITIONS.has(v as ConditionName))
      .filter((v): v is CreatureConditions => (this.conditionList as string[]).includes(v));
  }

  /**
   * Every `element` action on the half, in document order. Indexes `infuseElementChoice`
   * — an `element` printing `consumeMode: 'any'` needs the player to pick which one of
   * its listed elements actually gets infused.
   */
  get elementActions(): CardAction[] {
    return collectActions(this.selectedContent?.actions, 'element');
  }

  /** An `element` action that names more than one element but infuses only the one picked. */
  isChooseOneElement(action: CardAction): boolean {
    return action.consumeMode === 'any' && (action.elements?.length ?? 0) > 1;
  }

  /** Every real element name an `element` action lists, filtering out anything malformed. */
  private elementsOfAction(action: CardAction): ElementType[] {
    const known = Object.values(ElementType) as string[];
    return (action.elements ?? []).filter((e): e is ElementType => known.includes(e));
  }

  /** Elements offered by a `consumeMode: 'any'` `element` action, for its picker row. */
  infuseChoicesFor(action: CardAction): ElementType[] {
    return this.elementsOfAction(action);
  }

  /**
   * Only the `element` actions that need a pick, paired with their index in
   * `elementActions` — `chosenInfuseElement`/`chooseInfuseElement` are keyed against
   * that full list, not this filtered one. Keeps the template from rendering an empty
   * picker row for every ordinary (all-elements) `element` action, which is most of them.
   */
  get chooseOneElementRows(): { action: CardAction; index: number }[] {
    return this.elementActions
      .map((action, index) => ({ action, index }))
      .filter(({ action }) => this.isChooseOneElement(action));
  }

  /** Which element the player picked for one `consumeMode: 'any'` `element` action. */
  chosenInfuseElement(index: number): ElementType | null {
    return this.infuseElementChoice.get(index) ?? null;
  }

  chooseInfuseElement(index: number, element: ElementType): void {
    this.infuseElementChoice.set(index, element);
  }

  /**
   * `chooseOneElementRows` returns a fresh `{ action, index }` object every call, so
   * without this Angular's default identity-based `*ngFor` diffing tears the row's
   * DOM down and rebuilds it on every change-detection pass — clicking a choice button
   * would still update the underlying state correctly, but the button the player just
   * pressed stops being the button Angular considers "active" a moment later. Tracking
   * by the one thing that's actually stable across calls — the index itself — lets
   * Angular reuse the same DOM node instead.
   */
  trackElementRow(_: number, row: { action: CardAction; index: number }): number {
    return row.index;
  }

  /**
   * Whether the half still needs a pick before it can execute — an `element` printing
   * `consumeMode: 'any'` infuses nothing on its own, so leaving it unpicked would
   * silently infuse nothing at all rather than defaulting to some guess.
   */
  get needsElementChoice(): boolean {
    return this.elementActions.some((action, index) =>
      this.isChooseOneElement(action) && !this.chosenInfuseElement(index)
    );
  }

  /**
   * Elements the half infuses. Only `element` actions infuse — `elementBonus`
   * *consumes*, and is handled by the opt-in bonus flow instead. An action naming
   * several elements infuses all of them by default; `consumeMode: 'any'` narrows that
   * to whichever single one the player picked (see `infuseElementChoice`), same as
   * `elementBonus`'s "any" already lets the player choose which element it *consumes*.
   */
  get selectedElements(): ElementType[] {
    const out: ElementType[] = [];
    this.elementActions.forEach((action, index) => {
      if (this.isChooseOneElement(action)) {
        const chosen = this.chosenInfuseElement(index);
        if (chosen) out.push(chosen);
      } else {
        out.push(...this.elementsOfAction(action));
      }
    });
    return [...new Set(out)];
  }

  /**
   * Summons the selected half brings into play. Created by `execute()` — a card action
   * is the only way a summon ever enters play.
   */
  get selectedSummons(): CardSummon[] {
    return collectActions(this.selectedContent?.actions, 'summon')
      .map(action => action.summon)
      .filter((summon): summon is CardSummon => !!summon);
  }

  get needsTarget(): boolean {
    return this.isResolvingAttack
      || this.selectedHealValue > 0
      // A "Heal X" needs its ally picked before a value has been typed, or the strip
      // would only appear once the box was filled in.
      || this.hasManualTargetHeal
      || this.selectedConditions.length > 0;
  }

  /**
   * Heals and buffs go to allies, everything else to monsters.
   *
   * A half with no attack whose only conditions are beneficial ones is a buff — e.g.
   * snowflake "Frigid Growth" (Strengthen) or "Storm Wall" (Ward). Without this the
   * target strip offered monsters and the buff landed on an enemy. A `targetAlly`
   * condition earns the same treatment even when it's a debuff — a card that curses
   * or wounds a picked ally/summon rather than a foe. A half mixing either of those
   * with an ordinary enemy-facing condition stays on enemies: that's an attack-shaped
   * card, and the DM can apply the odd one out by hand.
   *
   * An `attack` flagged `targetAlly` is the same idea aimed at a strike rather than a
   * condition — a card that deliberately damages an ally/summon. It's read off
   * `currentAttack`, so it's scoped to the strike actually being resolved: a
   * multi-attack half where only one of its attacks carries the flag offers allies for
   * that strike and enemies for the other, same as `pierce`/`condition` already scope
   * per-attack.
   */
  get targetsAreHeroes(): boolean {
    if (this.isResolvingAttack) return !!this.currentAttack?.targetAlly;
    if (this.selectedHealValue > 0 || this.hasManualTargetHeal) return true;

    const conditions = this.selectedConditions;
    if (conditions.length === 0) return false;

    // Names an explicit `targetAlly` condition prints, so a debuff aimed at a picked
    // ally/summon earns the same target-strip switch a beneficial condition gets.
    // Bonus-granted conditions carry no such flag and fall back to the beneficial
    // check below, same as before this existed.
    const targetAllyNames = new Set(
      collectActionsScoped(this.selectedContent?.actions, 'condition', this.currentAttack)
        .filter(a => !a.selfOnly && a.targetAlly)
        .map(a => String(a.value))
    );

    return conditions.every(c =>
      BENEFICIAL_CONDITIONS.has(c as unknown as ConditionName) || targetAllyNames.has(c)
    );
  }

  /**
   * Enemies (or allies, for a heal), sorted by name and then by standee number.
   * Sorts on `type` rather than the displayed `name` — a monster's name is already
   * "type standee" (e.g. "algox-guard 10"), and an elite's is starred on top of that,
   * so sorting the raw string would compare "10" before "2" and scatter elites to
   * the front instead of grouping same-type figures together in standee order.
   *
   * Anyone the current attack action already struck is left out: one attack action
   * hits a given enemy at most once. `struckTargetIds` is empty outside a multi-target
   * attack, so this filter costs nothing in the ordinary case.
   */
  get targetOptions(): Creature[] {
    // A capped multi-target attack ("up to 2 enemies") has nobody left to offer once
    // it has struck its limit — the only way on is to finish the attack.
    if (this.isSequentialAttack && this.targetLimitReached) return [];

    return this.appContext.getCreatures()
      .filter(c => !!c.aggressive !== this.targetsAreHeroes)
      .filter(c => !c.id || !this.struckTargetIds.has(c.id))
      .sort((a, b) => {
        const byName = (a.type ?? a.name ?? '').localeCompare(b.type ?? b.name ?? '');
        if (byName !== 0) return byName;
        return (Number(a.standee) || 0) - (Number(b.standee) || 0);
      });
  }

  /**
   * The action whose `multiTarget` governs this resolution: the attack being resolved,
   * or — for a half with no attack — whatever else needs a target, a `heal` or any
   * `condition` (unscoped, same as `selectedConditions` in that case). One lookup
   * behind both "is this multi-target at all" and the cap `multiTarget: N` sets.
   */
  private get multiTargetAction(): CardAction | null {
    if (this.currentAttack) return this.currentAttack.multiTarget ? this.currentAttack : null;
    const heal = findAction(this.selectedContent?.actions, 'heal');
    if (heal?.multiTarget) return heal;
    return collectActionsScoped(this.selectedContent?.actions, 'condition', null)
      .find(a => a.multiTarget) ?? null;
  }

  /**
   * Whether the current action can hit more than one target, e.g. "Attack 2 to each
   * adjacent enemy" or "Muddle each adjacent enemy" with no attack at all. How many
   * is `targetLimit`: open-ended for `multiTarget: true`, capped for `multiTarget: N`.
   */
  get isCurrentAttackMultiTarget(): boolean {
    return !!this.multiTargetAction;
  }

  /**
   * The most targets this action may hit, from `multiTarget: N` — null when
   * `multiTarget: true` leaves it open, which is an unknown number the app has no
   * board to work out and so leaves to the DM.
   */
  get targetLimit(): number | null {
    const limit = this.multiTargetAction?.multiTarget;
    return typeof limit === 'number' && limit > 0 ? limit : null;
  }

  /**
   * Targets this action may still take, or null when uncapped. Counts the ones already
   * struck for a sequential attack, and the ones currently picked for a multi-select —
   * the two ways a target gets used up.
   */
  get targetsRemaining(): number | null {
    const limit = this.targetLimit;
    if (limit === null) return null;
    const used = this.isSequentialAttack ? this.struckTargetIds.size : this.selectedTargetIds.size;
    return Math.max(limit - used, 0);
  }

  /** True once `multiTarget: N` has had its N targets, so no more may be taken. */
  get targetLimitReached(): boolean {
    return this.targetsRemaining === 0;
  }

  /**
   * A multi-target *attack*, which is resolved one target at a time: each target is a
   * separate attack with its own modifier draw, so they cannot share one. Every strike
   * lands its own damage instance, and no enemy may be struck twice by the same attack
   * action — see `struckTargetIds`. `finishAttack()` is what ends the action.
   */
  get isSequentialAttack(): boolean {
    return !!this.currentAttack?.multiTarget;
  }

  /**
   * A multi-target action with no attack behind it — a condition or heal on "each
   * adjacent enemy". No modifier is drawn for those, so every target is picked at once
   * and applied together.
   */
  get isMultiSelect(): boolean {
    return this.isCurrentAttackMultiTarget && !this.isSequentialAttack;
  }

  get target(): Creature | null {
    if (!this.targetId) return null;
    return this.appContext.getCreatures().find(c => c.id === this.targetId) ?? null;
  }

  /**
   * Every target the current action applies to right now — all of them for a
   * simultaneous multi-select, and exactly the one being struck for everything else,
   * a multi-target attack included.
   */
  get targets(): Creature[] {
    if (this.isMultiSelect) {
      return this.appContext.getCreatures().filter(c => !!c.id && this.selectedTargetIds.has(c.id));
    }
    const target = this.target;
    return target ? [target] : [];
  }

  /** Whether the player has picked at least one target, however many this action needs. */
  get hasChosenTarget(): boolean {
    return this.isMultiSelect ? this.selectedTargetIds.size > 0 : !!this.targetId;
  }

  /** Enemies this attack action has already struck, in the order they were hit. */
  get struckTargets(): Creature[] {
    const creatures = this.appContext.getCreatures();
    return [...this.struckTargetIds]
      .map(id => creatures.find(c => c.id === id))
      .filter((c): c is Creature => !!c);
  }

  isTargetSelected(id: string | null | undefined): boolean {
    if (!id) return false;
    return this.isMultiSelect ? this.selectedTargetIds.has(id) : this.targetId === id;
  }

  selectTarget(id: string | null): void {
    if (this.isMultiSelect) {
      if (!id) return;
      if (this.selectedTargetIds.has(id)) {
        this.selectedTargetIds.delete(id);
        return;
      }
      // `multiTarget: N` caps how many may be picked at once. Deselecting still works
      // above, so the player swaps a target rather than being stuck.
      if (this.targetLimitReached) return;
      this.selectedTargetIds.add(id);
      return;
    }
    // Clearing the current target is always allowed; aiming at a new one is not, once
    // a capped attack has struck its N. `targetOptions` empties then, so the strip
    // offers nobody — but the rule belongs here too, not only in the view.
    const clearing = this.targetId === id;
    if (!clearing && this.isSequentialAttack && this.targetLimitReached) return;
    this.targetId = clearing ? null : id;
  }

  targetPortrait(creature: Creature): string {
    // Summons are valid heal targets, and use their card's token art.
    if (creature.isSummon) {
      return creature.summonImage
        ? `./images/${creature.summonImage}`
        : './images/summons/fh.png';
    }
    return creature.aggressive
      ? `./images/monster/thumbnail/fh-${creature.type}.png`
      : `./images/character/thumbnail/fh-${creature.type}.png`;
  }

  setModifier(modifier: AttackModifier): void {
    this.modifier = modifier;
  }

  /**
   * Whether this resolution is an attack at all, and so needs a drawn modifier before
   * it can be executed. False for a half that only heals or applies conditions —
   * nothing is drawn for those, so the row stays hidden and Execute stays open. Also
   * false once "Custom…" has supplied final numbers, which bypass the draw entirely,
   * and false for an `ignoreArmor` attack — that's direct damage, unaffected by (and
   * so not drawn from) the modifier deck.
   */
  get needsModifier(): boolean {
    return this.isResolvingAttack && !this.customOverride && !this.selectedIgnoreArmor;
  }

  /** An attack is waiting on its modifier draw — what blocks Execute, and says why. */
  get awaitingModifier(): boolean {
    return this.needsModifier && this.modifier === null;
  }

  /** The attack value after the drawn modifier, before the target's armour. */
  get effectiveAttack(): number {
    return applyAttackModifier(this.selectedAttackValue, this.modifier);
  }

  // --- Custom-adjusted values --------------------------------------------------
  // Once "Custom…" has been confirmed, its attack/pierce replace the card-derived
  // ones for damage math, and the modifier row is ignored — the custom value already
  // is the final number. Its conditions add to whatever the card itself inflicts.

  get effectiveBaseAttack(): number {
    return this.customOverride ? this.customOverride.attack : this.selectedAttackValue;
  }

  get effectiveArmorPenForDamage(): number {
    return this.customOverride ? this.customOverride.armorPen : this.selectedPierce;
  }

  /**
   * From the card's own `ignoreArmor` action, or — once "Custom…" has been used —
   * from whatever the player set there instead, the same way attack/pierce switch
   * over: Custom's numbers are the final ones, not additive with the card's.
   */
  get effectiveIgnoreArmorForDamage(): boolean {
    return this.customOverride ? this.customOverride.ignoreArmor : this.selectedIgnoreArmor;
  }

  get effectiveModifierForDamage(): AttackModifier | null {
    return this.customOverride ? null : this.modifier;
  }

  get effectiveConditionsForExecution(): CreatureConditions[] {
    if (!this.customOverride) return this.selectedConditions;
    return [...new Set([...this.selectedConditions, ...this.customOverride.conditions])];
  }

  /**
   * A single target previews exactly as `DamageService.compute()` reports it. A
   * multi-target attack draws one modifier but each target still has its own armour
   * and conditions, so the total is a sum and the breakdown names each target.
   */
  get damagePreview(): { damage: number; breakdown: string[] } | null {
    const targets = this.targets;
    const baseAttack = this.effectiveBaseAttack;
    if (!targets.length || baseAttack <= 0) return null;

    if (targets.length === 1) {
      return this.damageService.compute({
        baseAttack,
        modifier: this.effectiveModifierForDamage,
        armorPen: this.effectiveArmorPenForDamage,
        ignoreArmor: this.effectiveIgnoreArmorForDamage,
        target: targets[0],
      });
    }

    let total = 0;
    const breakdown: string[] = [];
    for (const target of targets) {
      const result = this.damageService.compute({
        baseAttack,
        modifier: this.effectiveModifierForDamage,
        armorPen: this.effectiveArmorPenForDamage,
        ignoreArmor: this.effectiveIgnoreArmorForDamage,
        target,
      });
      total += result.damage;
      breakdown.push(`${target.name}: ${result.damage}`);
    }
    return { damage: total, breakdown };
  }

  get canExecute(): boolean {
    if (!this.selected || !this.hero) return false;
    if (this.needsTarget && !this.hasChosenTarget) return false;
    // A capped attack has no strike left to land once it has hit its N targets — the
    // only way on is to finish the attack. Restated here rather than left to the empty
    // target strip, so no path can slip a free extra hit past the cap.
    if (this.isSequentialAttack && this.targetLimitReached) return false;
    // An attack resolves off a drawn modifier card, so there is nothing to apply
    // until one is drawn — ±0 has to be picked deliberately, not assumed.
    if (this.awaitingModifier) return false;
    // "Infuse ICE or AIR": which one is the player's call, not a default to assume.
    if (this.needsElementChoice) return false;
    if (!this.customOverride && this.isSelectedUnauthored && this.selectedAttackValue <= 0 && !this.selectedHealValue) {
      // An unauthored half with no value typed (and no custom override) is still
      // skippable, not executable.
      return false;
    }
    return true;
  }

  /**
   * A multi-target attack applies one strike per press, so the button says so rather
   * than promising to execute the whole half.
   */
  get executeLabel(): string {
    if (this.isResolvingHealStep) return 'Heal target';
    if (this.isSequentialAttack) return 'Attack target';
    return this.isLastAttack ? 'Execute' : 'Next Attack';
  }

  /** Ends a multi-target attack: on to the next attack action, or done with the half. */
  get finishAttackLabel(): string {
    return this.isLastAttack ? 'Finish attack' : 'Next attack';
  }

  /** True once a multi-target attack has run out of enemies it may still strike. */
  get allTargetsStruck(): boolean {
    return this.isSequentialAttack && this.targetOptions.length === 0;
  }

  // --- Execution -----------------------------------------------------------

  /**
   * Resolves the currently selected half. For a single-attack (or non-attack) half
   * this finalizes everything in one step, same as always. For a multi-attack half
   * (see `selectedAttacks`), every strike but the last only applies its own damage and
   * conditions and advances to the next attack — the hero's XP/shield/retaliate, the
   * spent-half flag, summons and elements all land once, on the last one.
   *
   * A multi-target attack is the third case: each target is its own attack with its
   * own modifier draw, so this applies just that one strike and hands back to the
   * target picker (minus the enemy just hit) rather than advancing. `finishAttack()`
   * is what ends such an action.
   */
  execute(): void {
    if (!this.canExecute) return;
    if (this.isResolvingHealStep) {
      this.resolveHealStep();
      return;
    }
    if (this.isSequentialAttack) {
      this.applyStrike();
      if (this.targetId) this.struckTargetIds.add(this.targetId);
      this.targetId = null;
      // Back to "nothing drawn": the next target draws its own card. The +/-
      // adjustment deliberately survives — it belongs to the attack, not the strike.
      this.modifier = null;
      this.customOverride = null;
      return;
    }
    if (!this.isLastAttack) {
      this.resolveAttackStep();
      return;
    }
    this.finalizeHalf();
  }

  /**
   * Ends the multi-target attack action being resolved. Its strikes are already
   * applied one by one, so this only moves on: to the next attack action of the half,
   * or to finalizing it. Advancing clears `struckTargetIds`, which is what lets the
   * next attack action strike an enemy this one already struck.
   */
  finishAttack(): void {
    if (!this.selected) return;

    // Nothing is pending: every strike this attack landed went through execute(), and
    // a target still highlighted here was picked but never struck. Dropping it before
    // finalizing is what stops finalizeHalf() applying a free extra hit — which it did
    // with no modifier drawn at all, straight past the gate execute() enforces.
    this.targetId = null;
    this.selectedTargetIds.clear();

    if (!this.isLastAttack) {
      this.advanceAttack();
      return;
    }
    this.finalizeHalf();
  }

  /**
   * Computes the per-target patches for the current attack (or heal), against every
   * target in `targets` — one for a normal half, several for a `multiTarget` attack. A
   * single drawn modifier and pierce apply to all of them; only each target's own
   * armour and conditions still tell their damage apart, matching how a multi-target
   * attack is actually resolved on the table.
   */
  private computeTargetPatches(targets: Creature[]): {
    patches: { creatureId: string; patch: Partial<Creature> }[];
    totalDamage: number;
    killedIds: string[];
    /** What each target had before this strike, for the half's Undo. */
    effects: HalfEffectOnTarget[];
    /** HP the hero loses to the retaliate of everything this strike attacked. */
    retaliateSuffered: number;
  } {
    const patches: { creatureId: string; patch: Partial<Creature> }[] = [];
    const killedIds: string[] = [];
    const effects: HalfEffectOnTarget[] = [];
    let totalDamage = 0;
    let retaliateSuffered = 0;

    for (const target of targets) {
      if (!target.id) continue;
      const targetPatch: Partial<Creature> = {};
      const hpBefore = target.hp ?? 0;
      const conditionsBefore = target.conditions ?? [];
      let damageDealt = 0;
      let consumed: CreatureConditions[] = [];

      if (this.isResolvingAttack) {
        const result = this.damageService.compute({
          baseAttack: this.effectiveBaseAttack,
          modifier: this.effectiveModifierForDamage,
          armorPen: this.effectiveArmorPenForDamage,
          ignoreArmor: this.effectiveIgnoreArmorForDamage,
          target,
        });
        damageDealt = result.damage;
        consumed = result.consumedConditions;
        targetPatch.hp = hpBefore - damageDealt;
        // Being attacked is what triggers retaliate, so this counts a missed and a
        // blocked strike too — only the player's "in range" call gates it.
        if (this.applyRetaliate) retaliateSuffered += this.damageService.retaliateDamage(target);
      } else if (this.selectedHealValue > 0) {
        // Wound comes off and the heal lands normally; poison comes off too, but
        // blocks the heal itself — see DamageService.computeHealResult.
        const result = this.damageService.computeHealResult(target, this.selectedHealValue);
        targetPatch.hp = result.hp;
        consumed = result.consumedConditions;
      }

      Object.assign(
        targetPatch,
        this.appContext.buildAddConditionsPatch(target, this.effectiveConditionsForExecution, this.hero)
      );

      // Ward and brittle are spent modifying the damage above and come off the target.
      // Applied after the additions, and read off the target as it was *before* them,
      // so a brittle this very attack inflicted is not immediately consumed by it.
      if (consumed.length > 0) {
        Object.assign(
          targetPatch,
          this.appContext.buildRemoveConditionsPatch({ ...target, ...targetPatch } as Creature, consumed)
        );
      }

      if (Object.keys(targetPatch).length > 0) {
        patches.push({ creatureId: target.id, patch: targetPatch });
      }

      totalDamage += damageDealt;
      const killed = this.isResolvingAttack && hpBefore - damageDealt <= 0;
      if (killed) killedIds.push(target.id);

      // Only what this strike actually added: buildAddConditionsPatch skips whatever
      // the target already had or is immune to, so undoing can't strip those.
      const conditionsAfter = targetPatch.conditions ?? conditionsBefore;
      effects.push({
        creatureId: target.id,
        hpBefore,
        addedConditions: conditionsAfter.filter(c => !conditionsBefore.includes(c)),
        removedConditions: conditionsBefore.filter(c => !conditionsAfter.includes(c)),
        killed,
      });
    }

    return { patches, totalDamage, killedIds, effects, retaliateSuffered };
  }

  /**
   * Applies the current attack's damage and conditions against its target(s) in one
   * `applyCreaturePatches` call, so every strike gets its own Undo-able log entry.
   * Applies only — moving on is the caller's job.
   */
  private applyStrike(): void {
    const { patches, totalDamage, killedIds, effects, retaliateSuffered } =
      this.computeTargetPatches(this.targets);

    // The hero's own HP loss rides in the same patch list, so one strike stays one
    // log entry and one Undo.
    const hero = this.hero;
    if (retaliateSuffered > 0 && hero?.id) {
      patches.push({
        creatureId: hero.id,
        patch: { hp: Math.max((hero.hp ?? 0) - retaliateSuffered, 0) },
      });
    }

    if (patches.length > 0) {
      this.appContext.applyCreaturePatches(patches);
    }

    if (totalDamage > 0 && this.hero?.type) {
      this.appContext.recordDamage(this.hero.type, totalDamage);
      this.logService.appendDamageToLastBatch(this.hero.type, totalDamage);
    }
    for (const id of killedIds) {
      if (this.hero?.type) {
        this.appContext.recordKill(this.hero.type);
        this.logService.appendKillToLastBatch(this.hero.type);
      }
      this.appContext.killCreature(id);
    }

    // Self-damage is deliberately 0 here: it is a per-half cost, charged once by
    // finalizeHalf(), not by each strike of a multi-attack or multi-target half.
    this.recordExecution(effects, totalDamage, killedIds.length, 0, 0, 0, retaliateSuffered, 0, [], 0);
  }

  /**
   * Files what a strike (or the finalizing step) applied against the half, so the
   * tile's Undo can put it back. Merged per half, since the strikes land one at a
   * time — see `AppContext.recordHalfExecution`.
   */
  private recordExecution(
    effects: HalfEffectOnTarget[],
    damageCredited: number,
    killsCredited: number,
    xpGained: number,
    shieldGained: number,
    retaliateGained: number,
    retaliateSuffered: number,
    selfHealGained: number,
    selfConditionsGained: CreatureConditions[],
    selfDamageSuffered: number,
    selfHealConditionsRemoved: CreatureConditions[] = [],
  ): void {
    const hero = this.hero;
    const selection = this.selected;
    if (!hero?.id || !selection) return;

    this.appContext.recordHalfExecution(hero.id, selection.half, {
      targets: effects,
      damageCredited: this.hero?.type ? damageCredited : 0,
      killsCredited: this.hero?.type ? killsCredited : 0,
      xpGained,
      shieldGained,
      retaliateGained,
      retaliateSuffered,
      selfHealGained,
      selfConditionsGained,
      selfDamageSuffered,
      selfHealConditionsRemoved,
    });
  }

  /**
   * Applies the half's heal step against its chosen ally, then hands off to the
   * attack(s) that follow — `currentAttack` reads real again the moment
   * `healStepDone` flips, so the target strip switches straight to offering enemies.
   */
  private resolveHealStep(): void {
    this.applyStrike();
    this.healStepDone = true;
    this.targetId = null;
    this.selectedTargetIds.clear();
    this.struckTargetIds.clear();
    this.modifier = null;
    this.customOverride = null;
  }

  /** Applies the current attack, then moves on to the next one in the half. */
  private resolveAttackStep(): void {
    this.applyStrike();
    this.advanceAttack();
  }

  /**
   * Starts the next attack action of the half. The drawn modifier and any custom
   * override reset, because the next attack draws its own. So does the struck set:
   * a fresh attack action may hit an enemy the previous one already hit.
   *
   * The chosen target deliberately survives — a multi-attack half is usually aimed at
   * the same enemy twice ("Attack 2 Poison, Attack 2 Wound"), so re-picking it every
   * time would be busywork. A multi-target attack has already cleared it per strike.
   */
  private advanceAttack(): void {
    this.attackIndex++;
    this.struckTargetIds.clear();
    this.modifier = null;
    this.customOverride = null;
  }

  /**
   * Applies the selected half's remaining effects — the last (or only) attack's
   * damage/conditions, heal, shield/retaliate, XP, elements and summons — and marks it
   * spent.
   *
   * Everything lands in one `applyCreaturePatches` call so the target's HP and
   * conditions, the hero's shield/retaliate/XP, and the spent-half flag share a single
   * log batch and reverse with one Undo click.
   */
  private finalizeHalf(): void {
    const hero = this.hero;
    const selection = this.selected;
    if (!hero?.id || !selection) return;

    const patches: { creatureId: string; patch: Partial<Creature> }[] = [];

    const heroPatch: Partial<Creature> = selection.half === 'top'
      ? { topHalfSlot: this.slotOf(selection.source), topHalfState: 'executed' }
      : { bottomHalfSlot: this.slotOf(selection.source), bottomHalfState: 'executed' };

    // Fold turn completion in, so one Undo reverses the completion too.
    const otherHalf: CardHalfName = selection.half === 'top' ? 'bottom' : 'top';
    if (isHalfSpent(hero, otherHalf)) heroPatch.isTurnCompleted = true;

    // Shield and retaliate from a card last the round, matching roundArmor semantics.
    // Shield's total includes whatever a taken bonus added or removed — a bonus can
    // net negative ("remove 1 shield" as its downside), so this checks !== 0 rather
    // than > 0, and floors the hero's own round shield at 0 rather than going negative.
    const shieldDelta = this.totalShield;
    if (shieldDelta !== 0) {
      heroPatch.roundArmor = Math.max(0, (hero.roundArmor ?? 0) + shieldDelta);
    }
    const retaliateDelta = this.totalRetaliate;
    if (retaliateDelta !== 0) {
      heroPatch.roundRetaliate = Math.max(0, (hero.roundRetaliate ?? 0) + retaliateDelta);
    }

    // Experience: the half's printed XP, plus any conditional bonus taken. Folded into
    // the same patch as everything else so one Undo reverses the XP too. Mirrors the
    // three-field update creature-group-header uses for session XP.
    const xpGained = this.selectedXp + this.takenBonusXp;
    if (xpGained > 0) {
      const newTotal = Math.max(0, (hero.totalXp ?? 0) + xpGained);
      heroPatch.sessionExperience = (hero.sessionExperience ?? 0) + xpGained;
      heroPatch.totalXp = newTotal;
      heroPatch.level = this.xpService.levelFromXp(newTotal);
    }

    // An attack with no modifier drawn applies nothing, whichever way finalizing was
    // reached — the same rule execute() enforces through canExecute, restated here so
    // no other caller can land a strike without a draw.
    const { patches: targetPatches, totalDamage, killedIds, effects, retaliateSuffered } = this.awaitingModifier
      ? {
        patches: [], totalDamage: 0, killedIds: [] as string[],
        effects: [] as HalfEffectOnTarget[], retaliateSuffered: 0,
      }
      : this.computeTargetPatches(this.targets);
    patches.push(...targetPatches);

    // A `selfOnly` heal/condition always lands on the acting hero, never the picked
    // target, so it's computed here rather than through computeTargetPatches — same
    // reasoning as shield/retaliate/XP just above: once per half, on the hero's own
    // patch, not a separate creaturePatches entry.
    let heroHp = hero.hp ?? 0;
    let selfHealGained = 0;
    const selfHeal = this.selectedSelfHealValue;
    // Wound comes off and the heal lands normally; poison comes off too, but blocks
    // the heal itself — see DamageService.computeHealResult.
    let selfHealConsumedConditions: CreatureConditions[] = [];
    if (selfHeal > 0) {
      const result = this.damageService.computeHealResult(hero, selfHeal);
      selfHealGained = result.hp - heroHp;
      heroHp = result.hp;
      selfHealConsumedConditions = result.consumedConditions;
    }
    // Set on the hero's own patch rather than pushed as a second one, so the shield,
    // XP, self-heal and HP loss all reach applyCreaturePatches as a single change to
    // this hero.
    //
    // Self-damage is a cost the card charges its own player, so — like retaliate — it
    // is taken off the hero directly: no modifier is drawn for it and shield does not
    // reduce it, since shield answers an attack. Floored at 0 rather than killing the
    // hero, matching how retaliate has always been applied here; exhaustion is a board
    // state this app does not model.
    const selfDamage = this.totalSelfDamage;
    const hpLost = retaliateSuffered + selfDamage;
    if (hpLost > 0) {
      heroHp = Math.max(heroHp - hpLost, 0);
    }
    if (selfHeal > 0 || hpLost > 0) {
      heroPatch.hp = heroHp;
    }

    const selfConditions = this.selectedSelfConditions;
    let selfConditionsGained: CreatureConditions[] = [];
    if (selfConditions.length > 0) {
      const conditionPatch = this.appContext.buildAddConditionsPatch(hero, selfConditions);
      if (conditionPatch.conditions) {
        selfConditionsGained = conditionPatch.conditions.filter(c => !(hero.conditions ?? []).includes(c));
        Object.assign(heroPatch, conditionPatch);
      }
    }

    // Wound/poison the self-heal consumed, read off the hero as patched so far (any
    // condition the half just added above is accounted for), same as ward/brittle
    // removal reads the target as patched in computeTargetPatches.
    if (selfHealConsumedConditions.length > 0) {
      Object.assign(
        heroPatch,
        this.appContext.buildRemoveConditionsPatch({ ...hero, ...heroPatch } as Creature, selfHealConsumedConditions)
      );
    }

    patches.push({ creatureId: hero.id, patch: heroPatch });
    this.appContext.applyCreaturePatches(patches);

    // Filed before the kills below, so the record exists even if a target leaves the
    // board: Undo reads it to restore HP, conditions, XP, shield/retaliate and the
    // damage credited on the Stats screen.
    this.recordExecution(
      effects,
      totalDamage,
      killedIds.length,
      xpGained,
      shieldDelta,
      retaliateDelta,
      retaliateSuffered,
      selfHealGained,
      selfConditionsGained,
      selfDamage,
      selfHealConsumedConditions,
    );

    // Summons enter play only through a card action, which is here. Emitted after the
    // main patch so the spawn reads as its own step in the log rather than muddling
    // the damage batch.
    for (const summon of this.selectedSummons) {
      this.appContext.summonFromCard(hero.id, summon);
    }

    // Elements are their own state, not creature state, so they emit separately.
    // Consume first: a half that consumes one element and infuses another must not
    // have the infusion wiped out by the consumption.
    for (const element of this.elementsToConsume) {
      this.appContext.setElementState(element, ElementState.None);
    }
    for (const element of this.selectedElements) {
      this.appContext.setElementState(element, ElementState.Full);
    }

    // Credit the damage and any kill, mirroring the attack modal's ordering: the
    // creature patch must be emitted first so these attach to its batch.
    if (totalDamage > 0 && hero.type) {
      this.appContext.recordDamage(hero.type, totalDamage);
      this.logService.appendDamageToLastBatch(hero.type, totalDamage);
    }
    for (const id of killedIds) {
      if (hero.type) {
        this.appContext.recordKill(hero.type);
        this.logService.appendKillToLastBatch(hero.type);
      }
      this.appContext.killCreature(id);
    }

    this.selected = null;
    this.targetId = null;
    this.selectedTargetIds.clear();
    this.struckTargetIds.clear();
    this.modifier = null;
    this.customOverride = null;
    this.attackIndex = 0;
    this.healStepDone = false;
    this.attackAdjustments.clear();
    this.manualAttackValues.clear();
    this.manualHealValue = 0;
    this.manualSelfDamageValue = 0;
    this.healAdjustment = 0;
  }

  // --- ngFor identity -------------------------------------------------------
  // `tiles`, `targetOptions` and the candidate lists are getters, so they hand back
  // a fresh array on every change-detection pass. Without trackBy, Angular tears down
  // and rebuilds every row each cycle, which churns the DOM and makes clicks land on
  // detached nodes.

  trackTile(_index: number, tile: HalfTile): string {
    return `${tile.source}-${tile.half}-${tile.card?.cardId ?? 'none'}`;
  }

  trackCreature(_index: number, creature: Creature): string {
    return creature.id ?? String(_index);
  }

  /** Attacks are identified by position: their order in the half is what resolves them. */
  trackAttack(index: number): number {
    return index;
  }

  trackModifier(_index: number, modifier: { value: AttackModifier }): string {
    return String(modifier.value);
  }

  trackCandidate(_index: number, candidate: CardCandidate): string {
    return `${candidate.card.cardId}-${candidate.identity ?? ''}`;
  }

  trackSlot(_index: number, slot: CardSlot): string {
    return slot;
  }

  private slotOf(source: HalfSource): CardSlot | null {
    return source === 'default' ? null : source;
  }

  /**
   * Hands the card's values to the existing attack modal for anything unusual. The
   * modal and `customOverride` only ever carry one target's worth of values, so this
   * is not offered for a simultaneous multi-select — but a multi-target *attack* is
   * fine, since it resolves one target at a time and the override is cleared after
   * each strike.
   */
  openCustom(): void {
    const hero = this.hero;
    const target = this.target;
    if (!hero || !target || this.isMultiSelect) return;

    this.appContext.attackModalPrefill = {
      attack: this.effectiveAttack,
      armorPen: this.selectedPierce,
      attackerId: hero.id ?? null,
      // Carried over so the card's printed ignore-armor survives the round trip: what
      // comes back replaces these values entirely, so anything left out is lost.
      ignoreArmor: this.selectedIgnoreArmor,
    };
    this.appContext.isGroupSelected = false;
    this.appContext.selectedCreature = target;
  }

  skip(tile: HalfTile): void {
    const hero = this.hero;
    if (!hero?.id) return;
    this.appContext.skipCardHalf(hero.id, tile.half, this.slotOf(tile.source));
    if (this.isTileSelected(tile)) this.selected = null;
  }

  undoHalf(tile: HalfTile): void {
    const hero = this.hero;
    if (!hero?.id) return;
    this.appContext.undoCardHalf(hero.id, tile.half);
  }

  endTurnEarly(): void {
    const hero = this.hero;
    if (!hero?.id) return;
    this.appContext.completeTurnEarly(hero.id);
    this.selected = null;
  }

  reopenTurn(): void {
    const hero = this.hero;
    if (!hero?.id) return;
    this.appContext.reopenTurn(hero.id);
  }

  get isTurnComplete(): boolean {
    const hero = this.hero;
    return !!hero && (hero.isTurnCompleted || bothHalvesSpent(hero));
  }

  close(): void {
    this.appContext.cardPanelCreatureId = null;
  }
}
