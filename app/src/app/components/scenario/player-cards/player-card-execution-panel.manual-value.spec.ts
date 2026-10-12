import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext, CustomAttackResult } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import { Creature, Element, ElementState, ElementType } from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * `"value": "X"` — a value the card leaves to the player, typed into the panel when
 * the half is resolved rather than fixed in the data. The spelling the extractor
 * already emitted for drifter's "where X is the number of hexes you moved" cards.
 *
 * The rule that shapes most of this: an entered 0 is a *real* attack, not an absent
 * one. It still takes a target, draws a modifier, provokes retaliate and lands its
 * conditions — it simply deals no damage.
 */
describe('PlayerCardExecutionPanelComponent "Attack X"', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let fixture: ComponentFixture<PlayerCardExecutionPanelComponent>;
  let creatures: Creature[];
  let elements: Element[];
  let patchCalls: { creatureId: string; patch: Partial<Creature> }[];

  /** shackles #318 "Mirrored Misery" shape: Attack X, ignoring shields. */
  const mirroredMisery: CharacterAbilityCard = {
    cardId: 318, name: 'Mirrored Misery', level: 4, initiative: 72,
    top: { actions: [{ type: 'attack', value: 'X', ignoreArmor: true }] },
    bottom: { actions: [{ type: 'attack', value: 3 }] },
  };

  /** An "Attack X" that draws a modifier like any other attack, plus a condition. */
  const openStrike: CharacterAbilityCard = {
    cardId: 319, name: 'Open Strike', level: 1, initiative: 20,
    top: {
      actions: [{
        type: 'attack', value: 'X',
        subActions: [{ type: 'condition', value: 'wound', small: true }],
      }],
    },
    bottom: { actions: [] },
  };

  /** A variable strike beside a fixed one: the two boxes must not share a value. */
  const mixedStrikes: CharacterAbilityCard = {
    cardId: 320, name: 'Mixed Strikes', level: 1, initiative: 21,
    top: {
      actions: [
        { type: 'attack', value: 'X' },
        { type: 'attack', value: 2 },
      ],
    },
    bottom: { actions: [] },
  };

  /** drifter "Survivalist" shape: Heal X, with the prose saying what X is. */
  const survivalist: CharacterAbilityCard = {
    cardId: 321, name: 'Survivalist', level: 1, initiative: 22,
    top: {
      actions: [{
        type: 'heal', value: 'X',
        subActions: [{ type: 'text', text: 'where X is twice the number of tokens looted.', small: true }],
      }],
    },
    bottom: { actions: [] },
  };

  const deck: CharacterDeck = {
    characterClass: 'shackles', edition: 'fh',
    cards: [mirroredMisery, openStrike, mixedStrikes, survivalist],
  };

  const mob = () => creatures.find(c => c.id === 'mob')!;
  const ally = () => creatures.find(c => c.id === 'ally')!;

  beforeEach(() => {
    patchCalls = [];
    elements = (Object.values(ElementType) as ElementType[])
      .map(type => ({ type, state: ElementState.None }));
    creatures = [
      {
        id: 'hero', type: 'shackles', aggressive: false, level: 4,
        initiative: 72, secondaryInitiative: 0, cardAId: 318, cardBId: null,
        hp: 10, maxHp: 10, totalXp: 0, sessionExperience: 0,
      },
      {
        id: 'mob', type: 'algox-guard', aggressive: true,
        hp: 20, maxHp: 20, conditions: [], armor: 3, retaliate: 2,
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
      buildAddConditionsPatch: (creature, conditions) => {
        const current = creature.conditions ?? [];
        const added = conditions.filter(c => !current.includes(c));
        return added.length ? { conditions: [...current, ...added] } : {};
      },
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

    fixture = TestBed.createComponent(PlayerCardExecutionPanelComponent);
    panel = fixture.componentInstance;
    panel.selected = { source: 'A', half: 'top' };
  });

  const selectCard = (card: CharacterAbilityCard, half: 'top' | 'bottom' = 'top') => {
    creatures[0].cardAId = card.cardId;
    panel.selected = { source: 'A', half };
  };

  describe('recognising it', () => {
    it('spots the "X" on the attack being resolved', () => {
      expect(panel.isCurrentAttackManual).toBe(true);
      expect(panel.isManualAttack(0)).toBe(true);
    });

    it('leaves an ordinary printed attack alone', () => {
      selectCard(mirroredMisery, 'bottom');
      expect(panel.isCurrentAttackManual).toBe(false);
      expect(panel.selectedAttackValue).toBe(3);
    });

    it('starts at 0 until the player types something', () => {
      expect(panel.manualAttackValueFor(0)).toBe(0);
      expect(panel.selectedAttackValue).toBe(0);
    });

    it('takes the typed value as the attack value', () => {
      panel.setManualAttackValue(0, 4);
      expect(panel.selectedAttackValue).toBe(4);
      expect(panel.attackDisplayValue(0)).toBe(4);
    });

    it('coerces the string an input hands back, and refuses a negative', () => {
      panel.setManualAttackValue(0, '5');
      expect(panel.selectedAttackValue).toBe(5);

      panel.setManualAttackValue(0, -3);
      expect(panel.selectedAttackValue).toBe(0);
    });
  });

  describe('an entered 0 is still a real attack', () => {
    it('needs a target even at 0', () => {
      expect(panel.selectedAttackValue).toBe(0);
      expect(panel.needsTarget).toBe(true);
      expect(panel.isResolvingAttack).toBe(true);
    });

    it('offers enemies rather than falling through to the buff rules', () => {
      selectCard(openStrike);
      expect(panel.targetsAreHeroes).toBe(false);
      expect(panel.targetOptions.map(c => c.id)).toContain('mob');
    });

    it('still draws a modifier when the card does not ignore armor', () => {
      selectCard(openStrike);
      expect(panel.needsModifier).toBe(true);
    });

    it('still provokes the target retaliate', () => {
      selectCard(openStrike);
      panel.selectTarget('mob');
      expect(panel.retaliateTotal).toBe(2);

      panel.setModifier(0);
      panel.execute();

      // Retaliate answers the attack, not the damage — so it lands off an Attack 0.
      expect(creatures[0].hp).toBe(8);
    });

    it('still lands the conditions riding on it', () => {
      selectCard(openStrike);
      panel.selectTarget('mob');
      panel.setModifier(0);
      panel.execute();

      expect(mob().conditions).toEqual(['wound'] as any);
      expect(mob().hp).toBe(20); // no damage, but the wound stuck
    });
  });

  describe('resolving a typed value', () => {
    it('deals the typed damage, shield ignored by the card flag', () => {
      panel.setManualAttackValue(0, 6);
      panel.selectTarget('mob');
      panel.execute();

      // ignoreArmor: no modifier drawn, armor 3 skipped entirely.
      expect(panel.needsModifier).toBe(false);
      expect(mob().hp).toBe(20 - 6);
    });

    it('runs the typed value through the modifier and the shield when it does not', () => {
      selectCard(openStrike);
      panel.setManualAttackValue(0, 5);
      panel.selectTarget('mob');
      panel.setModifier('x2');
      panel.execute();

      expect(mob().hp).toBe(20 - (5 * 2 - 3));
    });

    it('takes the +/- row on top of what was typed', () => {
      panel.setManualAttackValue(0, 4);
      panel.adjustAttack(0, 2);
      expect(panel.selectedAttackValue).toBe(6);
    });

    it('clamps the +/- row against the typed value, not the printed 0', () => {
      panel.setManualAttackValue(0, 3);
      panel.adjustAttack(0, -10);
      expect(panel.selectedAttackValue).toBe(0);
    });
  });

  describe('beside other attacks', () => {
    it('keeps a variable strike and a fixed one apart', () => {
      selectCard(mixedStrikes);
      panel.setManualAttackValue(0, 5);

      expect(panel.isManualAttack(0)).toBe(true);
      expect(panel.isManualAttack(1)).toBe(false);
      expect(panel.attackDisplayValue(0)).toBe(5);
      expect(panel.attackDisplayValue(1)).toBe(2);
    });

    it('resolves each with its own value, in order', () => {
      selectCard(mixedStrikes);
      panel.setManualAttackValue(0, 5);

      panel.selectTarget('mob');
      panel.setModifier(0);
      panel.execute();                       // strike 1: 5 − 3 armor = 2
      expect(mob().hp).toBe(20 - 2);

      expect(panel.isCurrentAttackManual).toBe(false);
      panel.setModifier(0);
      panel.execute();                       // strike 2: 2 − 3 armor = blocked
      expect(mob().hp).toBe(20 - 2);
    });

    it('drops the typed values when the half is re-selected', () => {
      selectCard(mixedStrikes);
      panel.setManualAttackValue(0, 5);

      // Re-selecting goes through selectTile, which owns the resolution-state reset.
      panel.selectTile({
        source: 'A', half: 'top', card: mixedStrikes,
        content: mixedStrikes.top, label: 'Mixed Strikes',
      });

      expect(panel.manualAttackValueFor(0)).toBe(0);
    });
  });

  describe('"Heal X"', () => {
    beforeEach(() => selectCard(survivalist));

    it('is recognised and starts empty', () => {
      expect(panel.isCurrentHealManual).toBe(true);
      expect(panel.hasManualTargetHeal).toBe(true);
      expect(panel.selectedHealValue).toBe(0);
    });

    it('offers allies before a value is typed', () => {
      expect(panel.needsTarget).toBe(true);
      expect(panel.targetsAreHeroes).toBe(true);
      expect(panel.targetOptions.map(c => c.id)).toContain('ally');
    });

    it('heals the typed amount, capped at max hp', () => {
      panel.setManualHealValue(3);
      expect(panel.selectedHealValue).toBe(3);

      panel.selectTarget('ally');
      panel.execute();

      expect(ally().hp).toBe(7); // 4 + 3
    });

    it('takes the +/- row on top of what was typed', () => {
      panel.setManualHealValue(2);
      panel.adjustHeal(1);
      expect(panel.selectedHealValue).toBe(3);
    });
  });
});
