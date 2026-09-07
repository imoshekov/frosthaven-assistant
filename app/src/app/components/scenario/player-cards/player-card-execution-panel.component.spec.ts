import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext, CustomAttackResult } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import {
  Creature,
  Element,
  ElementState,
  ElementType,
} from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * Covers the conditional element bonus rules, which cannot be exercised against the
 * live party: only drifter and snowflake have authored decks, and the Supabase party
 * rarely contains either.
 *
 * The rule under test: a bonus is only offered while its elements are active, is
 * never applied automatically, and consumes those elements if the player takes it.
 */
describe('PlayerCardExecutionPanelComponent element bonuses', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let elements: Element[];
  let creatures: Creature[];
  let setElementCalls: { type: ElementType; state: ElementState }[];
  let patchCalls: { creatureId: string; patch: Partial<Creature> }[];

  /** snowflake #331 "Enticing Breeze": Attack 1, +2 Attack and 1 XP if you spend ICE. */
  const encitingBreeze: CharacterAbilityCard = {
    cardId: 331, name: 'Enticing Breeze', level: 1, initiative: 76,
    top: {
      xp: 0,
      actions: [{
        type: 'attack', value: 1, subActions: [
          { type: 'range', value: 3, small: true },
          {
            type: 'elementBonus', elements: ['ice'], consumeMode: 'all',
            subActions: [
              { type: 'attack', value: 2, valueType: 'add', small: true },
              { type: 'xp', value: 1 },
            ],
          },
        ],
      }],
    },
    bottom: { actions: [] },
  };

  /** An either-or bonus: spend ICE *or* AIR, the player's choice. */
  const eitherOr: CharacterAbilityCard = {
    cardId: 357, name: 'Either Or', level: 1, initiative: 20,
    top: {
      actions: [{
        type: 'elementBonus', elements: ['ice', 'air'], consumeMode: 'any',
        subActions: [{ type: 'attack', value: 1, valueType: 'add' }],
      }],
    },
    bottom: { actions: [] },
  };

  const deck: CharacterDeck = {
    characterClass: 'snowflake', edition: 'fh',
    cards: [encitingBreeze, eitherOr],
  };

  const setElements = (active: ElementType[]) => {
    elements = (Object.values(ElementType) as ElementType[]).map(type => ({
      type,
      state: active.includes(type) ? ElementState.Full : ElementState.None,
    }));
  };

  beforeEach(() => {
    setElements([]);
    setElementCalls = [];
    patchCalls = [];
    creatures = [
      {
        id: 'hero', type: 'snowflake', aggressive: false, level: 1,
        initiative: 76, secondaryInitiative: 20, cardAId: 331, cardBId: 357,
        hp: 8, maxHp: 8, totalXp: 0, sessionExperience: 0,
      },
      { id: 'mob', type: 'algox-guard', aggressive: true, hp: 20, maxHp: 20, conditions: [] },
    ];

    const appContextStub: Partial<AppContext> = {
      cardPanelCreatureId: 'hero',
      creatures$: new Subject<Creature[]>().asObservable(),
      customAttackResult$: new Subject<CustomAttackResult>().asObservable(),
      getCreatures: () => creatures,
      getElements: () => elements,
      setElementState: (type: ElementType, state: ElementState) => {
        setElementCalls.push({ type, state });
      },
      applyCreaturePatches: (patches) => { patchCalls.push(...patches); },
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
    // Select card A's top half, which is the one carrying the bonus.
    panel.selected = { source: 'A', half: 'top' };
  });

  it('finds the bonus on the selected half', () => {
    expect(panel.selectedBonuses.length).toBe(1);
    expect(panel.selectedBonuses[0].elements).toEqual(['ice']);
  });

  it('does not offer the bonus while its element is inactive', () => {
    const bonus = panel.selectedBonuses[0];
    expect(panel.isBonusAvailable(bonus)).toBe(false);
  });

  it('offers the bonus once the element is active', () => {
    setElements([ElementType.Ice]);
    expect(panel.isBonusAvailable(panel.selectedBonuses[0])).toBe(true);
  });

  it('refuses to take an unavailable bonus', () => {
    panel.toggleBonus(0, panel.selectedBonuses[0]);
    expect(panel.isBonusTaken(0)).toBe(false);
  });

  it('never applies the bonus automatically', () => {
    setElements([ElementType.Ice]);
    // Available, but not taken: the attack is the printed value only.
    expect(panel.isBonusTaken(0)).toBe(false);
    expect(panel.selectedAttackValue).toBe(1);
    expect(panel.takenBonusXp).toBe(0);
    expect(panel.elementsToConsume).toEqual([]);
  });

  it('adds the bonus attack and xp once taken', () => {
    setElements([ElementType.Ice]);
    panel.toggleBonus(0, panel.selectedBonuses[0]);

    expect(panel.isBonusTaken(0)).toBe(true);
    expect(panel.selectedAttackValue).toBe(3);   // 1 printed + 2 bonus
    expect(panel.takenBonusXp).toBe(1);
    expect(panel.elementsToConsume).toEqual([ElementType.Ice]);
  });

  it('untoggles back to the printed values', () => {
    setElements([ElementType.Ice]);
    const bonus = panel.selectedBonuses[0];
    panel.toggleBonus(0, bonus);
    panel.toggleBonus(0, bonus);

    expect(panel.isBonusTaken(0)).toBe(false);
    expect(panel.selectedAttackValue).toBe(1);
    expect(panel.elementsToConsume).toEqual([]);
  });

  it('consumes the element on execution, and awards the xp', () => {
    setElements([ElementType.Ice]);
    panel.toggleBonus(0, panel.selectedBonuses[0]);
    panel.targetId = 'mob';
    panel.modifier = 0;

    panel.execute();

    expect(setElementCalls).toContain({ type: ElementType.Ice, state: ElementState.None });

    const heroPatch = patchCalls.find(p => p.creatureId === 'hero')?.patch;
    expect(heroPatch).toBeTruthy();
    expect(heroPatch!.sessionExperience).toBe(1);
    expect(heroPatch!.totalXp).toBe(1);
  });

  it('does not consume anything when the bonus is declined', () => {
    setElements([ElementType.Ice]);
    panel.targetId = 'mob';
    panel.setModifier(0);

    panel.execute();

    expect(setElementCalls.length).toBe(0);
    const heroPatch = patchCalls.find(p => p.creatureId === 'hero')?.patch;
    expect(heroPatch!.sessionExperience).toBeUndefined();
  });

  describe('either-or bonuses', () => {
    beforeEach(() => {
      panel.selected = { source: 'B', half: 'top' };
    });

    it('is available when only one of the two elements is active', () => {
      setElements([ElementType.Air]);
      expect(panel.isBonusAvailable(panel.selectedBonuses[0])).toBe(true);
    });

    it('defaults to spending the available element', () => {
      setElements([ElementType.Air]);
      const bonus = panel.selectedBonuses[0];
      panel.toggleBonus(0, bonus);

      expect(panel.chosenElement(0, bonus)).toBe(ElementType.Air);
      expect(panel.elementsToConsume).toEqual([ElementType.Air]);
    });

    it('spends only the element the player picked', () => {
      setElements([ElementType.Ice, ElementType.Air]);
      const bonus = panel.selectedBonuses[0];
      panel.toggleBonus(0, bonus);
      panel.chooseBonusElement(0, ElementType.Ice);

      expect(panel.elementsToConsume).toEqual([ElementType.Ice]);
    });

    it('will not pick an element that is not active', () => {
      setElements([ElementType.Air]);
      const bonus = panel.selectedBonuses[0];
      panel.toggleBonus(0, bonus);
      panel.chooseBonusElement(0, ElementType.Ice);

      expect(panel.chosenElement(0, bonus)).toBe(ElementType.Air);
    });
  });

  it('clears taken bonuses when a different half is selected', () => {
    setElements([ElementType.Ice]);
    panel.toggleBonus(0, panel.selectedBonuses[0]);
    expect(panel.isBonusTaken(0)).toBe(true);

    panel.selectTile({
      source: 'B', half: 'top', card: eitherOr, content: eitherOr.top, label: 'Either Or',
    });

    expect(panel.isBonusTaken(0)).toBe(false);
  });

  /**
   * "Custom…" opens the attack modal; confirming there used to apply the attack
   * immediately, bypassing the panel's own single-patch execute() entirely — the half
   * never got marked spent, no XP was folded in, and it was a separate undo batch.
   * customOverride is how the modal now hands adjusted values back instead, so
   * Execute stays the only thing that actually applies anything.
   */
  describe('custom override from the attack modal', () => {
    beforeEach(() => {
      setElements([]);
      panel.targetId = 'mob';
    });

    it('uses the card-derived attack when no override is set', () => {
      expect(panel.customOverride).toBeNull();
      expect(panel.effectiveBaseAttack).toBe(1); // Enticing Breeze's printed attack
    });

    it('uses the custom attack and pierce once one is set', () => {
      panel.customOverride = { attack: 9, armorPen: 2, conditions: [], ignoreArmor: false };
      expect(panel.effectiveBaseAttack).toBe(9);
      expect(panel.effectiveArmorPenForDamage).toBe(2);
    });

    it('ignores the drawn attack-modifier once a custom override is set', () => {
      panel.modifier = 2;
      panel.customOverride = { attack: 9, armorPen: 0, conditions: [], ignoreArmor: false };
      expect(panel.effectiveModifierForDamage).toBeNull();
      expect(panel.damagePreview?.damage).toBe(9); // not 11 — the +2 modifier is ignored
    });

    it('lets an unauthored half with no manual value execute once Custom supplies one', () => {
      panel.selected = { source: 'A', half: 'bottom' }; // Enticing Breeze has no bottom data
      expect(panel.canExecute).toBe(false);

      panel.customOverride = { attack: 5, armorPen: 0, conditions: [], ignoreArmor: false };
      expect(panel.canExecute).toBe(true);
    });

    it('merges the custom conditions with whatever the card already inflicts', () => {
      panel.customOverride = { attack: 9, armorPen: 0, conditions: [] as any, ignoreArmor: false };
      expect(panel.effectiveConditionsForExecution).toEqual([]);
    });

    it('execute() applies the custom values and clears the override afterward', () => {
      panel.customOverride = { attack: 9, armorPen: 3, conditions: [], ignoreArmor: false };
      panel.execute();

      const mobPatch = patchCalls.find(p => p.creatureId === 'mob')?.patch;
      expect(mobPatch?.hp).toBe(20 - 9); // no armor on 'mob', pierce irrelevant here

      const heroPatch = patchCalls.find(p => p.creatureId === 'hero')?.patch;
      expect(heroPatch?.topHalfState).toBe('executed');
      expect(panel.customOverride).toBeNull();
    });

    it('re-selecting a half clears any pending custom override', () => {
      panel.customOverride = { attack: 9, armorPen: 0, conditions: [], ignoreArmor: false };
      panel.selectTile({
        source: 'A', half: 'top', card: encitingBreeze, content: encitingBreeze.top, label: 'Enticing Breeze',
      });
      expect(panel.customOverride).toBeNull();
    });
  });
});
