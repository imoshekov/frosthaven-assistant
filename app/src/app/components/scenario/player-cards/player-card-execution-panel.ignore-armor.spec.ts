import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext, CustomAttackResult } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import { Creature, Element, ElementType } from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * A card-printed `ignoreArmor` subAction — the same effect the attack modal's manual
 * toggle has, but authored on the card itself so it shows on the tile and combines
 * with whatever else that attack does (poison, wound, pierce, …), the way `pierce`
 * and `condition` already nest under an `attack`.
 */
describe('PlayerCardExecutionPanelComponent card-printed ignore armor', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let creatures: Creature[];
  let elements: Element[];
  let patchCalls: { creatureId: string; patch: Partial<Creature> }[];

  // A single-attack half: Attack 3, ignore armor, and poison — all on the one strike.
  const shieldBreaker: CharacterAbilityCard = {
    cardId: 500, name: 'Shield Breaker', level: 1, initiative: 40,
    top: {
      actions: [{
        type: 'attack', value: 3,
        subActions: [
          { type: 'ignoreArmor' },
          { type: 'condition', value: 'poison', small: true },
        ],
      }],
    },
    bottom: { actions: [{ type: 'attack', value: 2 }] },
  };

  // Two independent strikes: only the first ignores armor.
  const oneOfTwo: CharacterAbilityCard = {
    cardId: 501, name: 'One of Two', level: 1, initiative: 41,
    top: {
      actions: [
        { type: 'attack', value: 3, subActions: [{ type: 'ignoreArmor' }] },
        { type: 'attack', value: 3 },
      ],
    },
    bottom: { actions: [] },
  };

  const deck: CharacterDeck = {
    characterClass: 'drifter', edition: 'fh',
    cards: [shieldBreaker, oneOfTwo],
  };

  beforeEach(() => {
    elements = (Object.values(ElementType) as ElementType[]).map(type => ({ type, state: 0 as any }));
    patchCalls = [];
    creatures = [
      {
        id: 'hero', type: 'drifter', aggressive: false, level: 1,
        initiative: 40, secondaryInitiative: 0, cardAId: 500, cardBId: null,
        hp: 10, maxHp: 10, totalXp: 0, sessionExperience: 0,
      },
      { id: 'mob', type: 'algox-guard', aggressive: true, hp: 20, maxHp: 20, conditions: [], armor: 5 },
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

  it('reads the flag off the current attack', () => {
    panel.selectTile({ source: 'A', half: 'top', card: shieldBreaker, content: shieldBreaker.top, label: 'Shield Breaker' });
    expect(panel.selectedIgnoreArmor).toBe(true);
    expect(panel.effectiveIgnoreArmorForDamage).toBe(true);
  });

  it('is false for a half that never prints it', () => {
    panel.selectTile({ source: 'A', half: 'bottom', card: shieldBreaker, content: shieldBreaker.bottom, label: 'Shield Breaker' });
    expect(panel.selectedIgnoreArmor).toBe(false);
  });

  it('combines with poison on the same strike: armor ignored, poison still inflicted', () => {
    panel.selectTile({ source: 'A', half: 'top', card: shieldBreaker, content: shieldBreaker.top, label: 'Shield Breaker' });
    expect(panel.selectedConditions).toEqual(['poison'] as any);

    panel.selectTarget('mob');
    panel.setModifier(0);
    panel.execute();

    // Attack 3, armor 5 ignored entirely (poison's own +1 only applies to an attack
    // against an *already*-poisoned target, not the strike that just inflicted it).
    expect(creatures.find(c => c.id === 'mob')!.hp).toBe(20 - 3);
  });

  it('does not leak from one attack of a multi-attack half into the other', () => {
    creatures[0].cardAId = 501;
    panel.selectTile({ source: 'A', half: 'top', card: oneOfTwo, content: oneOfTwo.top, label: 'One of Two' });

    expect(panel.selectedIgnoreArmor).toBe(true);

    panel.selectTarget('mob');
    panel.setModifier(0);
    panel.execute(); // first strike: ignores armor, 3 straight through
    expect(creatures.find(c => c.id === 'mob')!.hp).toBe(20 - 3);

    // The target survives into the next attack (see advanceAttack), so re-selecting
    // it here would toggle it *off* and the strike below would never run.
    expect(panel.targetId).toBe('mob');
    expect(panel.selectedIgnoreArmor).toBe(false); // second strike prints nothing
    panel.setModifier(0);
    panel.execute(); // second strike: normal armor math, 3 − 5 armor = blocked
    expect(creatures.find(c => c.id === 'mob')!.hp).toBe(20 - 3);
  });

  it('lets a manual Custom override replace the card-printed flag, not add to it', () => {
    panel.selectTile({ source: 'A', half: 'top', card: shieldBreaker, content: shieldBreaker.top, label: 'Shield Breaker' });
    panel.customOverride = { attack: 3, armorPen: 0, conditions: [], ignoreArmor: false };

    expect(panel.effectiveIgnoreArmorForDamage).toBe(false);
  });
});
