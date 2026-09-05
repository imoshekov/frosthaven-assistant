import { Injectable } from '@angular/core';
import { Creature, CreatureConditions, Element, ElementState, ElementType } from './types/game-types';
import { CardHalfName, CardSlot, CardSummon, HalfDisposition } from './types/character-card-types';
import { allHeroesSubmitted, isHalfSpent, isHero } from './types/turn-state.util';
import { BehaviorSubject, Subject } from 'rxjs';
import { DataLoaderService } from './services/data-loader.service';
import { CreatureFactoryService } from './services/creature-factory.service';
import { LogService } from './services/log.service';
import { NotificationService } from './services/notification.service';
import { DbService } from './services/db.service';
import { XpService } from './services/xp.service';
import { CharacterDeckService } from './services/character-deck.service';

/**
 * The sentinel initiative for "no card played" — a long rest, or a downed hero who
 * cannot act. Shared so `longRest()`, `resetCreaturesForNewRound()` and
 * `revealHeroInitiatives()` all agree on the one value that means it.
 */
export const LONG_REST_INITIATIVE = 99;

/** Values the attack modal's "Custom…" flow hands back to the card execution panel. */
export interface CustomAttackResult {
    attack: number;
    armorPen: number;
    conditions: CreatureConditions[];
    /** Ignores the target's shield outright, overriding `armorPen`. */
    ignoreArmor: boolean;
}

/** What one card half did to one creature, enough to put it back as it was. */
export interface HalfEffectOnTarget {
    creatureId: string;
    /** HP the creature had before this half first touched it. */
    hpBefore: number;
    /**
     * Conditions this half actually applied — never ones the target already had or is
     * immune to, so undoing cannot strip a condition somebody else inflicted.
     */
    addedConditions: CreatureConditions[];
    /**
     * One-shot conditions this half used up on the target — ward and brittle, which
     * the rules take off the moment they modify damage. Undo puts them back, minus
     * their original round marker: what round they were applied in is not worth
     * carrying through the journal for a condition that is about to be re-applied.
     */
    removedConditions: CreatureConditions[];
    /** Killed by this half, so undo has to bring it back out of the graveyard. */
    killed: boolean;
}

/**
 * Everything one executed card half applied, recorded so its "Undo" can reverse it
 * rather than only un-graying the tile.
 *
 * Accumulates across the half's separate strikes — a multi-attack half, or a
 * multi-target attack hitting one enemy after another — so undoing gives back the
 * whole half's worth of damage in one go.
 *
 * Element infusions and summons are deliberately *not* in here: those are shared
 * board state that anything else can change between the execution and the undo, so
 * rewinding them blindly would clobber whatever happened in between.
 */
export interface HalfExecution {
    targets: HalfEffectOnTarget[];
    /** Damage credited to the acting hero's type, for the Stats screen. */
    damageCredited: number;
    /** Kills credited to the acting hero's type, same. */
    killsCredited: number;
    xpGained: number;
    shieldGained: number;
    retaliateGained: number;
    /** HP the hero lost to its targets' retaliate while resolving this half. */
    retaliateSuffered: number;
}

@Injectable({ providedIn: 'root' })
export class AppContext {
    public defaultLevel: number = 1;
    public isGroupSelected: boolean = false;
    public selectedCreature: Creature = null;
    /**
     * Gate for the player card execution panel. Deliberately separate from
     * `selectedCreature`, which is the only thing gating the attack modal — sharing it
     * would open both at once, and the panel must stay open behind the modal when its
     * "Custom" button defers to it.
     */
    public cardPanelCreatureId: string | null = null;
    /**
     * Values the card panel hands to the attack modal via its "Custom" button.
     * `ignoreArmor` rides along so a card that prints it doesn't lose it on the way
     * through the modal — what comes back replaces the card's values wholesale.
     */
    public attackModalPrefill:
        { attack: number; armorPen: number; attackerId: string | null; ignoreArmor: boolean } | null = null;

    /**
     * The attack modal hands adjusted values back through here when it was opened via
     * the card panel's "Custom" button. Confirming there does not itself apply
     * anything — the panel's own "Execute" is the single place damage/conditions/XP
     * get applied, so they land in one undo batch together with the spent-half flag.
     */
    private readonly customAttackResultSubject = new Subject<CustomAttackResult>();
    public readonly customAttackResult$ = this.customAttackResultSubject.asObservable();

