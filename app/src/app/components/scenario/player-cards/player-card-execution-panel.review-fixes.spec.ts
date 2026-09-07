import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext, CustomAttackResult } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import { Creature, CreatureConditions, Element, ElementState, ElementType } from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * Regressions found reviewing this branch. Each card is shaped like the real shipped
 * card that exposed the bug, so the fix stays pinned to the data that broke it:
 *
 * - "Finish attack" used to route a picked-but-never-struck target into finalizeHalf(),
 *   landing a free hit with no modifier drawn at all;
 * - effects nested under an element bonus leaked out of the half as if they were
 *   printed on it, so they applied without the element ever being paid;
 * - a bonus that raises a heal spent the element without raising anything;
 * - a buff-only half offered monsters in the target strip.
 */
describe('PlayerCardExecutionPanelComponent review regressions', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let creatures: Creature[];
  let elements: Element[];
  let patchCalls: { creatureId: string; patch: Partial<Creature> }[];

  /** snowflake #342 "Blinding Vortex" shape: the Disarm is locked behind a Light bonus. */
  const blindingVortex: CharacterAbilityCard = {
    cardId: 342, name: 'Blinding Vortex', level: 'X', initiative: 31,
    top: {
      actions: [{
        type: 'attack', value: 2, multiTarget: true,
        subActions: [{
          type: 'elementBonus', elements: ['light'], consumeMode: 'all',
          subActions: [
            { type: 'condition', value: 'disarm', small: true },
            { type: 'xp', value: 1 },
          ],
        }],
      }],
    },
    bottom: { actions: [] },
  };

  /** snowflake #348 "Zephyr Barrier" shape: Heal 1 + Ward, Air pays for heal +1. */
  const zephyrBarrier: CharacterAbilityCard = {
    cardId: 348, name: 'Zephyr Barrier', level: 4, initiative: 40,
    top: {
      actions: [{
        type: 'heal', value: 1,
        subActions: [
          { type: 'condition', value: 'ward', small: true },
          {
            type: 'elementBonus', elements: ['air'], consumeMode: 'all',
            subActions: [{ type: 'heal', value: 1, valueType: 'add', small: true }],
          },
        ],
      }],
    },
    bottom: { actions: [] },
  };

  /** A buff-only half, and a debuff-only one for the other side of the same rule. */
  const frigidGrowth: CharacterAbilityCard = {
    cardId: 360, name: 'Frigid Growth', level: 1, initiative: 20,
    top: { actions: [{ type: 'condition', value: 'strengthen' }] },
    bottom: { actions: [{ type: 'condition', value: 'muddle' }] },
  };

  const deck: CharacterDeck = {
    characterClass: 'snowflake', edition: 'fh',
    cards: [blindingVortex, zephyrBarrier, frigidGrowth],
  };

  beforeEach(() => {
    elements = (Object.values(ElementType) as ElementType[])
      .map(type => ({ type, state: ElementState.None }));
    patchCalls = [];
    creatures = [
      {
        id: 'hero', type: 'snowflake', aggressive: false, level: 5,
        initiative: 31, secondaryInitiative: 0, cardAId: 342, cardBId: null,
        hp: 10, maxHp: 10, totalXp: 0, sessionExperience: 0,
      },
      // Unarmoured on purpose: armour would absorb a small leaked strike and hide it.
      { id: 'mob', type: 'algox-guard', aggressive: true, hp: 20, maxHp: 20, conditions: [] },
      { id: 'ally', type: 'drifter', aggressive: false, hp: 5, maxHp: 10, conditions: [] },
    ];

    const appContextStub: Partial<AppContext> = {
      cardPanelCreatureId: 'hero',
      creatures$: new Subject<Creature[]>().asObservable(),
      customAttackResult$: new Subject<CustomAttackResult>().asObservable(),
      getCreatures: () => creatures,
      getElements: () => elements,
      getRoundNumber: () => 1,
      setElementState: (type, state) => {
        elements = elements.map(el => el.type === type ? { ...el, state } : el);
      },
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

    panel = TestBed.createComponent(PlayerCardExecutionPanelComponent).componentInstance;
  });

  /** The tile resolves through the hero's *bound* card, so bind it here too. */
  const selectHalf = (card: CharacterAbilityCard, half: 'top' | 'bottom') => {
    creatures[0].cardAId = card.cardId;
    panel.selectTile({ source: 'A', half, card, content: card[half], label: card.name });
  };

  const infuse = (element: ElementType) =>
    elements = elements.map(el => el.type === element ? { ...el, state: ElementState.Full } : el);

  const mob = () => creatures[1];
  const ally = () => creatures[2];

  describe('"Finish attack" cannot land a free strike', () => {
    beforeEach(() => {
      selectHalf(blindingVortex, 'top');
    });

    it('applies nothing to a target picked but never executed', () => {
      panel.selectTarget('mob');
      expect(panel.canExecute).toBe(false); // nothing drawn

      panel.finishAttack();

      expect(mob().hp).toBe(20);
      expect(patchCalls.some(p => p.creatureId === 'mob')).toBe(false);
    });

    it('drops the pending target rather than carrying it forward', () => {
      panel.selectTarget('mob');
      panel.finishAttack();
      expect(panel.targetId).toBeNull();
    });

    it('keeps the strikes that were properly executed', () => {
      panel.selectTarget('mob');
      panel.setModifier(0);
      panel.execute();        // a real strike: 2 damage
      panel.selectTarget('ally'); // picked, never struck
      panel.finishAttack();

      expect(mob().hp).toBe(20 - 2);
      expect(ally().hp).toBe(5);
    });

    it('lands nothing at all when the half is finished untouched', () => {
      panel.finishAttack();
      expect(patchCalls.some(p => p.creatureId === 'mob')).toBe(false);
      expect(mob().hp).toBe(20);
    });
  });

  describe('effects behind an element bonus are offers, not freebies', () => {
    beforeEach(() => {
      selectHalf(blindingVortex, 'top');
    });

    it('withholds a condition the bonus grants while it is untaken', () => {
      infuse(ElementType.Light);
      expect(panel.selectedBonuses.length).toBe(1);
      expect(panel.isBonusTaken(0)).toBe(false);
      expect(panel.selectedConditions).toEqual([]);
    });

    it('grants it once the bonus is taken', () => {
      infuse(ElementType.Light);
      panel.toggleBonus(0, panel.selectedBonuses[0]);

      expect(panel.isBonusTaken(0)).toBe(true);
      expect(panel.selectedConditions).toEqual([CreatureConditions.disarm]);
    });

    it('applies it to the struck target, and only then', () => {
      infuse(ElementType.Light);
      panel.toggleBonus(0, panel.selectedBonuses[0]);
      panel.selectTarget('mob');
      panel.setModifier(0);
      panel.execute();

      expect(mob().conditions).toEqual([CreatureConditions.disarm]);
    });

    it('leaves the target clean when the bonus was never taken', () => {
      panel.selectTarget('mob');
      panel.setModifier(0);
      panel.execute();

      expect(mob().hp).toBe(20 - 2);
      expect(mob().conditions).toEqual([]);
    });

    it('withdraws the condition again when the bonus is untaken', () => {
      infuse(ElementType.Light);
      const bonus = panel.selectedBonuses[0];
      panel.toggleBonus(0, bonus);
      panel.toggleBonus(0, bonus);

      expect(panel.selectedConditions).toEqual([]);
    });

    it('cannot be taken at all while its element is unavailable', () => {
      expect(panel.isBonusAvailable(panel.selectedBonuses[0])).toBe(false);
      panel.toggleBonus(0, panel.selectedBonuses[0]);

      expect(panel.isBonusTaken(0)).toBe(false);
      expect(panel.selectedConditions).toEqual([]);
    });
  });

  describe('an element bonus that raises a heal', () => {
    beforeEach(() => {
      selectHalf(zephyrBarrier, 'top');
      infuse(ElementType.Air);
    });

    it('heals the printed value while the bonus is untaken', () => {
      expect(panel.selectedHealValue).toBe(1);
    });

    it('raises the heal once the bonus is taken', () => {
      panel.toggleBonus(0, panel.selectedBonuses[0]);
      expect(panel.selectedHealValue).toBe(2);
    });

    it('applies the raised heal, not the printed one', () => {
      panel.toggleBonus(0, panel.selectedBonuses[0]);
      panel.selectTarget('ally');
      panel.execute();

      expect(ally().hp).toBe(5 + 2);
    });

    it('still applies the printed ward alongside it', () => {
      expect(panel.selectedConditions).toEqual([CreatureConditions.ward]);
    });
  });

  describe('who a half targets', () => {
    it('offers allies for a buff-only half', () => {
      selectHalf(frigidGrowth, 'top');

      expect(panel.selectedConditions).toEqual([CreatureConditions.strengthen]);
      expect(panel.targetsAreHeroes).toBe(true);
      expect(panel.targetOptions.map(c => c.id)).toContain('ally');
      expect(panel.targetOptions.map(c => c.id)).not.toContain('mob');
    });

    it('applies that buff to the chosen ally, not to a monster', () => {
      selectHalf(frigidGrowth, 'top');
      panel.selectTarget('ally');
      panel.execute();

      expect(ally().conditions).toEqual([CreatureConditions.strengthen]);
      expect(mob().conditions).toEqual([]);
    });

    it('still offers enemies for a debuff-only half', () => {
      selectHalf(frigidGrowth, 'bottom');

      expect(panel.selectedConditions).toEqual([CreatureConditions.muddle]);
      expect(panel.targetsAreHeroes).toBe(false);
      expect(panel.targetOptions.map(c => c.id)).toContain('mob');
    });

    it('offers allies for a heal, as it always did', () => {
      selectHalf(zephyrBarrier, 'top');
      expect(panel.targetsAreHeroes).toBe(true);
    });

    it('keeps enemies whenever there is an attack, bonus buff or not', () => {
      selectHalf(blindingVortex, 'top');
      expect(panel.targetsAreHeroes).toBe(false);
    });
  });
});
