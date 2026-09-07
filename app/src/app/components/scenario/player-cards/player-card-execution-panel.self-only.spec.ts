import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext, CustomAttackResult } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import { Creature, CreatureConditions, Element, ElementType } from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * A card-printed `selfOnly` flag on `heal`/`condition` — always the acting hero,
 * never the picked target, so it needs no target selection and doesn't consume or
 * land on whatever the half's own attack/heal/condition targets.
 */
describe('PlayerCardExecutionPanelComponent selfOnly heal/condition', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let creatures: Creature[];
  let elements: Element[];
  let patchCalls: { creatureId: string; patch: Partial<Creature> }[];

  // Attack 2 the enemy, Heal 2 self — no target needed for the self-heal.
  const bloodyStrike: CharacterAbilityCard = {
    cardId: 600, name: 'Bloody Strike', level: 1, initiative: 40,
    top: {
      actions: [
        { type: 'attack', value: 2 },
        { type: 'heal', value: 2, selfOnly: true },
      ],
    },
    bottom: { actions: [{ type: 'condition', value: 'strengthen', selfOnly: true }] },
  };

  const deck: CharacterDeck = {
    characterClass: 'drifter', edition: 'fh',
    cards: [bloodyStrike],
  };

  const realAddConditionsPatch = (creature: Creature, conditions: CreatureConditions[]): Partial<Creature> => {
    const immunities = creature.immunities ?? [];
    const current = creature.conditions ?? [];
    const added = conditions.filter(c => !current.includes(c) && !immunities.includes(c));
    if (added.length === 0) return {};
    return { conditions: [...current, ...added] };
  };

  beforeEach(() => {
    elements = (Object.values(ElementType) as ElementType[]).map(type => ({ type, state: 0 as any }));
    patchCalls = [];
    creatures = [
      {
        id: 'hero', type: 'drifter', aggressive: false, level: 1,
        initiative: 40, secondaryInitiative: 0, cardAId: 600, cardBId: null,
        hp: 6, maxHp: 10, totalXp: 0, sessionExperience: 0, conditions: [],
      },
      { id: 'mob', type: 'algox-guard', aggressive: true, hp: 20, maxHp: 20, conditions: [], armor: 0 },
    ];

    const appContextStub: Partial<AppContext> = {
      cardPanelCreatureId: 'hero',
      creatures$: new Subject<Creature[]>().asObservable(),
      customAttackResult$: new Subject<CustomAttackResult>().asObservable(),
      getCreatures: () => creatures,
      getElements: () => elements,
      setElementState: () => { },
      applyCreaturePatches: (patches) => {
        patchCalls.push(...patches);
        for (const { creatureId, patch } of patches) {
          const creature = creatures.find(c => c.id === creatureId);
          if (creature) Object.assign(creature, patch);
        }
      },
      buildAddConditionsPatch: realAddConditionsPatch,
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
  });

  it('reads a self-only heal separately from the target-facing heal value', () => {
    panel.selectTile({ source: 'A', half: 'top', card: bloodyStrike, content: bloodyStrike.top, label: 'Bloody Strike' });
    expect(panel.selectedSelfHealValue).toBe(2);
    expect(panel.selectedHealValue).toBe(0);
  });

  it('needs no target for a self-only condition half', () => {
    panel.selectTile({ source: 'A', half: 'bottom', card: bloodyStrike, content: bloodyStrike.bottom, label: 'Bloody Strike' });
    expect(panel.selectedSelfConditions).toEqual(['strengthen'] as any);
    expect(panel.selectedConditions).toEqual([]);
    expect(panel.needsTarget).toBe(false);
    expect(panel.canExecute).toBe(true);
  });

  it('heals the acting hero, not the attack target, on execute', () => {
    panel.selectTile({ source: 'A', half: 'top', card: bloodyStrike, content: bloodyStrike.top, label: 'Bloody Strike' });
    panel.selectTarget('mob');
    panel.setModifier(0);
    panel.execute();

    expect(creatures.find(c => c.id === 'hero')!.hp).toBe(8); // 6 + 2 self-heal
    expect(creatures.find(c => c.id === 'mob')!.hp).toBe(18); // 20 − 2 attack, no heal landed here
  });

  it('applies a self-only condition to the acting hero with no target picked', () => {
    panel.selectTile({ source: 'A', half: 'bottom', card: bloodyStrike, content: bloodyStrike.bottom, label: 'Bloody Strike' });
    panel.execute();

    expect(creatures.find(c => c.id === 'hero')!.conditions).toEqual(['strengthen'] as any);
  });

  it('the +/- buttons nudge a self-only heal, floored at 0', () => {
    panel.selectTile({ source: 'A', half: 'top', card: bloodyStrike, content: bloodyStrike.top, label: 'Bloody Strike' });
    expect(panel.hasSelectedHeal).toBe(true);
    expect(panel.isCurrentHealSelfOnly).toBe(true);
    expect(panel.healDisplayValue).toBe(2);

    panel.adjustHeal(1);
    expect(panel.selectedSelfHealValue).toBe(3);
    expect(panel.healDisplayValue).toBe(3);

    panel.adjustHeal(-5); // would go to -2, floored at 0
    expect(panel.selectedSelfHealValue).toBe(0);

    panel.selectTarget('mob');
    panel.setModifier(0);
    panel.execute();
    expect(creatures.find(c => c.id === 'hero')!.hp).toBe(6); // no self-heal landed
  });

  it('resets the heal adjustment when a new half is selected', () => {
    panel.selectTile({ source: 'A', half: 'top', card: bloodyStrike, content: bloodyStrike.top, label: 'Bloody Strike' });
    panel.adjustHeal(2);
    expect(panel.selectedSelfHealValue).toBe(4);

    panel.selectTile({ source: 'A', half: 'bottom', card: bloodyStrike, content: bloodyStrike.bottom, label: 'Bloody Strike' });
    panel.selectTile({ source: 'A', half: 'top', card: bloodyStrike, content: bloodyStrike.top, label: 'Bloody Strike' });
    expect(panel.selectedSelfHealValue).toBe(2);
  });
});