    emitCustomAttackResult(result: CustomAttackResult): void {
        this.customAttackResultSubject.next(result);
    }
    public addMonsterToggled: boolean = false;
    public addItemToggled: boolean = false;
    public shouldShowSetup: boolean = true;
    public shouldShowAudit: boolean = false;
    public scenarioCreatureList: Creature[] = [];
    public damageTracker: Record<string, number> = {};
    public killTracker: Record<string, number> = {};

    private damageTrackerSubject = new BehaviorSubject<Record<string, number>>({});
    private killTrackerSubject = new BehaviorSubject<Record<string, number>>({});
    damageTracker$ = this.damageTrackerSubject.asObservable();
    killTracker$ = this.killTrackerSubject.asObservable();

    private creaturesSubject = new BehaviorSubject<Creature[]>([]);
    creatures$ = this.creaturesSubject.asObservable();

    private graveyardSubject = new BehaviorSubject<Creature[]>([]);
    graveyard$ = this.graveyardSubject.asObservable();

    private roundNumberSubject = new BehaviorSubject<number>(1);
    roundNumber$ = this.roundNumberSubject.asObservable();

    private defaultLevelSubject = new BehaviorSubject<number>(1);
    defaultLevel$ = this.defaultLevelSubject.asObservable();

    private readonly _scenarioId$ = new BehaviorSubject<number | null>(null);
    public readonly scenarioId$ = this._scenarioId$.asObservable();

    // raw JSON of the most recently loaded scenario file (from storageService)
    private readonly _scenarioFile$ = new BehaviorSubject<any | null>(null);
    public readonly scenarioFile$ = this._scenarioFile$.asObservable();

    private elementsSubject = new BehaviorSubject<Element[]>([
        { type: ElementType.Fire, state: ElementState.None },
        { type: ElementType.Ice, state: ElementState.None },
        { type: ElementType.Earth, state: ElementState.None },
        { type: ElementType.Air, state: ElementState.None },
        { type: ElementType.Light, state: ElementState.None },
        { type: ElementType.Dark, state: ElementState.None }
    ]);

    elements$ = this.elementsSubject.asObservable();

    constructor(
        private dataLoader: DataLoaderService,
        private creatureFactory: CreatureFactoryService,
        private readonly logService: LogService,
        private notificationService: NotificationService,
        private db: DbService,
        private xpService: XpService,
        private deckService: CharacterDeckService
    ) {
        this.addDefaultCharacters();
        this.logService.init(this.creatures$);
        this.creatures$.subscribe(() => this.revealIfAllReady());
    }

    private revealIfAllReady(): void {
        const creatures = this.getCreatures();
        if (!creatures.filter(isHero).some(c => c.hiddenInitiative > 0)) return;
        // Readiness means both of a hero's cards are in, not just the first.
        if (allHeroesSubmitted(creatures)) {
            this.revealHeroInitiatives();
        }
    }

    getRoundNumber(): number { return this.roundNumberSubject.getValue(); }
    setRoundNumber(round: number) { this.roundNumberSubject.next(round); }

    /**
     * The default level used when adding creatures or loading scenarios. 
     * Components can both subscribe to `defaultLevel$` or call this method to update it.
     */
    setDefaultLevel(level: number): void {
        this.defaultLevel = level;
        this.defaultLevelSubject.next(level);
    }

    setScenarioId(id: number | null): void {
        this._scenarioId$.next(id);
    }

    /**
     * Store the raw scenario data returned by LocalStorageService.loadFile so
     * other components (loot, etc.) can inspect it without re-fetching.
     */
    setScenarioFile(file: any | null): void {
        this._scenarioFile$.next(file);
    }

    getElements(): Element[] {
        return this.elementsSubject.getValue();
    }

    setElements(elements: Element[]): void {
        this.elementsSubject.next([...elements]);
    }

    setElementState(type: ElementType, newState: ElementState): void {
        const updated = this.getElements().map(el =>
            el.type === type ? { ...el, state: newState } : el
        );
        this.setElements(updated);
    }

    setElementHold(type: ElementType, holdRounds: number): void {
        this.setElementHolds([type], holdRounds);
    }

    /** Applies the same hold to several elements and logs them as one undoable batch. */
    setElementHolds(types: ElementType[], holdRounds: number): void {
        const targets = new Set(types);
        const changes: { type: ElementType; holdRounds: number; oldHoldRounds: number }[] = [];

        const updated = this.getElements().map(el => {
            if (!targets.has(el.type)) return el;
            changes.push({ type: el.type, holdRounds, oldHoldRounds: el.holdRounds ?? 0 });
            return { ...el, holdRounds };
        });

        this.setElements(updated);
        this.logService.logElementHolds(changes);
    }

    getCreatures(): Creature[] {
        return this.creaturesSubject.value;
    }

