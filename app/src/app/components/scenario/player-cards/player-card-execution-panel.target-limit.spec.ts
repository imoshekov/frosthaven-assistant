import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext, CustomAttackResult } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import { Creature, Element, ElementType } from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * `multiTarget: N` — the printed cap, "Attack 3, target 2". Distinct from
 * `multiTarget: true`, which is open-ended ("each adjacent enemy", however many the
 * DM judges are in range), and from two separate `attack` actions, which are two
 * independent strikes free to land on the same enemy twice.
 *
 * Three enemies are on the board throughout, so a strip that empties proves the cap
 * bit rather than the board simply running out of figures.
 */
describe('PlayerCardExecutionPanelComponent capped multiTarget', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let creatures: Creature[];
  let elements: Element[];
  let batches: { creatureId: string; patch: Partial<Creature> }[][];

  /** "Attack 3, target 2" — one attack action, at most two different enemies. */
  const doubleStrike: CharacterAbilityCard = {
    cardId: 910, name: 'Double Strike', level: 1, initiative: 40,
    top: { actions: [{ type: 'attack', value: 3, multiTarget: 2 }] },
    // "Muddle up to 2 enemies" — a capped multi-select, with no modifier to draw.
    bottom: { actions: [{ type: 'condition', value: 'muddle', multiTarget: 2 }] },
  };

  /** The open-ended form, for the contrast. */
  const sweepingBlow: CharacterAbilityCard = {
    cardId: 911, name: 'Sweeping Blow', level: 1, initiative: 41,
    top: { actions: [{ type: 'attack', value: 3, multiTarget: true }] },
    bottom: { actions: [] },
  };

  const deck: CharacterDeck = {
    characterClass: 'drifter', edition: 'fh',
    cards: [doubleStrike, sweepingBlow],
  };

  beforeEach(() => {
    elements = (Object.values(ElementType) as ElementType[]).map(type => ({ type, state: 0 as any }));
    batches = [];
    creatures = [
      {
        id: 'hero', type: 'drifter', aggressive: false, level: 1,
        initiative: 40, secondaryInitiative: 0, cardAId: 910, cardBId: null,
        hp: 10, maxHp: 10, totalXp: 0, sessionExperience: 0,
      },
      { id: 'mob1', type: 'algox-guard', aggressive: true, hp: 20, maxHp: 20, conditions: [] },
      { id: 'mob2', type: 'algox-guard', aggressive: true, hp: 20, maxHp: 20, conditions: [] },
      { id: 'mob3', type: 'algox-guard', aggressive: true, hp: 20, maxHp: 20, conditions: [] },
    ];

    const appContextStub: Partial<AppContext> = {
      cardPanelCreatureId: 'hero',
      creatures$: new Subject<Creature[]>().asObservable(),
      customAttackResult$: new Subject<CustomAttackResult>().asObservable(),
      getCreatures: () => creatures,
      getElements: () => elements,
      setElementState: () => { },
      applyCreaturePatches: (patches) => { batches.push([...patches]); },
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

  /** Strikes the named enemy, drawing a ±0 so the strike actually lands. */
  const strike = (id: string) => {
    panel.selectTarget(id);
    panel.setModifier(0);
    panel.execute();
  };

  describe('on an attack: one action, at most N different enemies', () => {
    beforeEach(() => {
      panel.selectTile({ source: 'A', half: 'top', card: doubleStrike, content: doubleStrike.top, label: 'Double Strike' });
    });

    it('reads the cap off the attack and still resolves one target at a time', () => {
      expect(panel.isCurrentAttackMultiTarget).toBe(true);
      expect(panel.isSequentialAttack).toBe(true);
      expect(panel.targetLimit).toBe(2);
      expect(panel.attackTargetLimit(0)).toBe(2);
    });

    it('counts down as targets are struck', () => {
      expect(panel.targetsRemaining).toBe(2);

      strike('mob1');
      expect(panel.targetsRemaining).toBe(1);
      expect(panel.targetLimitReached).toBe(false);

      strike('mob2');
      expect(panel.targetsRemaining).toBe(0);
      expect(panel.targetLimitReached).toBe(true);
    });

    it('offers nobody once the cap is spent, though enemies remain on the board', () => {
      strike('mob1');
      // Still one pick left, and mob3 was never touched.
      expect(panel.targetOptions.map(o => o.id)).toEqual(['mob2', 'mob3']);

      strike('mob2');
      expect(panel.targetOptions.length).toBe(0);
      expect(creatures.some(c => c.id === 'mob3')).toBe(true);
      expect(panel.allTargetsStruck).toBe(true);
    });

    it('cannot execute a third strike past the cap', () => {
      strike('mob1');
      strike('mob2');

      panel.selectTarget('mob3');
      panel.setModifier(0);
      const before = batches.length;
      panel.execute();

      expect(batches.length).toBe(before);
      expect(creatures.find(c => c.id === 'mob3')!.hp).toBe(20);
    });

    it('applies exactly N strikes, each its own damage instance', () => {
      strike('mob1');
      strike('mob2');
      panel.finishAttack();

      expect(batches[0].map(p => p.creatureId)).toEqual(['mob1']);
      expect(batches[1].map(p => p.creatureId)).toEqual(['mob2']);
      expect(batches[0][0].patch.hp).toBe(17);
      expect(batches[1][0].patch.hp).toBe(17);
    });

    it('gives the next attack action a fresh cap', () => {
      strike('mob1');
      strike('mob2');
      expect(panel.targetLimitReached).toBe(true);

      panel.finishAttack(); // the half's only attack, so this finalizes it
      expect(batches[batches.length - 1].map(p => p.creatureId)).toEqual(['hero']);
    });
  });

  describe('on a condition: a capped simultaneous multi-select', () => {
    beforeEach(() => {
      panel.selectTile({ source: 'A', half: 'bottom', card: doubleStrike, content: doubleStrike.bottom, label: 'Double Strike' });
    });

    it('picks up the cap from the condition action, with no attack to read it off', () => {
      expect(panel.currentAttack).toBeNull();
      expect(panel.isMultiSelect).toBe(true);
      expect(panel.targetLimit).toBe(2);
    });

    it('refuses a third selection', () => {
      panel.selectTarget('mob1');
      panel.selectTarget('mob2');
      panel.selectTarget('mob3');

      expect(panel.targets.map(t => t.id)).toEqual(['mob1', 'mob2']);
      expect(panel.isTargetSelected('mob3')).toBe(false);
    });

    it('lets the player swap a target out rather than being stuck at the cap', () => {
      panel.selectTarget('mob1');
      panel.selectTarget('mob2');
      expect(panel.targetLimitReached).toBe(true);

      panel.selectTarget('mob2'); // deselect frees a slot
      expect(panel.targetLimitReached).toBe(false);
      panel.selectTarget('mob3');

      expect(panel.targets.map(t => t.id)).toEqual(['mob1', 'mob3']);
    });

    it('keeps every enemy on the strip so a swap is possible', () => {
      panel.selectTarget('mob1');
      panel.selectTarget('mob2');
      expect(panel.targetOptions.map(o => o.id)).toEqual(['mob1', 'mob2', 'mob3']);
    });
  });

  describe('open-ended multiTarget is unchanged', () => {
    beforeEach(() => {
      creatures[0].cardAId = 911;
      panel.selectTile({ source: 'A', half: 'top', card: sweepingBlow, content: sweepingBlow.top, label: 'Sweeping Blow' });
    });

    it('reports no cap and keeps offering targets past two', () => {
      expect(panel.targetLimit).toBeNull();
      expect(panel.targetsRemaining).toBeNull();
      expect(panel.targetLimitReached).toBe(false);

      strike('mob1');
      strike('mob2');

      expect(panel.targetLimitReached).toBe(false);
      expect(panel.targetOptions.map(o => o.id)).toEqual(['mob3']);
    });
  });
});
