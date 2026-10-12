import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext, CustomAttackResult } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import { Creature, ElementState, ElementType } from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * `consumeMode: 'any'` on an `element` action — "infuse ICE or AIR" — narrows an
 * infuse from "all of these" (the default) to "whichever one the player picks."
 * Mirrors `elementBonus`'s own 'any' picker, except there's no cost to check first:
 * infusing isn't gated on anything being available, so the picker is always shown and
 * Execute is withheld until a pick is made — an unresolved 'any' infuses nothing,
 * never a silent guess.
 */
describe('PlayerCardExecutionPanelComponent element consumeMode "any"', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let fixture: ComponentFixture<PlayerCardExecutionPanelComponent>;
  let creatures: Creature[];
  let elements: { type: ElementType; state: ElementState }[];
  let elementCalls: { type: ElementType; state: ElementState }[];

  /** "Infuse ICE or AIR." — no attack, nothing else on the half. */
  const eitherOrInfuse: CharacterAbilityCard = {
    cardId: 920, name: 'Either Or Infuse', level: 1, initiative: 20,
    top: {
      actions: [{ type: 'element', elements: ['ice', 'air'], consumeMode: 'any' }],
    },
    bottom: { actions: [] },
  };

  /** Two independent choices on one half — each needs its own pick. */
  const doubleChoice: CharacterAbilityCard = {
    cardId: 921, name: 'Double Choice', level: 1, initiative: 21,
    top: {
      actions: [
        { type: 'element', elements: ['fire', 'ice'], consumeMode: 'any' },
        { type: 'element', elements: ['earth', 'dark'], consumeMode: 'any' },
      ],
    },
    bottom: { actions: [] },
  };

  /** Ordinary infuse-all, for contrast: no picker, both apply immediately. */
  const infuseBoth: CharacterAbilityCard = {
    cardId: 922, name: 'Infuse Both', level: 1, initiative: 22,
    top: { actions: [{ type: 'element', elements: ['light', 'dark'] }] },
    bottom: { actions: [] },
  };

  const deck: CharacterDeck = {
    characterClass: 'drifter', edition: 'fh',
    cards: [eitherOrInfuse, doubleChoice, infuseBoth],
  };

  beforeEach(() => {
    elementCalls = [];
    elements = (Object.values(ElementType) as ElementType[])
      .map(type => ({ type, state: ElementState.None }));
    creatures = [
      {
        id: 'hero', type: 'drifter', aggressive: false, level: 1,
        initiative: 20, secondaryInitiative: 0, cardAId: 920, cardBId: null,
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

  it('infuses nothing until a choice is made', () => {
    expect(panel.selectedElements).toEqual([]);
  });

  it('offers both named elements as the choice', () => {
    expect(panel.chooseOneElementRows.length).toBe(1);
    expect(panel.infuseChoicesFor(panel.chooseOneElementRows[0].action))
      .toEqual([ElementType.Ice, ElementType.Air]);
  });

  it('withholds Execute until a choice is made', () => {
    expect(panel.canExecute).toBe(false);
  });

  it('infuses only the picked element once chosen', () => {
    panel.chooseInfuseElement(0, ElementType.Air);
    expect(panel.selectedElements).toEqual([ElementType.Air]);
    expect(panel.canExecute).toBe(true);
  });

  it('actually sets only the picked element to Full on execute', () => {
    panel.chooseInfuseElement(0, ElementType.Ice);
    panel.execute();

    expect(elementCalls).toEqual([{ type: ElementType.Ice, state: ElementState.Full }]);
  });

  it('switching the pick changes what gets infused', () => {
    panel.chooseInfuseElement(0, ElementType.Ice);
    panel.chooseInfuseElement(0, ElementType.Air);
    expect(panel.selectedElements).toEqual([ElementType.Air]);
  });

  it('resets when the half is re-selected', () => {
    panel.chooseInfuseElement(0, ElementType.Ice);
    panel.selectTile({ source: 'A', half: 'top', card: eitherOrInfuse, content: eitherOrInfuse.top, label: 'Either Or Infuse' });

    expect(panel.selectedElements).toEqual([]);
    expect(panel.canExecute).toBe(false);
  });

  describe('two independent choices on one half', () => {
    beforeEach(() => {
      creatures[0].cardAId = 921;
      panel.selectTile({ source: 'A', half: 'top', card: doubleChoice, content: doubleChoice.top, label: 'Double Choice' });
    });

    it('lists both as separate rows', () => {
      expect(panel.chooseOneElementRows.length).toBe(2);
    });

    it('needs both picked before Execute is offered', () => {
      panel.chooseInfuseElement(0, ElementType.Fire);
      expect(panel.canExecute).toBe(false);

      panel.chooseInfuseElement(1, ElementType.Dark);
      expect(panel.canExecute).toBe(true);
    });

    it('infuses one from each row once both are picked', () => {
      panel.chooseInfuseElement(0, ElementType.Fire);
      panel.chooseInfuseElement(1, ElementType.Earth);

      expect(panel.selectedElements).toEqual(
        jasmine.arrayWithExactContents([ElementType.Fire, ElementType.Earth])
      );
    });
  });

  describe('rendered picker', () => {
    it('shows a choice button per element, and clicking one selects it', () => {
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;

      const row = el.querySelector('.infuse-choice');
      expect(row).toBeTruthy();
      expect(row!.classList.contains('unresolved')).toBe(true);

      const buttons = Array.from(row!.querySelectorAll<HTMLButtonElement>('.choice-btn'));
      expect(buttons.length).toBe(2);
      const airBtn = buttons.find(b => b.querySelector('.icon.elem-air'))!;
      expect(airBtn).toBeTruthy();

      airBtn.click();
      fixture.detectChanges();

      expect(panel.selectedElements).toEqual([ElementType.Air]);
      expect(el.querySelector('.infuse-choice')!.classList.contains('unresolved')).toBe(false);
      expect(airBtn.classList.contains('active')).toBe(true);
    });

    it('renders no picker row for a half needing no choice', () => {
      creatures[0].cardAId = 922;
      panel.selectTile({ source: 'A', half: 'top', card: infuseBoth, content: infuseBoth.top, label: 'Infuse Both' });
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).querySelector('.infuse-choice')).toBeNull();
    });
  });

  it('an ordinary element action (no consumeMode) needs no choice and infuses everything', () => {
    creatures[0].cardAId = 922;
    panel.selectTile({ source: 'A', half: 'top', card: infuseBoth, content: infuseBoth.top, label: 'Infuse Both' });

    expect(panel.chooseOneElementRows.length).toBe(0);
    expect(panel.canExecute).toBe(true);
    expect(panel.selectedElements).toEqual(
      jasmine.arrayWithExactContents([ElementType.Light, ElementType.Dark])
    );
  });
});