    setCreatures(creatures: Creature[]) {
        this.creaturesSubject.next(creatures);
    }

    addCreature(creature: Creature) {
        this.creaturesSubject.next([...this.creaturesSubject.value, this.creatureFactory.createCreature(creature)]);
    }

    addCreatures(newCreatures: Creature[]) {
        this.creaturesSubject.next([
            ...this.creaturesSubject.value,
            ...this.creatureFactory.createCreatureList(newCreatures)
        ]);
    }

    //DO NOT use it for deaths — call killCreature instead.
    removeCreature(id: string) {
        this.creaturesSubject.next(
            this.creaturesSubject.value.filter(c => c.id !== id)
        );
    }

    getGraveyard(): Creature[] {
        return this.graveyardSubject.value;
    }

    setGraveyard(creatures: Creature[]) {
        this.graveyardSubject.next(creatures);
    }

    addGraveyard(creature: Creature) {
        this.graveyardSubject.next([
            ...this.graveyardSubject.value,
            JSON.parse(JSON.stringify(creature))
        ]);
    }

    removeGraveyard(id: string) {
        this.graveyardSubject.next(
            this.graveyardSubject.value.filter(c => c.id !== id)
        );
    }

    updateCreatureBaseStat(creatureId: string, stat: keyof Creature, value: any, applyToAllOfType?: boolean) {
        const creatures = this.getCreatures();
        const creatureToUpdate = this.findCreature(creatureId);
        const currentValue: any = creatureToUpdate[stat];
        if (stat === 'name') {
            value = this.creatureFactory.createCreatureName(creatureToUpdate);
        }

        if (applyToAllOfType) {
            creatures
                .filter(c => c.type === creatureToUpdate!.type)
                .forEach(c => {
                    this.updateCreatureBaseStat(c.id!, stat, value, false);
                });
        } else {
            (creatureToUpdate as any)[stat] = value;
        }
        this.creaturesSubject.next([...creatures]);
    }

    updateCreatureMultipleStats(creatureId: string, patches: Partial<Creature>, applyToAllOfType = false): void {
        const creatures = this.getCreatures();
        const creatureToUpdate = this.findCreature(creatureId);
        if (!creatureToUpdate) return;

        const applyPatches = (c: Creature) => {
            for (const [key, value] of Object.entries(patches)) {
                (c as any)[key] = value;
            }
        };

        if (applyToAllOfType) {
            creatures
                .filter(c => c.type === creatureToUpdate.type)
                .forEach(c => applyPatches(c));
        } else {
            applyPatches(creatureToUpdate);
        }

        this.creaturesSubject.next([...creatures]);
    }

    /**
     * Applies patches to several creatures in a single emission.
     *
     * The card execution panel needs the target's HP and conditions and the acting
     * hero's spent-half flags to land in one `creatures$` emission, because LogService
     * assigns one batchId per emission — split them and reversing one execution would
     * take several Undo clicks.
     */
    applyCreaturePatches(patches: { creatureId: string; patch: Partial<Creature> }[]): void {
        if (patches.length === 0) return;
        const creatures = this.getCreatures();

        for (const { creatureId, patch } of patches) {
            const creature = creatures.find(c => c.id === creatureId);
            if (!creature) continue;
            for (const [key, value] of Object.entries(patch)) {
                (creature as any)[key] = value;
            }
        }

        this.creaturesSubject.next([...creatures]);
    }

    /**
     * Builds the condition patch `toggleCreatureConditions` would produce, without
     * emitting, so it can be folded into a larger single-emission patch.
     * Conditions the target is immune to are ignored, as are values that are not
     * creature conditions at all (bless and curse are attack-modifier cards).
     */
    buildAddConditionsPatch(creature: Creature, conditions: CreatureConditions[]): Partial<Creature> {
        const immunities = creature.immunities ?? [];
        const current = creature.conditions ?? [];
        const conditionRounds = { ...creature.conditionRounds };

        const added = conditions.filter(c => !current.includes(c) && !immunities.includes(c));
        if (added.length === 0) return {};

        for (const condition of added) {
            conditionRounds[condition] = this.getRoundNumber();
        }
        return { conditions: [...current, ...added], conditionRounds };
    }

    /**
     * The mirror of `buildAddConditionsPatch`, for the one-shot conditions an attack
     * uses up (ward, brittle). Same single-emission story: the removal folds into the
     * same patch as the damage that triggered it.
     */
    buildRemoveConditionsPatch(creature: Creature, conditions: CreatureConditions[]): Partial<Creature> {
        const current = creature.conditions ?? [];
        const removed = conditions.filter(c => current.includes(c));
        if (removed.length === 0) return {};

        const conditionRounds = { ...creature.conditionRounds };
        for (const condition of removed) delete conditionRounds[condition];
        return { conditions: current.filter(c => !removed.includes(c)), conditionRounds };
    }

