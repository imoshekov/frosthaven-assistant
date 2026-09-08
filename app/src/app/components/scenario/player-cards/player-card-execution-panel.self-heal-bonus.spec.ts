import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext, CustomAttackResult } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import { Creature, Element, ElementState, ElementType } from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * Regression for meteor "Cloud of Ash" top (as hand-authored): Heal 7 to self, with
 * three `bonus` offers nested under it — each pays 2 of that self-heal to infuse an
 * element and (for two of them) gain 1 XP. `takenBonusHeal` already summed the taken
 * bonus's heal delta correctly, but `selectedSelfHealValue` never added it in — only
 * the target-facing `selectedHealValue` did — so the element spent and the XP awarded
 * while the self-heal silently stayed at its printed 7, both on screen and on Execute.
 */
describe('PlayerCardExecutionPanelComponent — bonus nested under a selfOnly heal', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let fixture: ComponentFixture<PlayerCardExecutionPanelComponent>;
  let creatures: Creature[];
  let elements: Element[];
  let elementCalls: { type: ElementType; state: ElementState }[];
  let patchCalls: { creatureId: string; patch: Partial<Creature> }[];

  const cloudOfAsh: CharacterAbilityCard = {
    cardId: 224, name: 'Cloud of Ash', level: 1, initiative: 23,
    top: {
      actions: [{
        type: 'heal', value: 7, selfOnly: true,
        subActions: [
          {
            type: 'bonus',
            subActions: [
              { type: 'heal', value: 2, valueType: 'subtract', small: true },
              { type: 'element', elements: ['air'], small: true },
              { type: 'xp', value: 1 },
            ],
          },
          {
            type: 'bonus',
            subActions: [
              { type: 'heal', value: 2, valueType: 'subtract', small: true },
              { type: 'element', elements: ['earth'], small: true },
              { type: 'xp', value: 1 },
            ],
          },
          {
            type: 'bonus',
            subActions: [
              { type: 'heal', value: 2, valueType: 'subtract', small: true },
              { type: 'element', elements: ['dark'], small: true },
            ],
          },
        ],
      }],
    },
    bottom: { actions: [] },
  };

  const deck: CharacterDeck = {
    characterClass: 'meteor', edition: 'fh', cards: [cloudOfAsh],
  };

  const heroPatch = () => patchCalls.find(p => p.creatureId === 'hero')?.patch;

  beforeEach(() => {
    patchCalls = [];
    elementCalls = [];
    elements = (Object.values(ElementType) as ElementType[])
      .map(type => ({ type, state: ElementState.None }));
    creatures = [
      {
        id: 'hero', type: 'meteor', aggressive: false, level: 1,
        initiative: 23, secondaryInitiative: 0, cardAId: 224, cardBId: null,
        hp: 3, maxHp: 10, totalXp: 0, sessionExperience: 0,
      },
    ];

    const appContextStub: Partial<AppContext> = {
      cardPanelCreatureId: 'hero',
      creatures$: new Subject<Creature[]>().asObservable(),
      customAttackResult$: new Subject<CustomAttackResult>().asObservable(),
      getCreatures: () => creatures,
      getElements: () => elements,
      setElementState: (type, state) => { elementCalls.push({ type, state }); },
      applyCreaturePatches: (patches) => {
        patchCalls.push(...patches);
        for (const { creatureId, patch } of patches) {
          const creature = creatures.find(c => c.id === creatureId);
          if (creature) Object.assign(creature, patch);
        }
      },
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

    fixture = TestBed.createComponent(PlayerCardExecutionPanelComponent);
    panel = fixture.componentInstance;
    panel.selected = { source: 'A', half: 'top' };
  });

  it('shows the printed self-heal before any bonus is taken', () => {
    expect(panel.selectedSelfHealValue).toBe(7);
    expect(panel.healDisplayValue).toBe(7);
  });

  it('reduces the displayed self-heal by 2 once an element bonus is taken', () => {
    panel.toggleBonus(0, panel.selectedBonuses[0]); // air bonus

    expect(panel.takenBonusHeal).toBe(-2);
    expect(panel.selectedSelfHealValue).toBe(5);
    expect(panel.healDisplayValue).toBe(5);
  });

  it('reverts to 7 when the bonus is untoggled', () => {
    const bonus = panel.selectedBonuses[0];
    panel.toggleBonus(0, bonus);
    panel.toggleBonus(0, bonus);

    expect(panel.selectedSelfHealValue).toBe(7);
  });

  it('actually heals only 5 (not 7) on execute once the bonus is taken, and infuses/awards xp', () => {
    panel.toggleBonus(0, panel.selectedBonuses[0]); // air bonus
    panel.execute();

    expect(heroPatch()?.hp).toBe(8); // 3 + 5, not 3 + 7
    expect(elementCalls).toEqual([{ type: ElementType.Air, state: ElementState.Full }]);
    expect(heroPatch()?.sessionExperience).toBe(1);
  });

  it('heals the full 7 on execute when no bonus is taken', () => {
    panel.execute();

    expect(heroPatch()?.hp).toBe(10); // 3 + 7
    expect(elementCalls).toEqual([]);
    expect(heroPatch()?.sessionExperience ?? 0).toBe(0);
  });
});
