import { TestBed } from '@angular/core/testing';
import { AppContext, LONG_REST_INITIATIVE } from './app-context';
import { DataLoaderService } from './services/data-loader.service';
import { CreatureFactoryService } from './services/creature-factory.service';
import { LogService } from './services/log.service';
import { NotificationService } from './services/notification.service';
import { DbService } from './services/db.service';
import { XpService } from './services/xp.service';
import { CharacterDeckService } from './services/character-deck.service';
import { Creature } from './types/game-types';

/**
 * `autoBindHeroCards` binds a slot whose initiative resolves to exactly one card.
 *
 * The 99 sentinel is the subtlety: a long rest (and a downed hero) submits it to
 * *both* slots, and binding on that would pin a card to a hero who played none. But 99
 * is also a real printed initiative — Shackles "The End of Everything", Blinkblade's
 * slow 99 — and each resolves to exactly one candidate, which is below the two the
 * panel's chooser needs to appear. Treating a lone 99 as the sentinel would therefore
 * leave those halves impossible to bind by any route at all.
 */
describe('AppContext.autoBindHeroCards', () => {
  let appContext: AppContext;
  let resolveCalls: number[];

  /** Stands in for Shackles: exactly one card at 99, exactly one at 30. */
  const cardFor = (initiative: number) => {
    if (initiative === LONG_REST_INITIATIVE) {
      return [{ card: { cardId: 329, name: 'The End of Everything', level: 9, initiative: 99 }, matchedInitiative: 99 }];
    }
    if (initiative === 30) {
      return [{ card: { cardId: 305, name: 'Unending Torment', level: 1, initiative: 30 }, matchedInitiative: 30 }];
    }
    return [];
  };

  const hero = (over: Partial<Creature> = {}): Creature => ({
    id: 'hero', type: 'shackles', aggressive: false, level: 9, hp: 10, maxHp: 10,
    initiative: 0, hiddenInitiative: 0, secondaryInitiative: 0, secondaryHiddenInitiative: 0,
    cardAId: null, cardBId: null,
    ...over,
  });

  beforeEach(() => {
    resolveCalls = [];
    TestBed.configureTestingModule({
      providers: [
        AppContext,
        { provide: DataLoaderService, useValue: { getData: () => ({ characters: [] }) } },
        { provide: CreatureFactoryService, useValue: {} },
        { provide: LogService, useValue: { init: () => { }, runWithoutLogging: (fn: () => void) => fn() } },
        { provide: NotificationService, useValue: { emitErrorMessage: () => { }, emitInfoMessage: () => { } } },
        { provide: DbService, useValue: { getCharacter: () => Promise.resolve([]) } },
        { provide: XpService, useValue: { levelFromXp: () => 9 } },
        {
          provide: CharacterDeckService,
          useValue: {
            loadDeck: () => Promise.resolve({}),
            resolve: (_class: string, _level: number, initiative: number) => {
              resolveCalls.push(initiative);
              return cardFor(initiative);
            },
          },
        },
      ],
    });
    appContext = TestBed.inject(AppContext);
  });

  const creature = () => appContext.getCreatures().find(c => c.id === 'hero')!;

  it('binds both slots from ordinary initiatives', async () => {
    appContext.setCreatures([hero({ initiative: 30, secondaryInitiative: 30 })]);

    await appContext.autoBindHeroCards('hero');

    expect(creature().cardAId).toBe(305);
    expect(creature().cardBId).toBe(305);
  });

  it('binds nothing for a long rest — the 99 sentinel in both slots', async () => {
    appContext.setCreatures([hero({
      initiative: LONG_REST_INITIATIVE,
      secondaryInitiative: LONG_REST_INITIATIVE,
    })]);

    await appContext.autoBindHeroCards('hero');

    expect(creature().cardAId).toBeNull();
    expect(creature().cardBId).toBeNull();
    // Never even asked the deck: a long rest played no card to look up.
    expect(resolveCalls).toEqual([]);
  });

  /**
   * Regression: a per-slot sentinel test made this card unbindable. It resolves to one
   * candidate, and `needsChoice()` only offers the chooser at two or more — so the half
   * would have shown "No card bound for this slot" with no way to fix it.
   */
  it('binds a card genuinely printed at 99 when the other slot is a normal initiative', async () => {
    appContext.setCreatures([hero({
      initiative: LONG_REST_INITIATIVE,
      secondaryInitiative: 30,
    })]);

    await appContext.autoBindHeroCards('hero');

    expect(creature().cardAId).toBe(329);
    expect(creature().cardBId).toBe(305);
  });

  it('binds it in the second slot too', async () => {
    appContext.setCreatures([hero({
      initiative: 30,
      secondaryInitiative: LONG_REST_INITIATIVE,
    })]);

    await appContext.autoBindHeroCards('hero');

    expect(creature().cardAId).toBe(305);
    expect(creature().cardBId).toBe(329);
  });

  it('leaves an unsubmitted slot alone', async () => {
    appContext.setCreatures([hero({ initiative: 0, secondaryInitiative: 0 })]);

    await appContext.autoBindHeroCards('hero');

    expect(creature().cardAId).toBeNull();
    expect(creature().cardBId).toBeNull();
  });

  it('does not re-bind a slot the player already chose', async () => {
    appContext.setCreatures([hero({ initiative: 30, secondaryInitiative: 30, cardAId: 999 })]);

    await appContext.autoBindHeroCards('hero');

    expect(creature().cardAId).toBe(999);
    expect(creature().cardBId).toBe(305);
  });
});