    toggleCreatureConditions(creatureId: string, condition: CreatureConditions) {
        const creatureToUpdate = this.findCreature(creatureId);
        if (!creatureToUpdate) return;

        const conditions = creatureToUpdate.conditions || [];
        const conditionRounds = { ...creatureToUpdate.conditionRounds };

        const index = conditions.indexOf(condition);
        if (index > -1) {
            creatureToUpdate.conditions = conditions.filter(c => c !== condition);
            delete conditionRounds[condition];
        } else {
            creatureToUpdate.conditions = [...conditions, condition];
            conditionRounds[condition] = this.getRoundNumber();
        }
        creatureToUpdate.conditionRounds = conditionRounds;
        this.creaturesSubject.next([...this.getCreatures()]);
    }

    killCreature(creatureId: string) {
        const creature = this.findCreature(creatureId);
        if (!creature) return;
        // Heroes are never removed from the board; monsters and summons are.
        if (isHero(creature)) {
            this.notificationService.emitErrorMessage(`haha, can't kill me`);
            return;
        }

        // 1) remove from live list
        const live = this.creaturesSubject.value.filter(c => c.id !== creatureId);
        this.creaturesSubject.next(live);

        // 2) add to graveyard (PRESERVE THE SAME ID!)
        const deadCopy = JSON.parse(JSON.stringify(creature));
        this.addGraveyard(deadCopy);

        // 3) audit + notify
        this.notificationService.emitInfoMessage(`${creature.name} has been killed!`);
    }

    reviveCreature(creatureId: string, hp?: number, conditions?: CreatureConditions[]): void {
        const graveyard: Creature[] = this.getGraveyard
            ? this.getGraveyard()
            : (this.graveyardSubject?.value ?? []);

        const idx = graveyard.findIndex(g => g.id === creatureId);
        if (idx === -1) {
            // nothing to revive
            return;
        }

        //remove from graveyard (preserve ID)
        const revived = { ...graveyard[idx] };
        const newGrave = [...graveyard];
        newGrave.splice(idx, 1);

        //set HP + conditions + flags
        const lastHp = Number.isFinite(hp as number) ? Number(hp) : undefined;
        revived.hp = Math.max(1, Number(lastHp ?? revived.hp ?? 1));
        if (conditions !== undefined) {
            revived.conditions = [...conditions];
        }
        revived.aggressive = true;

        //add back to live list
        const live = [...this.creaturesSubject.value, revived];

        //emit + notify (and broadcast if you do WS syncing)
        this.creaturesSubject.next(live);
        if (this.graveyardSubject) this.graveyardSubject.next(newGrave);

        this.notificationService?.emitInfoMessage?.(`${revived.name} has been revived!`);
    }


    /**
     * Reveal all hero initiatives, for both played cards. Heroes without a hidden
     * initiative keep the public one they already have.
     */
    revealHeroInitiatives(): void {
        const needsReveal = this.getCreatures().some(c => isHero(c) && c.hiddenInitiative > 0);
        if (!needsReveal) return;
        // Only heroes submit initiative — monsters are entered manually and summons
        // borrow their owner's, so neither is touched here.
        const creatures = this.getCreatures().map(c => {
            if (!isHero(c)) return c;
            const revealed: Creature = {
                ...c,
                initiative: c.hiddenInitiative > 0 ? c.hiddenInitiative : c.initiative,
                hiddenInitiative: 0,
                secondaryInitiative: c.secondaryHiddenInitiative > 0
                    ? c.secondaryHiddenInitiative
                    : c.secondaryInitiative,
                secondaryHiddenInitiative: 0,
            };
            // A long rest (see `longRest()`) plays no card halves at all, so there is
            // nothing left to resolve once it's revealed — finalize the turn right
            // here, the same way the card panel used to when clicked by hand. This
            // also catches a downed hero, whose both hidden initiatives
            // `resetCreaturesForNewRound()` auto-fills with the same sentinel.
            if (revealed.initiative === LONG_REST_INITIATIVE && revealed.secondaryInitiative === LONG_REST_INITIATIVE) {
                revealed.topHalfState = 'skipped';
                revealed.topHalfSlot = null;
                revealed.bottomHalfState = 'skipped';
                revealed.bottomHalfSlot = null;
                revealed.isTurnCompleted = true;
            }
            return revealed;
        });
        this.setCreatures(creatures);

        // Fire-and-forget: lets a hero's name become clickable (and the attack icon
        // appear) as soon as their card resolves, without requiring the card panel to
        // have been opened first — resolving it is what used to bind these ids.
        for (const c of creatures) {
            if (isHero(c) && c.id) this.autoBindHeroCards(c.id);
        }
    }

