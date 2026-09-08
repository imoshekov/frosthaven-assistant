import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext, CustomAttackResult } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import { Creature, ElementState, ElementType } from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * Regression for astral #202 "Guide the Flow": three `elementBonus` rotations
 * (air->dark, earth->air, dark->earth) sit side by side on one half. An `element`
 * infuse nested inside a bonus's `subActions` must only fire once *that* bonus is
 * taken — not just because it appears somewhere under the half's action tree, or
 * every rotation fires at once regardless of which one the player actually paid for,
 * clobbering the element that was just correctly consumed by another taken bonus.
 */
describe('PlayerCardExecutionPanelComponent — bonus-gated element infuse', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let fixture: ComponentFixture<PlayerCardExecutionPanelComponent>;
  let creatures: Creature[];
  let elements: { type: ElementType; state: ElementState }[];
  let elementCalls: { type: ElementType; state: ElementState }[];

  const guideTheFlow: CharacterAbilityCard = {
    cardId: 930, name: 'Guide the Flow Test', level: 3, initiative: 35,
    top: {
      actions: [
        {
          type: 'elementBonus', elements: ['air'], consumeMode: 'all',
          subActions: [{ type: 'element', elements: ['dark'] }],
        },
        {
          type: 'elementBonus', elements: ['earth'], consumeMode: 'all',
          subActions: [{ type: 'element', elements: ['air'] }],
        },
        {
          type: 'elementBonus', elements: ['dark'], consumeMode: 'all',
          subActions: [{ type: 'element', elements: ['earth'] }, { type: 'xp', value: 1 }],
        },
      ],
    },
    bottom: { actions: [] },
  };

  const deck: CharacterDeck = {
    characterClass: 'astral', edition: 'fh',
    cards: [guideTheFlow],
  };

  const setState = (type: ElementType, state: ElementState) => {
    const row = elements.find(e => e.type === type)!;
    row.state = state;
  };

  beforeEach(() => {
    elementCalls = [];
    elements = (Object.values(ElementType) as ElementType[])
      .map(type => ({ type, state: ElementState.None }));
    // Earth is the only element active — matches "consume earth, infuse air".
    setState(ElementType.Earth, ElementState.Full);

    creatures = [
      {
        id: 'hero', type: 'astral', aggressive: false, level: 3,
        initiative: 35, secondaryInitiative: 0, cardAId: 930, cardBId: null,
        hp: 10, maxHp: 10, totalXp: 0, sessionExperience: 0,
      },
    ];

    const appContextStub: Partial<AppContext> = {
      cardPanelCreatureId: 'hero',
      creatures$: new Subject<Creature[]>().asObservable(),
      customAttackResult$: new Subject<CustomAttackResult>().asObservable(),
      getCreatures: () => creatures,
      getElements: () => elements,
      setElementState: (type, state) => { elementCalls.push({ type, state }); },
      applyCreaturePatches: () => { },
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

    fixture = TestBed.createComponent(PlayerCardExecutionPanelComponent);
    panel = fixture.componentInstance;
    panel.selected = { source: 'A', half: 'top' };
  });

  it('infuses nothing before any bonus is taken, even though every rotation is on the half', () => {
    expect(panel.selectedElements).toEqual([]);
  });

  it('infuses only the taken bonus\'s element once "consume earth, infuse air" is taken', () => {
    // Only the earth->air bonus (index 1) can even be taken: air and dark are inactive.
    panel.toggleBonus(1, panel.selectedBonuses[1]);

    expect(panel.selectedElements).toEqual([ElementType.Air]);
    expect(panel.elementsToConsume).toEqual([ElementType.Earth]);
  });

  it('consumes earth and infuses air on execute, and earth does not come back charged', () => {
    panel.toggleBonus(1, panel.selectedBonuses[1]);
    panel.execute();

    expect(elementCalls).toEqual([
      { type: ElementType.Earth, state: ElementState.None },
      { type: ElementType.Air, state: ElementState.Full },
    ]);
  });
});
