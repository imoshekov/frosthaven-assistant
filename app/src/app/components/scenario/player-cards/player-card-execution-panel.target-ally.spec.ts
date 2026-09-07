import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext, CustomAttackResult } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import { Creature, CreatureConditions, Element, ElementState, ElementType } from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * `targetAlly` — a `condition` that inflicts a negative effect on a picked ally or
 * summon instead of an enemy, e.g. a card that curses or wounds a targeted teammate
 * rather than the acting hero (`selfOnly`) or a foe (the default). Same target-strip
 * switch as a beneficial condition, but the condition itself stays a debuff.
 */
describe('PlayerCardExecutionPanelComponent targetAlly conditions', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let fixture: ComponentFixture<PlayerCardExecutionPanelComponent>;
  let creatures: Creature[];
  let elements: Element[];
  let patchCalls: { creatureId: string; patch: Partial<Creature> }[];

  /** "Target an ally. That ally suffers Wound." — a pure debuff-on-ally half. */
  const bindingCurse: CharacterAbilityCard = {
    cardId: 501, name: 'Binding Curse', level: 1, initiative: 20,
    top: {
      actions: [{ type: 'condition', value: 'wound', targetAlly: true }],
    },
    bottom: { actions: [] },
  };

  /** Mixes a targetAlly debuff with an ordinary enemy attack — stays on enemies. */
  const mixedHalf: CharacterAbilityCard = {
    cardId: 502, name: 'Reckless Hex', level: 1, initiative: 21,
    top: {
      actions: [
        { type: 'attack', value: 2 },
        { type: 'condition', value: 'poison', targetAlly: true },
      ],
    },
    bottom: { actions: [] },
  };

  /** "Attack an ally. Attack 2." — a strike deliberately aimed at a teammate/summon. */
  const friendlyFire: CharacterAbilityCard = {
    cardId: 503, name: 'Friendly Fire', level: 1, initiative: 22,
    top: {
      actions: [{ type: 'attack', value: 2, targetAlly: true }],
    },
    bottom: { actions: [] },
  };

  /**
   * Two independent strikes (Rule 4): the first hits an ally, the second an enemy.
   * Each attack is scoped by `currentAttack`, so `targetAlly` should apply only to
   * the strike that carries it.
   */
  const splitStrike: CharacterAbilityCard = {
    cardId: 504, name: 'Split Strike', level: 1, initiative: 23,
    top: {
      actions: [
        { type: 'attack', value: 2, targetAlly: true },
        { type: 'attack', value: 3 },
      ],
    },
    bottom: { actions: [] },
  };

  const deck: CharacterDeck = {
    characterClass: 'shackles', edition: 'fh',
    cards: [bindingCurse, mixedHalf, friendlyFire, splitStrike],
  };

  beforeEach(() => {
    patchCalls = [];
    elements = (Object.values(ElementType) as ElementType[])
      .map(type => ({ type, state: ElementState.None }));
    creatures = [
      {
        id: 'hero', type: 'shackles', aggressive: false, level: 1,
        initiative: 20, secondaryInitiative: 21, cardAId: 501, cardBId: 502,
        hp: 10, maxHp: 10, totalXp: 0, sessionExperience: 0,
      },
      { id: 'mob', type: 'algox-guard', aggressive: true, hp: 20, maxHp: 20, conditions: [] },
      { id: 'ally', type: 'drifter', aggressive: false, hp: 10, maxHp: 10, conditions: [] },
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

  it('offers allies and summons, not enemies, for a targetAlly debuff', () => {
    panel.selected = { source: 'A', half: 'top' };

    expect(panel.selectedConditions).toEqual([CreatureConditions.wound]);
    expect(panel.targetsAreHeroes).toBe(true);
    expect(panel.targetOptions.map(c => c.id)).toContain('ally');
    expect(panel.targetOptions.map(c => c.id)).not.toContain('mob');
  });

  it('applies the debuff to the chosen ally on execute', () => {
    panel.selected = { source: 'A', half: 'top' };
    panel.selectTarget('ally');
    panel.execute();

    expect(patchCalls.find(p => p.creatureId === 'ally')?.patch.conditions)
      .toEqual([CreatureConditions.wound]);
    expect(creatures.find(c => c.id === 'mob')!.conditions).toEqual([]);
  });

  it('stays on enemies when a targetAlly condition is mixed with an attack', () => {
    panel.selected = { source: 'B', half: 'top' };

    expect(panel.targetsAreHeroes).toBe(false);
    expect(panel.targetOptions.map(c => c.id)).toContain('mob');
  });

  describe('targetAlly on an attack', () => {
    it('offers allies and summons, not enemies, for a targetAlly attack', () => {
      creatures[0].cardAId = 503;
      panel.selected = { source: 'A', half: 'top' };

      expect(panel.targetsAreHeroes).toBe(true);
      expect(panel.targetOptions.map(c => c.id)).toContain('ally');
      expect(panel.targetOptions.map(c => c.id)).not.toContain('mob');
    });

    it('lands the strike\'s damage on the chosen ally', () => {
      creatures[0].cardAId = 503;
      panel.selected = { source: 'A', half: 'top' };
      panel.selectTarget('ally');
      panel.setModifier(0);
      panel.execute();

      expect(creatures.find(c => c.id === 'ally')!.hp).toBe(8); // 10 - 2
      expect(creatures.find(c => c.id === 'mob')!.hp).toBe(20); // untouched
    });

    it('scopes targetAlly to the one strike that carries it, in a multi-attack half', () => {
      creatures[0].cardAId = 504;
      panel.selected = { source: 'A', half: 'top' };

      // First strike: targetAlly is set on this attack.
      expect(panel.targetsAreHeroes).toBe(true);
      panel.selectTarget('ally');
      panel.setModifier(0);
      panel.execute(); // spends strike 1, advances to strike 2

      expect(creatures.find(c => c.id === 'ally')!.hp).toBe(8); // 10 - 2

      // Second strike: no targetAlly here, so it's back to enemies.
      expect(panel.targetsAreHeroes).toBe(false);
      panel.selectTarget('mob');
      panel.setModifier(0);
      panel.execute();

      expect(creatures.find(c => c.id === 'mob')!.hp).toBe(17); // 20 - 3
    });
  });
});
