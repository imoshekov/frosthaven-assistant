import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import { DataLoaderService } from '../../../services/data-loader.service';
import { CreatureFactoryService } from '../../../services/creature-factory.service';
import { NotificationService } from '../../../services/notification.service';
import { DbService } from '../../../services/db.service';
import { XpService } from '../../../services/xp.service';
import { Creature, ElementState, ElementType } from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * Regression: Undo used to leave element infusions in place entirely — see
 * `HalfExecution.elementsChanged`. meteor "Cloud of Ash" bottom (as reported): Muddle
 * up to 2 enemies, with two `textBonus` offers each infusing a different element —
 * exactly the shape that exposed it, exercised here through the real `AppContext`
 * rather than a stub, so the whole execute → undo round trip is covered.
 */
describe('PlayerCardExecutionPanelComponent — Undo restores element infusions', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let fixture: ComponentFixture<PlayerCardExecutionPanelComponent>;
  let appContext: AppContext;

  const muddleWithBonuses: CharacterAbilityCard = {
    cardId: 224, name: 'Cloud of Ash', level: 1, initiative: 23,
    top: { actions: [] },
    bottom: {
      actions: [{
        type: 'condition', value: 'muddle', multiTarget: 2,
        subActions: [
          {
            type: 'textBonus', text: '-1 pull, -1 range',
            subActions: [{ type: 'element', elements: ['air'] }],
          },
          {
            type: 'textBonus', text: '-1 target',
            subActions: [{ type: 'element', elements: ['dark'] }],
          },
        ],
      }],
    },
  };

  const deck: CharacterDeck = {
    characterClass: 'meteor', edition: 'fh', cards: [muddleWithBonuses],
  };

  const elementState = (type: ElementType) =>
    appContext.getElements().find(e => e.type === type)?.state;

  beforeEach(() => {
    const creatures: Creature[] = [
      {
        id: 'hero', type: 'meteor', aggressive: false, level: 1,
        initiative: 23, secondaryInitiative: 0, cardAId: 224, cardBId: null,
        hp: 10, maxHp: 10, totalXp: 0, sessionExperience: 0,
      },
      { id: 'mob', type: 'algox-guard', aggressive: true, hp: 20, maxHp: 20, conditions: [] },
    ];

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
        AppContext,
        { provide: DataLoaderService, useValue: { getData: () => ({ characters: [], monsters: [], decks: [] }) } },
        { provide: CreatureFactoryService, useValue: {} },
        {
          provide: LogService,
          useValue: {
            init: () => { },
            appendDamageToLastBatch: () => { },
            appendKillToLastBatch: () => { },
            runWithoutLogging: (fn: () => void) => fn(),
          },
        },
        { provide: NotificationService, useValue: { emitErrorMessage: () => { }, emitInfoMessage: () => { } } },
        { provide: DbService, useValue: { getCharacter: () => Promise.resolve([]) } },
        { provide: XpService, useValue: { levelFromXp: () => 1 } },
        { provide: CharacterDeckService, useValue: deckServiceStub },
      ],
    });

    appContext = TestBed.inject(AppContext);
    appContext.setCreatures(creatures);
    appContext.cardPanelCreatureId = 'hero';

    fixture = TestBed.createComponent(PlayerCardExecutionPanelComponent);
    panel = fixture.componentInstance;
    panel.selected = { source: 'A', half: 'bottom' };
  });

  it('infuses air on execute once its bonus is taken', () => {
    expect(elementState(ElementType.Air)).toBe(ElementState.None);

    panel.toggleBonus(0, panel.selectedBonuses[0]); // air bonus
    panel.selectTarget('mob');
    panel.execute();

    expect(elementState(ElementType.Air)).toBe(ElementState.Full);
  });

  it('undo puts air back to None — the actual reported bug', () => {
    panel.toggleBonus(0, panel.selectedBonuses[0]); // air bonus
    panel.selectTarget('mob');
    panel.execute();
    expect(elementState(ElementType.Air)).toBe(ElementState.Full);

    appContext.undoCardHalf('hero', 'bottom');

    expect(elementState(ElementType.Air)).toBe(ElementState.None);
  });

  it('undo puts both elements back when both bonuses were taken', () => {
    panel.toggleBonus(0, panel.selectedBonuses[0]); // air
    panel.toggleBonus(1, panel.selectedBonuses[1]); // dark
    panel.selectTarget('mob');
    panel.execute();
    expect(elementState(ElementType.Air)).toBe(ElementState.Full);
    expect(elementState(ElementType.Dark)).toBe(ElementState.Full);

    appContext.undoCardHalf('hero', 'bottom');

    expect(elementState(ElementType.Air)).toBe(ElementState.None);
    expect(elementState(ElementType.Dark)).toBe(ElementState.None);
  });

  it('does not touch an element this half never changed', () => {
    appContext.setElementState(ElementType.Earth, ElementState.Full);
    panel.toggleBonus(0, panel.selectedBonuses[0]); // air only
    panel.selectTarget('mob');
    panel.execute();

    appContext.undoCardHalf('hero', 'bottom');

    expect(elementState(ElementType.Earth)).toBe(ElementState.Full);
  });
});
