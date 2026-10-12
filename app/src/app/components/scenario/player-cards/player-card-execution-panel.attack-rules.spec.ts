import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext, CustomAttackResult } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import { Creature, Element, ElementType } from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * The per-attack rules the panel enforces:
 *
 * - an attack resolves off a drawn modifier, so Execute is closed until one is drawn,
 *   and ±0 counts as a draw the player makes deliberately;
 * - a half that only heals or applies conditions draws nothing, so the row is hidden
 *   and Execute stays open;
 * - each attack carries its own +/- adjustment, which survives the individual strikes
 *   of a multi-target attack and dies with the half;
 * - a spent attack greys out and can no longer be aimed at anything.
 */
describe('PlayerCardExecutionPanelComponent attack rules', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let creatures: Creature[];
  let elements: Element[];
  let patchCalls: { creatureId: string; patch: Partial<Creature> }[];

  const oneAttack: CharacterAbilityCard = {
    cardId: 700, name: 'One Attack', level: 1, initiative: 30,
    top: { actions: [{ type: 'attack', value: 3 }] },
    // Conditions only — nothing is drawn for these.
    bottom: { actions: [{ type: 'condition', value: 'muddle' }] },
  };

  const twoAttacks: CharacterAbilityCard = {
    cardId: 701, name: 'Two Attacks', level: 1, initiative: 31,
    top: {
      actions: [
        { type: 'attack', value: 2 },
        { type: 'attack', value: 4 },
      ],
    },
    bottom: { actions: [] },
  };

  const sweep: CharacterAbilityCard = {
    cardId: 702, name: 'Sweep', level: 1, initiative: 32,
    top: { actions: [{ type: 'attack', value: 3, multiTarget: true }] },
    bottom: { actions: [] },
  };

  const healOnly: CharacterAbilityCard = {
    cardId: 703, name: 'Heal Only', level: 1, initiative: 33,
    top: { actions: [{ type: 'heal', value: 2 }] },
    bottom: { actions: [] },
  };

  const deck: CharacterDeck = {
    characterClass: 'drifter', edition: 'fh',
    cards: [oneAttack, twoAttacks, sweep, healOnly],
  };

  beforeEach(() => {
    elements = (Object.values(ElementType) as ElementType[]).map(type => ({ type, state: 0 as any }));
    patchCalls = [];
    creatures = [
      {
        id: 'hero', type: 'drifter', aggressive: false, level: 1,
        initiative: 30, secondaryInitiative: 0, cardAId: 700, cardBId: null,
        hp: 10, maxHp: 10, totalXp: 0, sessionExperience: 0,
      },
      { id: 'mob', type: 'algox-guard', aggressive: true, hp: 30, maxHp: 30, conditions: [] },
      { id: 'mob2', type: 'algox-guard', aggressive: true, hp: 30, maxHp: 30, conditions: [] },
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

  const selectTop = (card: CharacterAbilityCard) =>
    panel.selectTile({ source: 'A', half: 'top', card, content: card.top, label: card.name });

  describe('a drawn modifier is required', () => {
    beforeEach(() => {
      selectTop(oneAttack);
      panel.selectTarget('mob');
    });

    it('starts with nothing drawn', () => {
      expect(panel.modifier).toBeNull();
      expect(panel.needsModifier).toBe(true);
      expect(panel.awaitingModifier).toBe(true);
    });

    it('blocks Execute until one is drawn', () => {
      expect(panel.canExecute).toBe(false);
      panel.setModifier(-1);
      expect(panel.canExecute).toBe(true);
    });

    it('applies nothing at all if Execute is pressed while undrawn', () => {
      panel.execute();
      expect(patchCalls.length).toBe(0);
      expect(creatures[1].hp).toBe(30);
    });

    it('treats an explicitly drawn ±0 as a real draw, not as "undrawn"', () => {
      panel.setModifier(0);
      expect(panel.awaitingModifier).toBe(false);
      expect(panel.canExecute).toBe(true);
    });

    it('clears the draw after the attack resolves', () => {
      panel.setModifier(0);
      panel.execute();
      expect(panel.modifier).toBeNull();
    });
  });

  describe('a half with no attack', () => {
    beforeEach(() => {
      panel.selectTile({ source: 'A', half: 'bottom', card: oneAttack, content: oneAttack.bottom, label: oneAttack.name });
      panel.selectTarget('mob');
    });

    it('needs no modifier, so the row stays hidden', () => {
      expect(panel.selectedAttackValue).toBe(0);
      expect(panel.needsModifier).toBe(false);
      expect(panel.awaitingModifier).toBe(false);
    });

    it('can be executed straight away', () => {
      expect(panel.canExecute).toBe(true);
    });

    it('is the same for a heal-only half', () => {
      // The tile resolves through the hero's *bound* card, not the object passed in.
      creatures[0].cardAId = 703;
      selectTop(healOnly);
      panel.selectTarget('hero');

      expect(panel.selectedHealValue).toBe(2);
      expect(panel.needsModifier).toBe(false);
      expect(panel.canExecute).toBe(true);
    });
  });

  describe('Custom… bypasses the draw', () => {
    it('needs no modifier once custom values are in, since they are final', () => {
      selectTop(oneAttack);
      panel.selectTarget('mob');
      panel.customOverride = { attack: 7, armorPen: 0, conditions: [], ignoreArmor: false };

      expect(panel.needsModifier).toBe(false);
      expect(panel.canExecute).toBe(true);
    });
  });

  describe('per-attack +/- adjustment', () => {
    beforeEach(() => {
      creatures[0].cardAId = 701;
      selectTop(twoAttacks);
      panel.targetId = 'mob';
    });

    it('starts at the printed value', () => {
      expect(panel.attackDisplayValue(0)).toBe(2);
      expect(panel.attackDisplayValue(1)).toBe(4);
      expect(panel.adjustmentFor(0)).toBe(0);
    });

    it('raises and lowers one attack without touching the other', () => {
      panel.adjustAttack(0, 1);
      panel.adjustAttack(0, 1);
      panel.adjustAttack(1, -1);

      expect(panel.attackDisplayValue(0)).toBe(4);
      expect(panel.attackDisplayValue(1)).toBe(3);
      expect(panel.adjustmentFor(0)).toBe(2);
    });

    it('feeds the adjusted value into the damage actually applied', () => {
      panel.adjustAttack(0, 2);
      expect(panel.selectedAttackValue).toBe(4);

      panel.setModifier(0);
      panel.execute();
      expect(creatures[1].hp).toBe(30 - 4);
    });

    it('never takes an attack below zero', () => {
      panel.adjustAttack(0, -5);
      expect(panel.attackDisplayValue(0)).toBe(0);
      expect(panel.selectedAttackValue).toBe(0);
    });

    it('refuses to adjust an attack that is already spent', () => {
      panel.setModifier(0);
      panel.execute();          // spends attack 1, advances to attack 2

      panel.adjustAttack(0, 3);
      expect(panel.adjustmentFor(0)).toBe(0);
    });

    it('drops every adjustment when the half is re-selected', () => {
      panel.adjustAttack(0, 3);
      selectTop(twoAttacks);
      expect(panel.adjustmentFor(0)).toBe(0);
    });

    it('keeps a multi-target attack adjustment across its separate strikes', () => {
      creatures[0].cardAId = 702;
      selectTop(sweep);
      panel.adjustAttack(0, 1); // Attack 3 -> 4, for every target it hits

      panel.selectTarget('mob');
      panel.setModifier(0);
      panel.execute();
      expect(creatures[1].hp).toBe(30 - 4);

      // Same attack, next target: the adjustment is still in force.
      expect(panel.adjustmentFor(0)).toBe(1);
      panel.selectTarget('mob2');
      panel.setModifier(0);
      panel.execute();
      expect(creatures[2].hp).toBe(30 - 4);
    });
  });

  describe('spent attacks', () => {
    beforeEach(() => {
      creatures[0].cardAId = 701;
      selectTop(twoAttacks);
      panel.targetId = 'mob';
    });

    it('marks nothing done before the first execute', () => {
      expect(panel.isAttackDone(0)).toBe(false);
      expect(panel.isAttackCurrent(0)).toBe(true);
      expect(panel.isAttackDone(1)).toBe(false);
    });

    it('greys out the executed attack and moves on to the next', () => {
      panel.setModifier(0);
      panel.execute();

      expect(panel.isAttackDone(0)).toBe(true);
      expect(panel.isAttackCurrent(0)).toBe(false);
      expect(panel.isAttackCurrent(1)).toBe(true);
    });

    it('resolves only the current attack, so a spent one cannot hit anything else', () => {
      panel.setModifier(0);
      panel.execute();                      // attack 1 (value 2) spent

      // The second attack (value 4) is what Execute now applies — not the spent one.
      expect(panel.selectedAttackValue).toBe(4);
      panel.setModifier(0);
      panel.execute();
      expect(creatures[1].hp).toBe(30 - 2 - 4);
    });

    it('flags which attacks hit several targets', () => {
      expect(panel.isAttackMultiTarget(0)).toBe(false);

      creatures[0].cardAId = 702;
      selectTop(sweep);
      expect(panel.isAttackMultiTarget(0)).toBe(true);
    });
  });
});
