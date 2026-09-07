import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext, CustomAttackResult } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import { Creature, Element, ElementType } from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * The resolving-attack target strip: sorted by name and then by standee number, and
 * elites marked with a red ring. Sorting has to key off `type` rather than the
 * displayed `name` — a monster's name is "type standee" (and an elite's is starred on
 * top of that), so a raw string sort would put "algox-guard 10" before
 * "algox-guard 2" and scatter elites out of their group entirely.
 */
describe('PlayerCardExecutionPanelComponent target ordering', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let fixture: ReturnType<typeof TestBed.createComponent<PlayerCardExecutionPanelComponent>>;
  let creatures: Creature[];
  let elements: Element[];

  const card: CharacterAbilityCard = {
    cardId: 900, name: 'Sweeping Blow', level: 1, initiative: 40,
    top: { actions: [{ type: 'attack', value: 3 }] },
    bottom: { actions: [] },
  };

  const deck: CharacterDeck = {
    characterClass: 'drifter', edition: 'fh',
    cards: [card],
  };

  beforeEach(() => {
    elements = (Object.values(ElementType) as ElementType[]).map(type => ({ type, state: 0 as any }));
    creatures = [
      {
        id: 'hero', type: 'drifter', aggressive: false, level: 1,
        initiative: 40, secondaryInitiative: 0, cardAId: 900, cardBId: null,
        hp: 10, maxHp: 10, totalXp: 0, sessionExperience: 0,
      },
      // Deliberately out of order and with two-digit standees, so a naive string
      // sort on the composite "type standee" name would get it wrong.
      { id: 'g10', name: 'algox-guard 10', type: 'algox-guard', aggressive: true, standee: 10, hp: 20, maxHp: 20, conditions: [] },
      { id: 'g2', name: '★ algox-guard 2', type: 'algox-guard', aggressive: true, standee: 2, isElite: true, hp: 30, maxHp: 30, conditions: [] },
      { id: 'g1', name: 'algox-guard 1', type: 'algox-guard', aggressive: true, standee: 1, hp: 20, maxHp: 20, conditions: [] },
      { id: 'b1', name: 'bandit-archer 1', type: 'bandit-archer', aggressive: true, standee: 1, hp: 15, maxHp: 15, conditions: [] },
    ];

    const appContextStub: Partial<AppContext> = {
      cardPanelCreatureId: 'hero',
      creatures$: new Subject<Creature[]>().asObservable(),
      customAttackResult$: new Subject<CustomAttackResult>().asObservable(),
      getCreatures: () => creatures,
      getElements: () => elements,
      setElementState: () => { },
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
    panel.selectTile({ source: 'A', half: 'top', card, content: card.top, label: 'Sweeping Blow' });
  });

  it('sorts by name first, then numerically by standee within the same name', () => {
    expect(panel.targetOptions.map(o => o.id)).toEqual(['g1', 'g2', 'g10', 'b1']);
  });

  it('marks the elite target with the elite ring in the rendered strip', () => {
    fixture.detectChanges();
    const slots = fixture.nativeElement.querySelectorAll('.target-slot');
    const eliteSlot = Array.from(slots).find((el: any) => el.title === '★ algox-guard 2') as HTMLElement;
    const regularSlot = Array.from(slots).find((el: any) => el.title === 'algox-guard 1') as HTMLElement;

    expect(eliteSlot.classList.contains('elite')).toBe(true);
    expect(regularSlot.classList.contains('elite')).toBe(false);
  });
});