/**
 * shackles "Cleansing Fire" bottom: "Heal 1. Heal 2." — two separate selfOnly `heal`
 * actions on the same half, both landing on the acting hero. Regression coverage for
 * a bug where only the first one was ever read, so the hero was healed 1 instead of 3.
 */
describe('PlayerCardExecutionPanelComponent multiple selfOnly heals on one half', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let creatures: Creature[];
  let elements: Element[];

  const cleansingFire: CharacterAbilityCard = {
    cardId: 319, name: 'Cleansing Fire', level: 1, initiative: 64,
    top: { actions: [] },
    bottom: {
      actions: [
        { type: 'heal', value: 1, selfOnly: true },
        { type: 'heal', value: 2, selfOnly: true },
      ],
    },
  };

  const deck: CharacterDeck = {
    characterClass: 'shackles', edition: 'fh',
    cards: [cleansingFire],
  };

  beforeEach(() => {
    elements = (Object.values(ElementType) as ElementType[]).map(type => ({ type, state: 0 as any }));
    creatures = [
      {
        id: 'hero', type: 'shackles', aggressive: false, level: 1,
        initiative: 64, secondaryInitiative: 0, cardAId: 319, cardBId: null,
        hp: 4, maxHp: 10, totalXp: 0, sessionExperience: 0, conditions: [],
      },
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
          const creature = creatures.find(c => c.id === creatureId);
          if (creature) Object.assign(creature, patch);
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
    panel.selectTile({ source: 'A', half: 'bottom', card: cleansingFire, content: cleansingFire.bottom, label: 'Cleansing Fire' });
  });

  it('sums both selfOnly heals rather than reading just the first', () => {
    expect(panel.selectedSelfHealValue).toBe(3);
    expect(panel.healDisplayValue).toBe(3);
  });

  it('heals the hero for the combined total on execute', () => {
    panel.execute();
    expect(creatures.find(c => c.id === 'hero')!.hp).toBe(7); // 4 + 1 + 2
  });

  it('the +/- row adjusts the combined total, floored at 0', () => {
    panel.adjustHeal(1);
    expect(panel.selectedSelfHealValue).toBe(4);

    panel.adjustHeal(-10); // would go well negative, floored at 0
    expect(panel.selectedSelfHealValue).toBe(0);
  });
});

/** A target-facing heal, adjusted the same way an attack's value is. */
describe('PlayerCardExecutionPanelComponent heal +/- adjustment (target-facing)', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let creatures: Creature[];
  let elements: Element[];

  const mendingTouch: CharacterAbilityCard = {
    cardId: 601, name: 'Mending Touch', level: 1, initiative: 30,
    top: { actions: [{ type: 'heal', value: 3 }] },
    bottom: { actions: [] },
  };

  const deck: CharacterDeck = {
    characterClass: 'drifter', edition: 'fh',
    cards: [mendingTouch],
  };

  beforeEach(() => {
    elements = (Object.values(ElementType) as ElementType[]).map(type => ({ type, state: 0 as any }));
    creatures = [
      {
        id: 'hero', type: 'drifter', aggressive: false, level: 1,
        initiative: 30, secondaryInitiative: 0, cardAId: 601, cardBId: null,
        hp: 5, maxHp: 10, totalXp: 0, sessionExperience: 0,
      },
      { id: 'ally', type: 'brute', aggressive: false, hp: 4, maxHp: 12, conditions: [] },
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
          const creature = creatures.find(c => c.id === creatureId);
          if (creature) Object.assign(creature, patch);
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
  });

  it('raises and lowers the printed heal value for this turn', () => {
    panel.selectTile({ source: 'A', half: 'top', card: mendingTouch, content: mendingTouch.top, label: 'Mending Touch' });
    expect(panel.healDisplayValue).toBe(3);
    expect(panel.isCurrentHealSelfOnly).toBe(false);

    panel.adjustHeal(2);
    expect(panel.selectedHealValue).toBe(5);

    panel.selectTarget('ally');
    panel.execute();
    expect(creatures.find(c => c.id === 'ally')!.hp).toBe(9); // 4 + 5
  });
});
