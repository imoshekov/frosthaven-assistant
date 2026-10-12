import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext, CustomAttackResult } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import { Creature, Element, ElementType } from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * `multiTarget: true` on an `attack` action: an unknown number of targets, the
 * player's choice of which (e.g. "Attack 3 to each adjacent enemy" — the app has no
 * board to count adjacency, so it just lets the player pick whoever applies).
 *
 * Each of those targets is its own attack and draws its own modifier, so they are
 * resolved one at a time rather than sharing a single draw, and no enemy may be hit
 * twice by the same attack action. A *second* attack action on the same half is a
 * fresh action, so it may hit the same enemy again.
 */
describe('PlayerCardExecutionPanelComponent multi-target attack', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let creatures: Creature[];
  let elements: Element[];
  /** One entry per applyCreaturePatches call, so strikes can be told apart. */
  let batches: { creatureId: string; patch: Partial<Creature> }[][];

  const sweepingBlow: CharacterAbilityCard = {
    cardId: 900, name: 'Sweeping Blow', level: 1, initiative: 40,
    top: {
      actions: [{ type: 'attack', value: 3, multiTarget: true }],
    },
    bottom: { actions: [] },
  };

  /** Two independent multi-target attacks, for the cross-action retargeting rule. */
  const doubleSweep: CharacterAbilityCard = {
    cardId: 901, name: 'Double Sweep', level: 1, initiative: 41,
    top: {
      actions: [
        { type: 'attack', value: 3, multiTarget: true },
        { type: 'attack', value: 1, multiTarget: true },
      ],
    },
    bottom: { actions: [] },
  };

  const deck: CharacterDeck = {
    characterClass: 'drifter', edition: 'fh',
    cards: [sweepingBlow, doubleSweep],
  };

  const patched = (id: string) =>
    batches.flat().find(p => p.creatureId === id)?.patch;

  beforeEach(() => {
    elements = (Object.values(ElementType) as ElementType[]).map(type => ({ type, state: 0 as any }));
    batches = [];
    creatures = [
      {
        id: 'hero', type: 'drifter', aggressive: false, level: 1,
        initiative: 40, secondaryInitiative: 0, cardAId: 900, cardBId: null,
        hp: 10, maxHp: 10, totalXp: 0, sessionExperience: 0,
      },
      { id: 'mob1', type: 'algox-guard', aggressive: true, hp: 20, maxHp: 20, conditions: [], armor: 1 },
      { id: 'mob2', type: 'algox-guard', aggressive: true, hp: 20, maxHp: 20, conditions: [] },
      { id: 'ally', type: 'snowflake', aggressive: false, hp: 10, maxHp: 10, conditions: [] },
    ];

    const appContextStub: Partial<AppContext> = {
      cardPanelCreatureId: 'hero',
      creatures$: new Subject<Creature[]>().asObservable(),
      customAttackResult$: new Subject<CustomAttackResult>().asObservable(),
      getCreatures: () => creatures,
      getElements: () => elements,
      setElementState: () => { },
      applyCreaturePatches: (patches) => { batches.push([...patches]); },
      buildAddConditionsPatch: () => ({}),
      autoBindHeroCards: () => Promise.resolve(),
      recordDamage: () => { },
      recordKill: () => { },
      killCreature: () => { },
      recordHalfExecution: () => { },
    };

    const deckServiceStub: Partial<CharacterDeckService> = {
      loadDeck: () => Promise.resolve(deck),
      getLoadedDeck: () => deck,
      resolve: () => [],
      cardById: (id) => deck.cards.find(c => c.cardId === id) ?? null,
      hasPackedInitiatives: () => false,
    };

    TestBed.configureTestingModule({
      imports: [PlayerCardExecutionPanelComponent],
      providers: [
        { provide: AppContext, useValue: appContextStub },
        { provide: CharacterDeckService, useValue: deckServiceStub },
        { provide: LogService, useValue: { appendDamageToLastBatch: () => { }, appendKillToLastBatch: () => { } } },
      ],
    });

    panel = TestBed.createComponent(PlayerCardExecutionPanelComponent).componentInstance;
    panel.selectTile({ source: 'A', half: 'top', card: sweepingBlow, content: sweepingBlow.top, label: 'Sweeping Blow' });
  });

  it('flags the attack as multi-target, resolved one target at a time', () => {
    expect(panel.isCurrentAttackMultiTarget).toBe(true);
    expect(panel.isSequentialAttack).toBe(true);
    // Not the simultaneous pick-them-all mode: that is for actions with no draw.
    expect(panel.isMultiSelect).toBe(false);
  });

  it('takes one target at a time rather than accumulating a set', () => {
    panel.selectTarget('mob1');
    expect(panel.targets.map(t => t.id)).toEqual(['mob1']);

    panel.selectTarget('mob2');
    expect(panel.targets.map(t => t.id)).toEqual(['mob2']);
  });

  it('cannot execute until a target is chosen', () => {
    panel.setModifier(0); // the other gate, so only the target one is under test
    expect(panel.canExecute).toBe(false);
    panel.selectTarget('mob1');
    expect(panel.canExecute).toBe(true);
  });

  it('previews only the target currently being struck', () => {
    panel.selectTarget('mob1'); // armor 1
    expect(panel.damagePreview?.damage).toBe(2);

    panel.selectTarget('mob2'); // no armor
    expect(panel.damagePreview?.damage).toBe(3);
  });

  it('gives every target its own modifier draw and its own damage instance', () => {
    panel.selectTarget('mob1');
    panel.setModifier(1);       // +1 against mob1, through its 1 armour
    panel.execute();

    panel.selectTarget('mob2');
    panel.setModifier('miss');  // missed mob2 entirely
    panel.execute();

    expect(patched('mob1')?.hp).toBe(20 - 3);  // (3 + 1) − 1 armour
    expect(patched('mob2')?.hp).toBe(20);      // a miss deals nothing
  });

  it('clears the drawn modifier between targets, so it is never reused by accident', () => {
    panel.selectTarget('mob1');
    panel.setModifier('x2');
    panel.execute();

    // Back to "nothing drawn" — not ±0, which is itself a card the player must draw.
    expect(panel.modifier).toBeNull();
    expect(panel.awaitingModifier).toBe(true);
  });

  it('applies each strike as its own batch, so each undoes on its own', () => {
    panel.selectTarget('mob1');
    panel.setModifier(0);
    panel.execute();
    panel.selectTarget('mob2');
    panel.setModifier(0);
    panel.execute();

    expect(batches.length).toBe(2);
    expect(batches[0].map(p => p.creatureId)).toEqual(['mob1']);
    expect(batches[1].map(p => p.creatureId)).toEqual(['mob2']);
  });

  it('will not offer an enemy this attack action already struck', () => {
    panel.selectTarget('mob1');
    panel.setModifier(0);
    panel.execute();

    expect(panel.targetOptions.some(o => o.id === 'mob1')).toBe(false);
    expect(panel.targetOptions.some(o => o.id === 'mob2')).toBe(true);
    expect(panel.struckTargets.map(c => c.id)).toEqual(['mob1']);
  });

  it('does not spend the half until the attack is finished', () => {
    panel.selectTarget('mob1');
    panel.setModifier(0);
    panel.execute();
    expect(patched('hero')).toBeUndefined();

    panel.finishAttack();
    expect(patched('hero')?.topHalfState).toBe('executed');
  });

  it('does not re-apply the last strike when the attack is finished', () => {
    panel.selectTarget('mob1');
    panel.setModifier(0);
    panel.execute();
    const strikes = batches.length;

    panel.finishAttack();

    // Only the finalizing batch is added, and it carries the hero patch alone.
    expect(batches.length).toBe(strikes + 1);
    expect(batches[strikes].map(p => p.creatureId)).toEqual(['hero']);
  });

  it('runs out of targets once every enemy has been struck', () => {
    panel.selectTarget('mob1');
    panel.setModifier(0);
    panel.execute();
    panel.selectTarget('mob2');
    panel.setModifier(0);
    panel.execute();

    expect(panel.targetOptions.length).toBe(0);
    expect(panel.allTargetsStruck).toBe(true);
  });

  describe('two attack actions on one half', () => {
    beforeEach(() => {
      creatures[0].cardAId = 901;
      panel.selectTile({ source: 'A', half: 'top', card: doubleSweep, content: doubleSweep.top, label: 'Double Sweep' });
    });

    it('lets the second attack action strike an enemy the first one already hit', () => {
      panel.selectTarget('mob1');
      panel.setModifier(0);
      panel.execute();
      expect(panel.targetOptions.some(o => o.id === 'mob1')).toBe(false);

      panel.finishAttack(); // done with attack 1, on to attack 2

      expect(panel.attackIndex).toBe(1);
      expect(panel.targetOptions.some(o => o.id === 'mob1')).toBe(true);
      expect(panel.struckTargets.length).toBe(0);
    });

    it('uses the second attack own printed value, not the first', () => {
      panel.selectTarget('mob1');
      panel.setModifier(0);
      panel.execute();
      panel.finishAttack();

      // Attack 1 for the second action, against mob1's 1 armour.
      panel.selectTarget('mob1');
      panel.setModifier(0);
      expect(panel.damagePreview?.damage).toBe(0);
      expect(panel.selectedAttackValue).toBe(1);
    });

    it('starts the next attack action needing its own draw', () => {
      panel.selectTarget('mob1');
      panel.setModifier(2);
      panel.execute();
      panel.finishAttack();

      expect(panel.modifier).toBeNull();
      expect(panel.canExecute).toBe(false);
    });

    it('only spends the half after the last attack action is finished', () => {
      panel.selectTarget('mob1');
      panel.setModifier(0);
      panel.execute();
      panel.finishAttack();
      expect(patched('hero')).toBeUndefined();

      panel.selectTarget('mob2');
      panel.setModifier(0);
      panel.execute();
      panel.finishAttack();
      expect(patched('hero')?.topHalfState).toBe('executed');
    });
  });

  it('never offers an ally as an attack target', () => {
    expect(panel.targetOptions.some(o => o.id === 'ally')).toBe(false);
  });
});

