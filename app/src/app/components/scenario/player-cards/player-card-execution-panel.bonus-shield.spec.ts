import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext, CustomAttackResult, HalfExecution } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import { Creature, Element, ElementState, ElementType } from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * A bonus subAction's `valueType` carries its sign, not just its display: `'minus'`/
 * `'subtract'` means the bonus *removes* that much, the same way `+N`/`−N` already
 * print. Covers two things at once:
 *
 * - the sign actually applying to `attack`/`heal` bonuses (previously cosmetic only —
 *   `sumTakenBonus` always added, whatever `valueType` said);
 * - `shield` bonuses working at all — there was no `takenBonusShield`/`totalShield`
 *   pairing before, so a bonus that added *or* removed shield did nothing.
 */
describe('PlayerCardExecutionPanelComponent bonus sign and shield', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let fixture: ComponentFixture<PlayerCardExecutionPanelComponent>;
  let creatures: Creature[];
  let elements: Element[];
  let patchCalls: { creatureId: string; patch: Partial<Creature> }[];
  let recorded: HalfExecution[];

  /** "Attack 3. Suffer 1: +2 Attack." with a second bonus that instead subtracts 1. */
  const temperedStrike: CharacterAbilityCard = {
    cardId: 910, name: 'Tempered Strike', level: 1, initiative: 30,
    top: {
      actions: [{
        type: 'attack', value: 3,
        subActions: [
          {
            type: 'sufferDamageBonus', value: 1,
            subActions: [{ type: 'attack', value: 2, valueType: 'add', small: true }],
          },
        ],
      }],
    },
    bottom: { actions: [] },
  };

  /** "if you use it, remove 1 shield" — no printed shield of its own. */
  const recklessGambit: CharacterAbilityCard = {
    cardId: 911, name: 'Reckless Gambit', level: 1, initiative: 31,
    top: {
      actions: [{
        type: 'textBonus', text: 'if you use it',
        subActions: [{ type: 'shield', value: 1, valueType: 'subtract' }],
      }],
    },
    bottom: { actions: [] },
  };

  /** Shield 2 printed, plus a bonus that adds 1 more. */
  const bracedStance: CharacterAbilityCard = {
    cardId: 912, name: 'Braced Stance', level: 1, initiative: 32,
    top: {
      actions: [
        {
          type: 'shield', value: 2,
          subActions: [{
            type: 'sufferDamageBonus', value: 1,
            subActions: [{ type: 'shield', value: 1, valueType: 'add', small: true }],
          }],
        },
      ],
    },
    bottom: { actions: [] },
  };

  /** shackles #317 "Reprisal": Retaliate 3, consume AIR for +1. */
  const reprisal: CharacterAbilityCard = {
    cardId: 913, name: 'Reprisal', level: 3, initiative: 70,
    top: {
      actions: [{
        type: 'retaliate', value: 3,
        subActions: [{
          type: 'elementBonus', elements: ['air'], consumeMode: 'all',
          subActions: [{ type: 'retaliate', value: 1, valueType: 'add', small: true }],
        }],
      }],
    },
    bottom: { actions: [] },
  };

  const deck: CharacterDeck = {
    characterClass: 'shackles', edition: 'fh',
    cards: [temperedStrike, recklessGambit, bracedStance, reprisal],
  };

  const heroPatch = () => patchCalls.find(p => p.creatureId === 'hero')?.patch;

  beforeEach(() => {
    patchCalls = [];
    recorded = [];
    elements = (Object.values(ElementType) as ElementType[])
      .map(type => ({ type, state: ElementState.None }));
    creatures = [
      {
        id: 'hero', type: 'shackles', aggressive: false, level: 1,
        initiative: 30, secondaryInitiative: 0, cardAId: 910, cardBId: null,
        hp: 10, maxHp: 10, totalXp: 0, sessionExperience: 0, roundArmor: 0,
      },
      { id: 'mob', type: 'algox-guard', aggressive: true, hp: 20, maxHp: 20, conditions: [] },
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
      buildAddConditionsPatch: () => ({}),
      autoBindHeroCards: () => Promise.resolve(),
      recordDamage: () => { },
      recordKill: () => { },
      killCreature: () => { },
      recordHalfExecution: (_id, _half, effect) => { recorded.push(effect); },
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

  describe('valueType actually signs a bonus, not just displays it', () => {
    beforeEach(() => {
      panel.selected = { source: 'A', half: 'top' };
    });

    it('adds for valueType "add", same as always', () => {
      panel.toggleBonus(0, panel.selectedBonuses[0]);
      expect(panel.takenBonusAttack).toBe(2);
      expect(panel.selectedAttackValue).toBe(5); // 3 + 2
    });
  });

  describe('a shield-only bonus ("remove 1 shield", no printed shield)', () => {
    beforeEach(() => {
      panel.selected = { source: 'A', half: 'top' };
      creatures[0].cardAId = 911;
      panel.selectTile({ source: 'A', half: 'top', card: recklessGambit, content: recklessGambit.top, label: 'Reckless Gambit' });
    });

    it('grants nothing until taken', () => {
      expect(panel.selectedShield).toBe(0);
      expect(panel.totalShield).toBe(0);
    });

    it('goes negative once taken', () => {
      panel.toggleBonus(0, panel.selectedBonuses[0]);
      expect(panel.takenBonusShield).toBe(-1);
      expect(panel.totalShield).toBe(-1);
    });

    it('floors the hero\'s round shield at 0 rather than going negative', () => {
      creatures[0].roundArmor = 0;
      panel.toggleBonus(0, panel.selectedBonuses[0]);
      panel.execute();

      expect(heroPatch()?.roundArmor).toBe(0);
    });

    it('removes existing round shield down to what is left', () => {
      creatures[0].roundArmor = 3;
      panel.toggleBonus(0, panel.selectedBonuses[0]);
      panel.execute();

      expect(heroPatch()?.roundArmor).toBe(2);
    });

    it('applies nothing at all when declined', () => {
      panel.execute();
      expect(heroPatch()?.roundArmor).toBeUndefined();
    });

    it('records the negative delta for undo', () => {
      creatures[0].roundArmor = 3;
      panel.toggleBonus(0, panel.selectedBonuses[0]);
      panel.execute();

      expect(recorded.at(-1)?.shieldGained).toBe(-1);
    });
  });

  describe('a shield bonus that adds, alongside a printed shield', () => {
    beforeEach(() => {
      creatures[0].cardAId = 912;
      panel.selectTile({ source: 'A', half: 'top', card: bracedStance, content: bracedStance.top, label: 'Braced Stance' });
    });

    it('is the printed value alone until taken', () => {
      expect(panel.selectedShield).toBe(2);
      expect(panel.totalShield).toBe(2);
    });

    it('adds on top once taken', () => {
      panel.toggleBonus(0, panel.selectedBonuses[0]);
      expect(panel.totalShield).toBe(3);
    });

    it('applies the combined total to roundArmor on execute', () => {
      panel.toggleBonus(0, panel.selectedBonuses[0]);
      panel.execute();

      expect(heroPatch()?.roundArmor).toBe(3);
    });
  });

  /**
   * The same pairing for `retaliate`, which had no bonus path at all until shackles
   * #317 "Reprisal" was authored against one: Retaliate 3, consume AIR for +1. The
   * element was being spent and the +1 silently dropped.
   */
  describe('a retaliate bonus (shackles #317 "Reprisal" shape)', () => {
    beforeEach(() => {
      // The bonus consumes AIR, so it is only offered while AIR is active.
      elements = elements.map(e => e.type === ElementType.Air ? { ...e, state: ElementState.Full } : e);
      creatures[0].cardAId = 913;
      panel.selectTile({ source: 'A', half: 'top', card: reprisal, content: reprisal.top, label: 'Reprisal' });
    });

    it('is the printed value alone until the bonus is taken', () => {
      expect(panel.selectedRetaliate).toBe(3);
      expect(panel.totalRetaliate).toBe(3);
    });

    it('adds the bonus retaliate once taken', () => {
      panel.toggleBonus(0, panel.selectedBonuses[0]);
      expect(panel.takenBonusRetaliate).toBe(1);
      expect(panel.totalRetaliate).toBe(4);
    });

    it('applies the combined total to roundRetaliate on execute', () => {
      panel.toggleBonus(0, panel.selectedBonuses[0]);
      panel.execute();

      expect(heroPatch()?.roundRetaliate).toBe(4);
    });

    it('applies only the printed value when the bonus is declined', () => {
      panel.execute();
      expect(heroPatch()?.roundRetaliate).toBe(3);
    });

    it('records the total for undo, not just the printed value', () => {
      panel.toggleBonus(0, panel.selectedBonuses[0]);
      panel.execute();

      expect(recorded.at(-1)?.retaliateGained).toBe(4);
    });
  });
});
