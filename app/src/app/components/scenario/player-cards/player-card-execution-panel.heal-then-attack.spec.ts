import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext, CustomAttackResult } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import { Creature, Element, ElementState, ElementType } from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * A half pairing a target-facing heal with an attack — shackles "Reversal of Fate":
 * Heal 5 to an ally, Attack 5 to an enemy. The two land on different creatures, so
 * the panel resolves the heal first, against a picked ally, before the attack (which
 * behaves exactly as an ordinary single-attack half once the heal is out of the way).
 */
describe('PlayerCardExecutionPanelComponent heal-then-attack halves', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let fixture: ComponentFixture<PlayerCardExecutionPanelComponent>;
  let creatures: Creature[];
  let elements: Element[];
  let patchCalls: { creatureId: string; patch: Partial<Creature> }[];

  const reversalOfFate: CharacterAbilityCard = {
    cardId: 314, name: 'Reversal of Fate', level: 2, initiative: 23,
    top: {
      actions: [
        { type: 'heal', value: 5 },
        { type: 'attack', value: 5 },
        { type: 'xp', value: 2 },
      ],
    },
    bottom: { actions: [] },
  };

  const deck: CharacterDeck = {
    characterClass: 'shackles', edition: 'fh',
    cards: [reversalOfFate],
  };

  beforeEach(() => {
    patchCalls = [];
    elements = (Object.values(ElementType) as ElementType[])
      .map(type => ({ type, state: ElementState.None }));
    creatures = [
      {
        id: 'hero', type: 'shackles', aggressive: false, level: 2,
        initiative: 23, secondaryInitiative: 0, cardAId: 314, cardBId: null,
        hp: 10, maxHp: 10, totalXp: 0, sessionExperience: 0,
      },
      { id: 'mob', type: 'algox-guard', aggressive: true, hp: 20, maxHp: 20, conditions: [] },
      { id: 'ally', type: 'drifter', aggressive: false, hp: 5, maxHp: 10, conditions: [] },
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
      buildAddConditionsPatch: (creature, conditions) => {
        const current = creature.conditions ?? [];
        const added = conditions.filter(c => !current.includes(c));
        return added.length ? { conditions: [...current, ...added] } : {};
      },
      buildRemoveConditionsPatch: (creature, removed) => {
        const current = creature.conditions ?? [];
        return { conditions: current.filter(c => !removed.includes(c)) };
      },
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

  it('offers allies first, for the heal, not enemies', () => {
    expect(panel.isResolvingHealStep).toBe(true);
    expect(panel.targetsAreHeroes).toBe(true);
    expect(panel.targetOptions.map(c => c.id)).toContain('ally');
    expect(panel.targetOptions.map(c => c.id)).not.toContain('mob');
  });

  it('withholds Execute until an ally is picked for the heal', () => {
    expect(panel.canExecute).toBe(false);
    panel.selectTarget('ally');
    expect(panel.canExecute).toBe(true);
  });

  it('heals the picked ally, then switches to offering enemies for the attack', () => {
    panel.selectTarget('ally');
    panel.execute();

    expect(creatures.find(c => c.id === 'ally')!.hp).toBe(10); // 5 + 5, capped at max
    expect(panel.isResolvingHealStep).toBe(false);
    expect(panel.targetsAreHeroes).toBe(false);
    expect(panel.targetOptions.map(c => c.id)).toContain('mob');
    expect(panel.targetOptions.map(c => c.id)).not.toContain('ally');
    // Nothing lands on the half yet — the half isn't spent until the attack resolves.
    expect(panel.canExecute).toBe(false); // no enemy picked, no modifier drawn
  });

  it('does not re-apply the heal once the attack step is reached', () => {
    panel.selectTarget('ally');
    panel.execute(); // heal step
    expect(patchCalls.filter(p => p.creatureId === 'ally').length).toBe(1);

    panel.selectTarget('mob');
    panel.setModifier(0);
    panel.execute(); // attack step, finalizes the half

    expect(patchCalls.filter(p => p.creatureId === 'ally').length).toBe(1);
    expect(creatures.find(c => c.id === 'mob')!.hp).toBe(15); // 20 - 5
  });

  it('finalizes XP and spends the half only once the attack lands', () => {
    panel.selectTarget('ally');
    panel.execute(); // heal step — half must not be marked spent yet

    expect(creatures.find(c => c.id === 'hero')!.totalXp).toBe(0);

    panel.selectTarget('mob');
    panel.setModifier(0);
    panel.execute();

    expect(creatures.find(c => c.id === 'hero')!.totalXp).toBe(2);
  });
});