    /**
     * Loads the hero's deck and binds any card slot whose initiative resolves to
     * exactly one candidate. A no-op once both slots are already bound. Shared by the
     * auto-bind above and by the card execution panel, so there is one place that
     * decides what "resolved" means.
     */
    async autoBindHeroCards(creatureId: string): Promise<void> {
        const creature = this.getCreatures().find(c => c.id === creatureId);
        if (!creature || !isHero(creature) || !creature.type) return;
        if (creature.cardAId != null && creature.cardBId != null) return;

        await this.deckService.loadDeck(creature.type);

        // Re-read: state may have moved on while the deck was loading (a round reset,
        // a manual card choice from the panel's chooser, etc.).
        const current = this.getCreatures().find(c => c.id === creatureId);
        if (!current || !current.type) return;

        const patch: { cardAId?: number | null; cardBId?: number | null } = {};
        if (current.cardAId == null) {
            const candidates = this.deckService.resolve(current.type, current.level ?? 1, current.initiative ?? 0);
            if (candidates.length === 1) patch.cardAId = candidates[0].card.cardId;
        }
        if (current.cardBId == null) {
            const candidates = this.deckService.resolve(current.type, current.level ?? 1, current.secondaryInitiative ?? 0);
            if (candidates.length === 1) patch.cardBId = candidates[0].card.cardId;
        }
        if (Object.keys(patch).length > 0) {
            this.bindHeroCards(creatureId, patch);
        }
    }

    /**
     * Brings a card's summon into play, `count` figures at a time.
     *
     * Summons enter play *only* this way — there is no manual add-summon anywhere — so
     * this is the single entry point, called by the card execution panel when a half
     * carrying a summon action is executed. Each figure gets its own standee number so
     * several copies of the same summon stay tellable apart, numbered on from whatever
     * this owner already has out.
     */
    summonFromCard(ownerId: string, summon: CardSummon): void {
        const creatures = this.getCreatures();
        const owner = creatures.find(c => c.id === ownerId);
        if (!owner) return;

        const alreadyOut = creatures.filter(
            c => c.isSummon && c.summonOwnerId === ownerId && c.name === summon.name
        ).length;

        const count = Math.max(1, Number(summon.count) || 1);
        const spawned: Creature[] = [];
        for (let i = 0; i < count; i++) {
            spawned.push(this.creatureFactory.createSummon(summon, owner, alreadyOut + i + 1));
        }

        this.creaturesSubject.next([...creatures, ...spawned]);
    }

    /** The figures a given hero currently has summoned. */
    summonsOf(ownerId: string): Creature[] {
        return this.getCreatures().filter(c => c.isSummon && c.summonOwnerId === ownerId);
    }

    // --- Hero card turn state ------------------------------------------------
    // Each mutator is a single updateCreatureMultipleStats call, so it produces one
    // creatures$ emission = one WebSocket broadcast = one undo batch. Splitting an
    // execution over two emissions would take two Undo clicks to reverse.

    /** Binds the cards resolved from a hero's two revealed initiatives. */
    bindHeroCards(
        creatureId: string,
        cards: { cardAId?: number | null; cardBId?: number | null }
    ): void {
        this.updateCreatureMultipleStats(creatureId, cards);
    }

    private spendCardHalf(
        creatureId: string,
        half: CardHalfName,
        slot: CardSlot | null,
        state: HalfDisposition
    ): void {
        const creature = this.findCreature(creatureId);
        const other: CardHalfName = half === 'top' ? 'bottom' : 'top';

        const patch: Partial<Creature> = half === 'top'
            ? { topHalfSlot: slot, topHalfState: state }
            : { bottomHalfSlot: slot, bottomHalfState: state };

        // Fold turn completion into the same patch so a single Undo reverses both.
        if (isHalfSpent(creature, other)) patch.isTurnCompleted = true;

        this.updateCreatureMultipleStats(creatureId, patch);
    }

    markCardHalfExecuted(creatureId: string, half: CardHalfName, slot: CardSlot | null): void {
        this.spendCardHalf(creatureId, half, slot, 'executed');
    }