/**
 * `multiTarget: true` printed on a `condition` action with no `attack` alongside it
 * (e.g. trap's "Enticing Bait": "Muddle. Muddle each adjacent enemy" as a pure debuff).
 * `currentAttack` is null for a half like this, so the multi-target check can't read
 * it off there — it has to fall back to the condition action itself.
 */
describe('PlayerCardExecutionPanelComponent multi-target with no attack', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let creatures: Creature[];
  let elements: Element[];
  let patchCalls: { creatureId: string; patch: Partial<Creature> }[];
  let conditionCalls: { creatureId: string }[];

  const enticingBait: CharacterAbilityCard = {
    cardId: 279, name: 'Enticing Bait', level: 1, initiative: 30,
    top: { actions: [{ type: 'xp', value: 1 }] },
    bottom: {
      actions: [
        { type: 'condition', value: 'muddle', multiTarget: true },
        { type: 'xp', value: 2 },
      ],
    },
  };

  const deck: CharacterDeck = {
    characterClass: 'trap', edition: 'fh',
    cards: [enticingBait],
  };

  beforeEach(() => {
    elements = (Object.values(ElementType) as ElementType[]).map(type => ({ type, state: 0 as any }));
    patchCalls = [];
    conditionCalls = [];
    creatures = [
      {
        id: 'hero', type: 'trap', aggressive: false, level: 1,
        initiative: 30, secondaryInitiative: 0, cardAId: 279, cardBId: null,
        hp: 10, maxHp: 10, totalXp: 0, sessionExperience: 0,
      },
      { id: 'mob1', type: 'algox-guard', aggressive: true, hp: 20, maxHp: 20, conditions: [] },
      { id: 'mob2', type: 'algox-guard', aggressive: true, hp: 20, maxHp: 20, conditions: [] },
    ];

    const appContextStub: Partial<AppContext> = {
      cardPanelCreatureId: 'hero',
      creatures$: new Subject<Creature[]>().asObservable(),
      customAttackResult$: new Subject<CustomAttackResult>().asObservable(),
      getCreatures: () => creatures,
      getElements: () => elements,
      setElementState: () => { },
      applyCreaturePatches: (patches) => { patchCalls.push(...patches); },
      buildAddConditionsPatch: (target) => { conditionCalls.push({ creatureId: target.id! }); return {}; },
      autoBindHeroCards: () => Promise.resolve(),
      recordDamage: () => { },
      recordKill: () => { },
      killCreature: () => { },
      recordHalfExecution: () => { },
    };

    const deckServiceStub: Partial<CharacterDeckService> = {
      loadDeck: () => Promise.resolve(deck),
      getLoadedDeck: () => deck,
      resolve: () => [],
      cardById: (id) => deck.cards.find(c => c.cardId === id) ?? null,
      hasPackedInitiatives: () => false,
    };

    TestBed.configureTestingModule({
      imports: [PlayerCardExecutionPanelComponent],
      providers: [
        { provide: AppContext, useValue: appContextStub },
        { provide: CharacterDeckService, useValue: deckServiceStub },
        { provide: LogService, useValue: { appendDamageToLastBatch: () => { }, appendKillToLastBatch: () => { } } },
      ],
    });

    panel = TestBed.createComponent(PlayerCardExecutionPanelComponent).componentInstance;
    panel.selectTile({ source: 'A', half: 'bottom', card: enticingBait, content: enticingBait.bottom, label: 'Enticing Bait' });
  });

  it('flags the half as multi-target even though it has no attack action', () => {
    expect(panel.currentAttack).toBeNull();
    expect(panel.isCurrentAttackMultiTarget).toBe(true);
  });

  it('lets the player select more than one enemy', () => {
    panel.selectTarget('mob1');
    panel.selectTarget('mob2');
    expect(panel.targets.map(t => t.id)).toEqual(['mob1', 'mob2']);
  });

  it('applies the condition to every selected target on execute', () => {
    panel.selectTarget('mob1');
    panel.selectTarget('mob2');
    panel.execute();

    expect(conditionCalls.map(c => c.creatureId).sort()).toEqual(['mob1', 'mob2']);
    const heroPatch = patchCalls.find(p => p.creatureId === 'hero')?.patch;
    expect(heroPatch?.bottomHalfState).toBe('executed');
  });
});

