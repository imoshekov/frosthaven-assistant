import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext, CustomAttackResult } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import { Creature, Element, ElementState, ElementType } from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * `bonus` — a conditional bonus with nothing to check and nothing to judge: no element
 * needs to be active, no HP needs to be spared, no printed condition needs reading.
 * meteor #224 "Cloud of Ash": Shield 2, and you may optionally give up 1 of that
 * shield to infuse Earth and gain 1 XP — a trade the player is always free to make,
 * unlike `elementBonus` (which needs an already-active element to spend).
 */
describe('PlayerCardExecutionPanelComponent plain bonuses', () => {
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
        type: 'shield', value: 2,
        subActions: [{
          type: 'bonus',
          subActions: [
            { type: 'shield', value: 1, valueType: 'subtract', small: true },
            { type: 'element', elements: ['earth'], small: true },
            { type: 'xp', value: 1 },
          ],
        }],
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

    fixture = TestBed.createComponent(PlayerCardExecutionPanelComponent);
    panel = fixture.componentInstance;
    panel.selected = { source: 'A', half: 'top' };
  });

  it('finds the bonus on the half and identifies it as a plain bonus', () => {
    expect(panel.selectedBonuses.length).toBe(1);
    expect(panel.isPlainBonus(panel.selectedBonuses[0])).toBe(true);
    expect(panel.isTextBonus(panel.selectedBonuses[0])).toBe(false);
    expect(panel.isSelfDamageBonus(panel.selectedBonuses[0])).toBe(false);
  });

  it('is always available — nothing to check, no element active, no HP required', () => {
    expect(panel.isBonusAvailable(panel.selectedBonuses[0])).toBe(true);
  });

  it('does not infuse or reduce shield until the player checks it', () => {
    expect(panel.totalShield).toBe(2);
    expect(panel.selectedElements).toEqual([]);
  });

  it('nets the shield down and offers the infuse once taken', () => {
    panel.toggleBonus(0, panel.selectedBonuses[0]);

    expect(panel.isBonusTaken(0)).toBe(true);
    expect(panel.totalShield).toBe(1); // 2 printed - 1 from the bonus
    expect(panel.selectedElements).toEqual([ElementType.Earth]);
    expect(panel.takenBonusXp).toBe(1);
  });

  it('untoggles back to the printed shield with nothing infused', () => {
    const bonus = panel.selectedBonuses[0];
    panel.toggleBonus(0, bonus);
    panel.toggleBonus(0, bonus);

    expect(panel.isBonusTaken(0)).toBe(false);
    expect(panel.totalShield).toBe(2);
    expect(panel.selectedElements).toEqual([]);
  });

  it('applies the net shield, infuses earth and awards xp on execute — costing no HP', () => {
    panel.toggleBonus(0, panel.selectedBonuses[0]);
    panel.execute();

    expect(elementCalls).toEqual([{ type: ElementType.Earth, state: ElementState.Full }]);
    expect(heroPatch()?.roundArmor).toBe(1);
    expect(heroPatch()?.sessionExperience).toBe(1);
    expect(heroPatch()?.hp).toBeUndefined();
  });

  it('applies just the printed shield when left untaken', () => {
    panel.execute();

    expect(elementCalls).toEqual([]);
    expect(heroPatch()?.roundArmor).toBe(2);
    expect(heroPatch()?.sessionExperience ?? 0).toBe(0);
  });
});