    skipCardHalf(creatureId: string, half: CardHalfName, slot: CardSlot | null): void {
        // Deliberately keeps whatever the half already applied. Skip is offered while
        // the half is still unspent, which includes a multi-target attack part-way
        // through its targets — those strikes have landed, and the Undo that appears
        // on the skipped tile has to be able to take them back.
        this.spendCardHalf(creatureId, half, slot, 'skipped');
    }

    /**
     * What each executed half applied, keyed by hero and half, so its Undo can put it
     * back. Session-local rather than part of `Creature`: the whole creature list is
     * broadcast on every state change, and this is bookkeeping no other client needs.
     */
    private readonly halfExecutions = new Map<string, HalfExecution>();

    private halfKey(creatureId: string, half: CardHalfName): string {
        return `${creatureId}:${half}`;
    }

    /**
     * Records what executing a half just did, merging into whatever that half already
     * applied — its strikes land one at a time (a multi-attack half, or a multi-target
     * attack working through its targets), and Undo has to reverse all of them.
     *
     * A target hit more than once keeps the HP it had before the *first* hit, which is
     * what undoing has to restore.
     */
    recordHalfExecution(creatureId: string, half: CardHalfName, effect: HalfExecution): void {
        const key = this.halfKey(creatureId, half);
        const existing = this.halfExecutions.get(key);

        if (!existing) {
            this.halfExecutions.set(key, {
                ...effect,
                targets: effect.targets.map(t => ({
                    ...t,
                    addedConditions: [...t.addedConditions],
                    removedConditions: [...t.removedConditions],
                })),
            });
            return;
        }

        for (const incoming of effect.targets) {
            const already = existing.targets.find(t => t.creatureId === incoming.creatureId);
            if (already) {
                already.addedConditions = [...new Set([...already.addedConditions, ...incoming.addedConditions])];
                already.removedConditions = [...new Set([...already.removedConditions, ...incoming.removedConditions])];
                already.killed = already.killed || incoming.killed;
            } else {
                existing.targets.push({
                    ...incoming,
                    addedConditions: [...incoming.addedConditions],
                    removedConditions: [...incoming.removedConditions],
                });
            }
        }

        existing.damageCredited += effect.damageCredited;
        existing.killsCredited += effect.killsCredited;
        existing.xpGained += effect.xpGained;
        existing.shieldGained += effect.shieldGained;
        existing.retaliateGained += effect.retaliateGained;
        existing.retaliateSuffered += effect.retaliateSuffered;
    }

    /** What a half applied, for tests and for the panel's own bookkeeping. */
    getHalfExecution(creatureId: string, half: CardHalfName): HalfExecution | null {
        return this.halfExecutions.get(this.halfKey(creatureId, half)) ?? null;
    }

    /**
     * Un-grays a half *and* puts back everything it applied: each target's HP and the
     * conditions this half inflicted, anything it killed, the hero's XP and
     * round-long shield/retaliate, and the damage and kills it credited on the Stats
     * screen. Values adjusted through the attack modal's "Custom…" are included —
     * what's reversed is what actually landed, not what the card prints.
     *
     * A half that was skipped, or executed before this session, has nothing recorded;
     * then this reverses the flag alone, as it always did.
     */
    undoCardHalf(creatureId: string, half: CardHalfName): void {
        const key = this.halfKey(creatureId, half);
        const executed = this.halfExecutions.get(key);
        this.halfExecutions.delete(key);

        const patch: Partial<Creature> = half === 'top'
            ? { topHalfSlot: null, topHalfState: null, isTurnCompleted: false }
            : { bottomHalfSlot: null, bottomHalfState: null, isTurnCompleted: false };

        if (!executed) {
            this.updateCreatureMultipleStats(creatureId, patch);
            return;
        }

        // Killed targets first: they have to be back on the board before their HP and
        // conditions can be patched, and reviveCreature restores both as it goes.
        for (const target of executed.targets) {
            if (!target.killed) continue;
            this.reviveCreature(target.creatureId, target.hpBefore, this.conditionsBefore(target, true));
        }

        const patches: { creatureId: string; patch: Partial<Creature> }[] = [];
        for (const target of executed.targets) {
            if (target.killed) continue; // already restored above
            const creature = this.getCreatures().find(c => c.id === target.creatureId);
            if (!creature) continue;

            const targetPatch: Partial<Creature> = { hp: target.hpBefore };
            if (target.addedConditions.length > 0 || target.removedConditions.length > 0) {
                targetPatch.conditions = this.conditionsBefore(target, false);
            }
            patches.push({ creatureId: target.creatureId, patch: targetPatch });
        }

        const hero = this.getCreatures().find(c => c.id === creatureId);
        if (hero) {
            if (executed.xpGained > 0) {
                const newTotal = Math.max(0, (hero.totalXp ?? 0) - executed.xpGained);
                patch.sessionExperience = Math.max(0, (hero.sessionExperience ?? 0) - executed.xpGained);
                patch.totalXp = newTotal;
                patch.level = this.xpService.levelFromXp(newTotal);
            }
            if (executed.shieldGained > 0) {
                patch.roundArmor = Math.max(0, (hero.roundArmor ?? 0) - executed.shieldGained);
            }
            if (executed.retaliateGained > 0) {
                patch.roundRetaliate = Math.max(0, (hero.roundRetaliate ?? 0) - executed.retaliateGained);
            }
            // HP the hero lost to its targets' retaliate. Given back rather than reset
            // to a remembered value: the hero may have been healed or hurt by something
            // else since, and only this half's share belongs to this undo.
            if (executed.retaliateSuffered > 0) {
                const restored = (hero.hp ?? 0) + executed.retaliateSuffered;
                patch.hp = hero.maxHp ? Math.min(restored, hero.maxHp) : restored;
            }
        }

        // The hero's own flags ride along, so one emission covers the whole reversal.
        patches.push({ creatureId, patch });
        this.applyCreaturePatches(patches);

        // Stats screen: give back the damage and kills this half was credited with.
        const heroType = hero?.type;
        if (heroType) {
            this.undoDamage(heroType, executed.damageCredited);
            for (let i = 0; i < executed.killsCredited; i++) this.undoKill(heroType);
        }
    }

