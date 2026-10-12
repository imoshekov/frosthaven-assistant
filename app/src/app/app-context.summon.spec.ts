import { TestBed } from '@angular/core/testing';
import { AppContext } from './app-context';
import { DataLoaderService } from './services/data-loader.service';
import { CreatureFactoryService } from './services/creature-factory.service';
import { LogService } from './services/log.service';
import { NotificationService } from './services/notification.service';
import { DbService } from './services/db.service';
import { XpService } from './services/xp.service';
import { CharacterDeckService } from './services/character-deck.service';
import { StringUtils } from './services/string-utils.service';
import { Creature } from './types/game-types';
import { CardSummon } from './types/character-card-types';

/**
 * Summons only ever enter play through a card action, so `summonFromCard` is the one
 * entry point. These cover that spawn, and the two rules a friendly-but-not-hero
 * figure changes: it can be killed, and it never gets an initiative to submit.
 */
describe('AppContext summons', () => {
  let appContext: AppContext;
  let errors: string[];

  const hero = (over: Partial<Creature> = {}): Creature => ({
    id: 'hero', type: 'snowflake', aggressive: false, level: 3, hp: 10, maxHp: 10,
    initiative: 0, hiddenInitiative: 0, secondaryInitiative: 0, secondaryHiddenInitiative: 0,
    ...over,
  });

  const snowFox: CardSummon = { name: 'Snow Fox', health: 5, attack: 2, movement: 3 };

  beforeEach(() => {
    errors = [];
    TestBed.configureTestingModule({
      providers: [
        AppContext,
        StringUtils,
        // The real factory: building a summon from a card is the behaviour under test.
        CreatureFactoryService,
        { provide: DataLoaderService, useValue: { getData: () => ({ characters: [], monsters: [], decks: [] }) } },
        { provide: LogService, useValue: { init: () => { } } },
        {
          provide: NotificationService,
          useValue: { emitErrorMessage: (m: string) => errors.push(m), emitInfoMessage: () => { } },
        },
        { provide: DbService, useValue: { getCharacter: () => Promise.resolve([]) } },
        { provide: XpService, useValue: { levelFromXp: () => 1 } },
        { provide: CharacterDeckService, useValue: { loadDeck: () => Promise.resolve(null), resolve: () => [] } },
      ],
    });
    appContext = TestBed.inject(AppContext);
    appContext.setCreatures([hero()]);
  });

  const summons = () => appContext.getCreatures().filter(c => c.isSummon);

  describe('summonFromCard', () => {
    it('brings the card figure into play, owned by the acting hero', () => {
      appContext.summonFromCard('hero', snowFox);

      expect(summons().length).toBe(1);
      const fox = summons()[0];
      expect(fox.name).toBe('Snow Fox');
      expect(fox.hp).toBe(5);
      expect(fox.attack).toBe(2);
      expect(fox.summonOwnerId).toBe('hero');
      expect(fox.isSummon).toBe(true);
      expect(fox.aggressive).toBe(false);
    });

    it('spawns one figure per count', () => {
      appContext.summonFromCard('hero', { ...snowFox, name: 'White Owl', count: 2 });
      expect(summons().length).toBe(2);
      expect(summons().map(s => s.standee)).toEqual([1, 2]);
    });

    it('numbers later figures on from the ones already out', () => {
      appContext.summonFromCard('hero', snowFox);
      appContext.summonFromCard('hero', snowFox);

      expect(summons().map(s => s.standee)).toEqual([1, 2]);
    });

    it('numbers each summon kind separately', () => {
      appContext.summonFromCard('hero', snowFox);
      appContext.summonFromCard('hero', { name: 'White Owl', health: 3 });

      expect(summons().find(s => s.name === 'White Owl')!.standee).toBe(1);
    });

    it('leaves the party untouched apart from the new figure', () => {
      appContext.summonFromCard('hero', snowFox);
      expect(appContext.getCreatures().filter(c => c.id === 'hero').length).toBe(1);
      expect(appContext.getCreatures().length).toBe(2);
    });

    it('does nothing for an unknown owner', () => {
      appContext.summonFromCard('nobody', snowFox);
      expect(summons().length).toBe(0);
    });

    it('reports a hero own summons', () => {
      appContext.summonFromCard('hero', snowFox);
      expect(appContext.summonsOf('hero').length).toBe(1);
      expect(appContext.summonsOf('someone-else').length).toBe(0);
    });
  });

  describe('killing', () => {
    it('removes a summon from the board — unlike a hero', () => {
      appContext.summonFromCard('hero', snowFox);
      const fox = summons()[0];

      appContext.killCreature(fox.id!);

      expect(summons().length).toBe(0);
      expect(errors).toEqual([]);
    });

    it('still refuses to kill a hero', () => {
      appContext.killCreature('hero');

      expect(appContext.getCreatures().some(c => c.id === 'hero')).toBe(true);
      expect(errors.length).toBe(1);
    });
  });

  describe('round reset', () => {
    it('never gives a summon an initiative to submit', () => {
      appContext.summonFromCard('hero', snowFox);
      appContext.resetCreaturesForNewRound();

      const fox = summons()[0];
      expect(fox.hiddenInitiative).toBeNull();
      expect(fox.secondaryHiddenInitiative).toBeNull();
    });

    it('does not apply the downed-hero 99 rule to a summon at 0 HP', () => {
      appContext.summonFromCard('hero', snowFox);
      const fox = summons()[0];
      appContext.updateCreatureBaseStat(fox.id!, 'hp', 0);

      appContext.resetCreaturesForNewRound();

      expect(summons()[0].hiddenInitiative).toBeNull();
    });

    it('keeps summons on the board across rounds', () => {
      appContext.summonFromCard('hero', snowFox);
      appContext.resetCreaturesForNewRound();
      expect(summons().length).toBe(1);
    });

    it('still clears a summon round-long shield and retaliate', () => {
      appContext.summonFromCard('hero', snowFox);
      const fox = summons()[0];
      appContext.updateCreatureMultipleStats(fox.id!, { roundArmor: 2, roundRetaliate: 1 });

      appContext.resetCreaturesForNewRound();

      expect(summons()[0].roundArmor).toBe(0);
      expect(summons()[0].roundRetaliate).toBe(0);
    });
  });

  describe('the reveal', () => {
    it('a summon never blocks it', () => {
      appContext.summonFromCard('hero', snowFox);

      // The lone hero submits both cards; the summon has nothing to submit.
      appContext.updateCreatureMultipleStats('hero', {
        hiddenInitiative: 30,
        secondaryHiddenInitiative: 40,
      });

      expect(appContext.getCreatures().find(c => c.id === 'hero')!.initiative).toBe(30);
    });

    it('leaves the summon initiative fields alone through a reveal', () => {
      appContext.summonFromCard('hero', snowFox);
      appContext.updateCreatureMultipleStats('hero', {
        hiddenInitiative: 30, secondaryHiddenInitiative: 40,
      });

      const fox = summons()[0];
      expect(fox.initiative).toBe(0);
      expect(fox.hiddenInitiative).toBeNull();
    });
  });
});