/**
 * `multiTarget: true` on a `heal` — the same "no attack, no modifier draw, applied to
 * every selected target at once" shape as a multi-target `condition`. Not documented
 * for a long stretch (the README said not to do this at all), but the panel has
 * supported it the whole time — `multiTargetAction` checks `heal?.multiTarget`
 * explicitly, right alongside the `condition` case above.
 */
describe('PlayerCardExecutionPanelComponent multi-target heal', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let creatures: Creature[];
  let elements: Element[];

  const groupMend: CharacterAbilityCard = {
    cardId: 280, name: 'Group Mend', level: 1, initiative: 30,
    top: { actions: [{ type: 'heal', value: 3, multiTarget: true }] },
    bottom: { actions: [] },
  };

  const deck: CharacterDeck = {
    characterClass: 'drifter', edition: 'fh', cards: [groupMend],
  };

  beforeEach(() => {
    elements = (Object.values(ElementType) as ElementType[]).map(type => ({ type, state: 0 as any }));
    creatures = [
      {
        id: 'hero', type: 'drifter', aggressive: false, level: 1,
        initiative: 30, secondaryInitiative: 0, cardAId: 280, cardBId: null,
        hp: 10, maxHp: 10, totalXp: 0, sessionExperience: 0,
      },
      { id: 'ally1', type: 'drifter', aggressive: false, hp: 4, maxHp: 10, conditions: [] },
      { id: 'ally2', type: 'drifter', aggressive: false, hp: 5, maxHp: 8, conditions: [] },
    ];

    const appContextStub: Partial<AppContext> = {
      cardPanelCreatureId: 'hero',
      creatures$: new Subject<Creature[]>().asObservable(),
      customAttackResult$: new Subject<CustomAttackResult>().asObservable(),
      getCreatures: () => creatures,
      getElements: () => elements,
      setElementState: () => { },
      applyCreaturePatches: (patches) => {
        for (const { creatureId, patch } of patches) {
          const c = creatures.find(x => x.id === creatureId);
          if (c) Object.assign(c, patch);
        }
      },
      buildAddConditionsPatch: () => ({}),
      buildRemoveConditionsPatch: () => ({}),
      autoBindHeroCards: () => Promise.resolve(),
      recordDamage: () => { },
      recordKill: () => { },
      killCreature: () => { },
      recordHalfExecution: () => { },
    };

    const deckServiceStub: Partial<CharacterDeckService> = {
      loadDeck: () => Promise.resolve(deck),
      getLoadedDeck: () => deck,
      resolve: () => [],
      cardById: (id) => deck.cards.find(c => c.cardId === id) ?? null,
      hasPackedInitiatives: () => false,
    };

    TestBed.configureTestingModule({
      imports: [PlayerCardExecutionPanelComponent],
      providers: [
        { provide: AppContext, useValue: appContextStub },
        { provide: CharacterDeckService, useValue: deckServiceStub },
        { provide: LogService, useValue: { appendDamageToLastBatch: () => { }, appendKillToLastBatch: () => { } } },
      ],
    });

    panel = TestBed.createComponent(PlayerCardExecutionPanelComponent).componentInstance;
    panel.selectTile({ source: 'A', half: 'top', card: groupMend, content: groupMend.top, label: 'Group Mend' });
  });

  it('flags the half as multi-target even though it has no attack action', () => {
    expect(panel.currentAttack).toBeNull();
    expect(panel.isCurrentAttackMultiTarget).toBe(true);
    expect(panel.isMultiSelect).toBe(true);
  });

  it('offers allies, not enemies, from the toggle strip', () => {
    expect(panel.targetOptions.map(c => c.id)).toEqual(jasmine.arrayWithExactContents(['hero', 'ally1', 'ally2']));
  });

  it('heals every selected ally on execute, each capped at their own max', () => {
    panel.selectTarget('ally1');
    panel.selectTarget('ally2');
    panel.execute();

    expect(creatures.find(c => c.id === 'ally1')!.hp).toBe(7);   // 4 + 3
    expect(creatures.find(c => c.id === 'ally2')!.hp).toBe(8);   // 5 + 3, capped at maxHp 8
  });

  it('leaves a deselected ally untouched', () => {
    panel.selectTarget('ally1');
    panel.selectTarget('ally2');
    panel.selectTarget('ally2'); // toggle off
    panel.execute();

    expect(creatures.find(c => c.id === 'ally1')!.hp).toBe(7);
    expect(creatures.find(c => c.id === 'ally2')!.hp).toBe(5);   // untouched
  });
});