    /**
     * A creature's conditions as they stood before a half touched it: minus what the
     * half inflicted, plus the one-shot ward/brittle it used up. Anything inflicted or
     * cleared from elsewhere in between is left alone. Reads the graveyard copy for a
     * creature that was killed.
     */
    private conditionsBefore(target: HalfEffectOnTarget, fromGraveyard: boolean): CreatureConditions[] {
        const source = fromGraveyard
            ? this.graveyardSubject.value.find(c => c.id === target.creatureId)
            : this.getCreatures().find(c => c.id === target.creatureId);
        const current = source?.conditions ?? [];
        const kept = current.filter(c => !target.addedConditions.includes(c));
        const restored = target.removedConditions.filter(c => !kept.includes(c));
        return [...kept, ...restored];
    }

    /** "End Turn Early": marks any unspent half skipped and completes the turn. */
    completeTurnEarly(creatureId: string): void {
        const creature = this.findCreature(creatureId);
        const patch: Partial<Creature> = { isTurnCompleted: true };
        if (!isHalfSpent(creature, 'top')) {
            patch.topHalfState = 'skipped';
            patch.topHalfSlot = null;
        }
        if (!isHalfSpent(creature, 'bottom')) {
            patch.bottomHalfState = 'skipped';
            patch.bottomHalfSlot = null;
        }
        this.updateCreatureMultipleStats(creatureId, patch);
    }

    /** Reopens a turn closed by "End Turn Early". */
    reopenTurn(creatureId: string): void {
        this.updateCreatureMultipleStats(creatureId, { isTurnCompleted: false });
    }

    /**
     * A long rest plays no card halves: submits `LONG_REST_INITIATIVE` as both hidden
     * initiatives, the same as any other pair, so it reveals alongside the rest of the
     * party rather than jumping the hero straight to "revealed" on its own — which
     * would otherwise lock out everyone else still mid-submission (see
     * `initiativesLocked` in the initiative bubble). `revealHeroInitiatives()`
     * recognizes the pair and finalizes the turn — skips both halves, marks it done —
     * the moment it's revealed.
     */
    longRest(creatureId: string): void {
        this.updateCreatureMultipleStats(creatureId, {
            hiddenInitiative: LONG_REST_INITIATIVE,
            secondaryHiddenInitiative: LONG_REST_INITIATIVE,
        });
    }

