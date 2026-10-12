import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext, CustomAttackResult } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import { Creature, CreatureConditions, Element, ElementState, ElementType } from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * Regression for astral #189 "Emerald Edge" top: `elementBonus` consuming Earth+Dark
 * grants Attack 5, Ward (self) and 1 XP — nothing else on the half at all. Two
 * compounding bugs made this a no-op:
 *
 * 1. `collectAttacks` never looks inside a conditional bonus's `subActions` (an
 *    `elementBonus`'s own `attack` normally only *adds* to an existing base attack via
 *    `takenBonusAttack` — see `takenBonusList`), so with no other attack on the half,
 *    `selectedAttacks` was empty and the strike could never be targeted or resolved.
 * 2. `takenBonusConditions` didn't check `selfOnly` on a bonus-granted condition, so
 *    the Ward — meant for the acting hero — was fed into the *target-facing* condition
 *    list instead, and the panel asked to pick an ally for it.
 */
describe('PlayerCardExecutionPanelComponent — a bonus whose subActions are the whole half', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let fixture: ComponentFixture<PlayerCardExecutionPanelComponent>;
  let creatures: Creature[];
  let elements: Element[];
  let elementCalls: { type: ElementType; state: ElementState }[];
  let patchCalls: { creatureId: string; patch: Partial<Creature> }[];

  const emeraldEdge: CharacterAbilityCard = {
    cardId: 189, name: 'Emerald Edge', level: 1, initiative: 70,
    top: {
      actions: [{
        type: 'elementBonus',
        elements: ['earth', 'dark'],
        consumeMode: 'all',
        subActions: [
          { type: 'attack', value: 5 },
          { type: 'condition', value: 'ward', selfOnly: true },
          { type: 'xp', value: 1 },
        ],
      }],
    },
    bottom: { actions: [] },
  };

  const deck: CharacterDeck = {
    characterClass: 'astral', edition: 'fh', cards: [emeraldEdge],
  };

  const heroPatch = () => patchCalls.find(p => p.creatureId === 'hero')?.patch;

  beforeEach(() => {
    patchCalls = [];
    elementCalls = [];
    elements = [
      { type: ElementType.Earth, state: ElementState.Full },
      { type: ElementType.Dark, state: ElementState.Full },
      { type: ElementType.Fire, state: ElementState.None },
      { type: ElementType.Ice, state: ElementState.None },
      { type: ElementType.Air, state: ElementState.None },
      { type: ElementType.Light, state: ElementState.None },
    ];
    creatures = [
      {
        id: 'hero', type: 'astral', aggressive: false, level: 1,
        initiative: 70, secondaryInitiative: 0, cardAId: 189, cardBId: null,
        hp: 10, maxHp: 10, totalXp: 0, sessionExperience: 0, conditions: [],
      },
      { id: 'mob', type: 'algox-guard', aggressive: true, hp: 20, maxHp: 20, armor: 0, conditions: [] },
    ];

    const appContextStub: Partial<AppContext> = {
      cardPanelCreatureId: 'hero',
      creatures$: new Subject<Creature[]>().asObservable(),
      customAttackResult$: new Subject<CustomAttackResult>().asObservable(),
      getCreatures: () => creatures,
      getElements: () => elements,
      setElementState: (type, state) => { elementCalls.push({ type, state }); },
      applyCreaturePatches: (patches) => {
        patchCalls.push(...patches);
        for (const { creatureId, patch } of patches) {
          const creature = creatures.find(c => c.id === creatureId);
          if (creature) Object.assign(creature, patch);
        }
      },
      buildAddConditionsPatch: (creature, conditions) => {
        const current = creature.conditions ?? [];
        const added = conditions.filter(c => !current.includes(c));
        return added.length ? { conditions: [...current, ...added] } : {};
      },
      buildRemoveConditionsPatch: (creature) => ({ conditions: creature.conditions ?? [] }),
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

    fixture = TestBed.createComponent(PlayerCardExecutionPanelComponent);
    panel = fixture.componentInstance;
    panel.selected = { source: 'A', half: 'top' };
  });

  it('resolves nothing before the bonus is taken — no attack, no target needed', () => {
    expect(panel.selectedAttackValue).toBe(0);
    expect(panel.needsTarget).toBe(false);
  });

  it('surfaces the bonus attack once taken, needing an enemy target and a modifier draw', () => {
    panel.toggleBonus(0, panel.selectedBonuses[0]);

    expect(panel.selectedAttackValue).toBe(5);
    expect(panel.needsTarget).toBe(true);
    expect(panel.targetsAreHeroes).toBe(false);
    expect(panel.targetOptions.map(c => c.id)).toContain('mob');
  });

  it('does not offer Ward as a target-facing condition — it stays self-only', () => {
    panel.toggleBonus(0, panel.selectedBonuses[0]);

    expect(panel.selectedConditions).toEqual([]);
    expect(panel.selectedSelfConditions).toEqual([CreatureConditions.ward]);
  });

  it('strikes the enemy for exactly 5 (not 10) — the bonus attack is the base, not an addend', () => {
    panel.toggleBonus(0, panel.selectedBonuses[0]);
    panel.selectTarget('mob');
    panel.setModifier(0);
    panel.execute();

    expect(creatures.find(c => c.id === 'mob')!.hp).toBe(15); // 20 - 5
  });

  it('consumes both elements and awards xp, and wards the hero, on execute', () => {
    panel.toggleBonus(0, panel.selectedBonuses[0]);
    panel.selectTarget('mob');
    panel.setModifier(0);
    panel.execute();

    expect(elementCalls).toEqual(jasmine.arrayWithExactContents([
      { type: ElementType.Earth, state: ElementState.None },
      { type: ElementType.Dark, state: ElementState.None },
    ]));
    expect(heroPatch()?.sessionExperience).toBe(1);
    expect(heroPatch()?.conditions).toEqual([CreatureConditions.ward]);
  });
});
