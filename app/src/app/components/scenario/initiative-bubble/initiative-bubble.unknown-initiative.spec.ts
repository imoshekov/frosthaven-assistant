import { TestBed } from '@angular/core/testing';
import { InitiativeBubbleComponent } from './initiative-bubble.component';
import { AppContext } from '../../../app-context';
import { InitiativeService } from '../../../services/initiative.service';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LocalStorageService } from '../../../services/local-storage.service';
import { DataLoaderService } from '../../../services/data-loader.service';
import { CreatureFactoryService } from '../../../services/creature-factory.service';
import { LogService } from '../../../services/log.service';
import { NotificationService } from '../../../services/notification.service';
import { DbService } from '../../../services/db.service';
import { XpService } from '../../../services/xp.service';
import { Creature } from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * Flags a typed initiative that matches no card the character could hold — a likely
 * typo, since the physical deck is fixed. Must stay silent (never a false positive)
 * while the field is incomplete, before the deck has loaded, or for the long-rest
 * sentinel — and must actually load the deck itself, since nothing else does before
 * the reveal.
 */
describe('InitiativeBubbleComponent unknown initiative', () => {
  let component: InitiativeBubbleComponent;
  let appContext: AppContext;
  let loadDeckCalls: string[];
  let deck: CharacterDeck | null;

  const card = (cardId: number, initiative: number, level: number | 'X' = 1): CharacterAbilityCard => ({
    cardId, name: `Card ${cardId}`, level, initiative,
    top: { actions: [] }, bottom: { actions: [] },
  });

  const hero = (over: Partial<Creature> = {}): Creature => ({
    id: 'h', type: 'drifter', aggressive: false, level: 3, hp: 10, maxHp: 10,
    initiative: 0, hiddenInitiative: 0, secondaryInitiative: 0, secondaryHiddenInitiative: 0,
    ...over,
  });

  beforeEach(() => {
    loadDeckCalls = [];
    deck = {
      characterClass: 'drifter', edition: 'fh',
      cards: [card(1, 32), card(2, 71), card(3, 90, 'X')],
    };

    const deckServiceStub: Partial<CharacterDeckService> = {
      hasPackedInitiatives: () => false,
      loadDeck: (cls: string) => { loadDeckCalls.push(cls); return Promise.resolve(deck); },
      getLoadedDeck: () => deck,
      resolve: (cls, level, initiative) => {
        if (!deck) return [];
        const matches = deck.cards.filter(c => c.initiative === initiative && (c.level === 'X' || Number(c.level) <= level));
        return matches.map(c => ({ card: c, matchedInitiative: initiative }));
      },
    };

    TestBed.configureTestingModule({
      imports: [InitiativeBubbleComponent],
      providers: [
        AppContext,
        InitiativeService,
        { provide: LocalStorageService, useValue: { load: () => null, set: () => { }, clear: () => { } } },
        { provide: CharacterDeckService, useValue: deckServiceStub },
        { provide: DataLoaderService, useValue: { getData: () => ({ characters: [] }) } },
        { provide: CreatureFactoryService, useValue: {} },
        { provide: LogService, useValue: { init: () => { } } },
        { provide: NotificationService, useValue: { emitErrorMessage: () => { }, emitInfoMessage: () => { } } },
        { provide: DbService, useValue: { getCharacter: () => Promise.resolve([]) } },
        { provide: XpService, useValue: { levelFromXp: () => 1 } },
      ],
    });

    appContext = TestBed.inject(AppContext);
    appContext.setCreatures([hero()]);

    const fixture = TestBed.createComponent(InitiativeBubbleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // runs ngOnInit
    component.selectCharacter('drifter');
  });

  it('loads the class deck as soon as the character is selected', () => {
    expect(loadDeckCalls).toContain('drifter');
  });

  it('flags a value that matches no card in the deck', () => {
    component.mainInput = '50';
    expect(component.mainInitiativeUnknown).toBe(true);
  });

  it('does not flag a value that matches a real card', () => {
    component.mainInput = '32';
    expect(component.mainInitiativeUnknown).toBe(false);
  });

  it('does not flag a level-X card regardless of the hero level', () => {
    component.mainInput = '90';
    expect(component.mainInitiativeUnknown).toBe(false);
  });

  it('checks the two fields independently', () => {
    component.mainInput = '32';   // real
    component.secondaryInput = '50'; // not real
    expect(component.mainInitiativeUnknown).toBe(false);
    expect(component.secondaryInitiativeUnknown).toBe(true);
  });

  it('stays silent while the field is empty or only partially typed', () => {
    component.mainInput = '';
    expect(component.mainInitiativeUnknown).toBe(false);
    component.mainInput = '0';
    expect(component.mainInitiativeUnknown).toBe(false);
  });

  it('never flags the long-rest sentinel, even though no card prints it', () => {
    component.mainInput = '99';
    expect(component.mainInitiativeUnknown).toBe(false);
  });

  it('stays silent until the deck has actually loaded, rather than assuming a mismatch', () => {
    deck = null; // simulates a fetch still in flight
    component.mainInput = '50';
    expect(component.mainInitiativeUnknown).toBe(false);
  });

  it('does not flag a card above the hero level printed only as "no card for you yet"', () => {
    deck!.cards.push(card(4, 65, 9)); // a real level-9 card
    appContext.setCreatures([hero({ level: 1 })]);
    component.mainInput = '65';
    expect(component.mainInitiativeUnknown).toBe(true);
  });
});