    /**
     * Clears per-round state on every creature. Lives here beside the other mutators;
     * RoundComponent.nextRound() calls it. One setCreatures call = one undo batch.
     */
    resetCreaturesForNewRound(): void {
        // Last round's halves are no longer undoable — their flags are being cleared
        // here, so what they applied is now just part of the board's history.
        this.halfExecutions.clear();

        const creatures = this.getCreatures().map(creature => {
            // A hero at 0 HP cannot act. Auto-fill both hidden initiatives with the
            // same "no card played" sentinel longRest() submits, so they need no
            // player input, never block the reveal, and — like any other long rest —
            // have their turn auto-completed by revealHeroInitiatives() once revealed.
            const isDownedHero = isHero(creature) && (creature.hp ?? 0) <= 0;
            // Only heroes ever submit an initiative. Monsters are entered manually and
            // summons borrow their owner's, so neither gets a hidden slot to fill.
            const submitsInitiative = isHero(creature);

            return {
                ...creature,
                initiative: 0,
                hiddenInitiative: submitsInitiative ? (isDownedHero ? LONG_REST_INITIATIVE : 0) : null,
                secondaryInitiative: 0,
                secondaryHiddenInitiative: submitsInitiative ? (isDownedHero ? LONG_REST_INITIATIVE : 0) : null,
                cardAId: null,
                cardBId: null,
                topHalfSlot: null,
                topHalfState: null,
                bottomHalfSlot: null,
                bottomHalfState: null,
                isTurnCompleted: false,
                roundArmor: 0,
                roundRetaliate: 0,
            };
        });
        this.setCreatures(creatures);
    }

    public findCreature(creatureId: string): Creature {
        const creatures = this.getCreatures();
        const creature = creatures.find(c => c.id === creatureId);
        if (!creature) throw Error("Creature not found");
        return creature;
    }

    recordDamage(characterType: string, damage: number): void {
        if (!characterType || damage <= 0) return;
        this.damageTracker[characterType] = (this.damageTracker[characterType] || 0) + damage;
        this.damageTrackerSubject.next({ ...this.damageTracker });
    }

    undoDamage(characterType: string, damage: number): void {
        if (!characterType || damage <= 0) return;
        this.damageTracker[characterType] = Math.max(0, (this.damageTracker[characterType] || 0) - damage);
        this.damageTrackerSubject.next({ ...this.damageTracker });
    }

    getDamageTracker(): Record<string, number> {
        return { ...this.damageTracker };
    }

    setDamageTracker(tracker: Record<string, number>): void {
        this.damageTracker = { ...tracker };
        this.damageTrackerSubject.next(this.damageTracker);
    }

    resetDamageTracker(): void {
        this.damageTracker = {};
        this.damageTrackerSubject.next(this.damageTracker);
    }

    recordKill(characterType: string): void {
        if (!characterType) return;
        this.killTracker[characterType] = (this.killTracker[characterType] || 0) + 1;
        this.killTrackerSubject.next({ ...this.killTracker });
    }

    undoKill(characterType: string): void {
        if (!characterType) return;
        this.killTracker[characterType] = Math.max(0, (this.killTracker[characterType] || 0) - 1);
        this.killTrackerSubject.next({ ...this.killTracker });
    }

    getKillTracker(): Record<string, number> {
        return { ...this.killTracker };
    }

    setKillTracker(tracker: Record<string, number>): void {
        this.killTracker = { ...tracker };
        this.killTrackerSubject.next(this.killTracker);
    }

    resetKillTracker(): void {
        this.killTracker = {};
        this.killTrackerSubject.next(this.killTracker);
    }

    private async addDefaultCharacters() {
        try {
            const selectedCharacters = await this.db.getCharacter();
            const levels = selectedCharacters.map(c => {
                const totalXp = Number(c.total_xp);
                if (Number.isFinite(totalXp)) {
                    return this.xpService.levelFromXp(totalXp);
                }
                return Number(c.level) || 1;
            });
            const avg = levels.reduce((sum, n) => sum + n, 0) / levels.length;

            const defaultLevel = Math.max(1, Math.round(avg / 2));
            this.setDefaultLevel(defaultLevel);

            const defaultCharacters: Creature[] = selectedCharacters.map(({ name, name_pronunciation, type, level, total_xp }) => {
                const totalXp = Number(total_xp);
                const derivedLevel = Number.isFinite(totalXp)
                    ? this.xpService.levelFromXp(totalXp)
                    : Number(level) || 1;
                const charData = this.dataLoader.getData().characters.find(c => c.name === type);
                const stats = charData?.stats?.find(s => s.level === derivedLevel);
                //added because the default trait for shackles class is +5hp.
                let hp = Number(stats?.health) || 10;
                if (type === 'shackles') {
                    hp += 5;
                }
                const traits = charData?.traits ?? [];


                return this.creatureFactory.createCreature({
                    name,
                    namePronunciation: name_pronunciation,
                    type,
                    hp,
                    traits,
                    level: derivedLevel,
                    aggressive: false,
                    totalXp: Number.isFinite(totalXp) ? totalXp : 0
                });
            });

            this.addCreatures(defaultCharacters);
        } catch (err) {
            console.error('addDefaultCharacters failed', err);
        }
    }
}
