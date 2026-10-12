import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext, CustomAttackResult } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import { Creature, CreatureConditions, Element, ElementState, ElementType } from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * A heal's interaction with wound and poison — an app-specific house rule, not the
 * rulebook's (which removes both regardless):
 *
 * - **wound** comes off and the heal lands normally;
 * - **poison** comes off too, but the heal itself is withheld — no HP is gained.
 *
 * Covers both a target-facing heal (through `computeTargetPatches`) and a `selfOnly`
 * one (through `finalizeHalf`'s separate hero-patch path), since they're two different
 * code paths in the panel.
 */
describe('PlayerCardExecutionPanelComponent heal vs wound/poison', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let fixture: ComponentFixture<PlayerCardExecutionPanelComponent>;
  let creatures: Creature[];
  let elements: Element[];
  let patchCalls: { creatureId: string; patch: Partial<Creature> }[];

  /** Heal 5, target-facing. */
  const mendingTouch: CharacterAbilityCard = {
    cardId: 601, name: 'Mending Touch', level: 1, initiative: 40,
    top: { actions: [{ type: 'heal', value: 5 }] },
    bottom: { actions: [] },
  };

  /** Heal 5, self. */
  const innerWard: CharacterAbilityCard = {
    cardId: 602, name: 'Inner Ward', level: 1, initiative: 41,
    top: { actions: [{ type: 'heal', value: 5, selfOnly: true }] },
    bottom: { actions: [] },
  };

  const deck: CharacterDeck = {
    characterClass: 'drifter', edition: 'fh', cards: [mendingTouch, innerWard],
  };

  const realAddConditionsPatch = (creature: Creature, conditions: CreatureConditions[]): Partial<Creature> => {
    const current = creature.conditions ?? [];
    const added = conditions.filter(c => !current.includes(c));
    if (added.length === 0) return {};
    return { conditions: [...current, ...added] };
  };

  const realRemoveConditionsPatch = (creature: Creature, conditions: CreatureConditions[]): Partial<Creature> => {
    const current = creature.conditions ?? [];
    const removed = conditions.filter(c => current.includes(c));
    if (removed.length === 0) return {};
    return { conditions: current.filter(c => !removed.includes(c)) };
  };

  const ally = () => creatures.find(c => c.id === 'ally')!;
  const hero = () => creatures.find(c => c.id === 'hero')!;

  beforeEach(() => {
    patchCalls = [];
    elements = (Object.values(ElementType) as ElementType[])
      .map(type => ({ type, state: ElementState.None }));
    creatures = [
      {
        id: 'hero', type: 'drifter', aggressive: false, level: 1,
        initiative: 40, secondaryInitiative: 41, cardAId: 601, cardBId: 602,
        hp: 4, maxHp: 10, totalXp: 0, sessionExperience: 0, conditions: [],
      },
      { id: 'ally', type: 'drifter', aggressive: false, hp: 4, maxHp: 10, conditions: [] },
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
      buildRemoveConditionsPatch: realRemoveConditionsPatch,
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
  });

  describe('target-facing heal', () => {
    beforeEach(() => {
      panel.selected = { source: 'A', half: 'top' };
    });

    it('heals a wounded ally normally and removes the wound', () => {
      ally().conditions = [CreatureConditions.wound];
      panel.selectTarget('ally');
      panel.execute();

      expect(ally().hp).toBe(9); // 4 + 5
      expect(ally().conditions).toEqual([]);
    });

    it('does not raise a poisoned ally\'s HP, but removes the poison', () => {
      ally().conditions = [CreatureConditions.poison];
      panel.selectTarget('ally');
      panel.execute();

      expect(ally().hp).toBe(4); // unchanged
      expect(ally().conditions).toEqual([]);
    });

    it('heals normally when unconditioned', () => {
      panel.selectTarget('ally');
      panel.execute();

      expect(ally().hp).toBe(9);
    });

    it('removes both wound and poison, with poison still blocking the heal', () => {
      ally().conditions = [CreatureConditions.wound, CreatureConditions.poison];
      panel.selectTarget('ally');
      panel.execute();

      expect(ally().hp).toBe(4);
      expect(ally().conditions).toEqual([]);
    });

  });

  describe('selfOnly heal', () => {
    beforeEach(() => {
      panel.selected = { source: 'B', half: 'top' };
    });

    it('heals a wounded hero normally and removes the wound', () => {
      hero().conditions = [CreatureConditions.wound];
      panel.execute();

      expect(hero().hp).toBe(9);
      expect(hero().conditions).toEqual([]);
    });

    it('does not raise a poisoned hero\'s HP, but removes the poison', () => {
      hero().conditions = [CreatureConditions.poison];
      panel.execute();

      expect(hero().hp).toBe(4);
      expect(hero().conditions).toEqual([]);
    });

    it('records nothing to remove when unconditioned', () => {
      panel.execute();
      expect(hero().hp).toBe(9);
      expect(hero().conditions).toEqual([]);
    });
  });
});
