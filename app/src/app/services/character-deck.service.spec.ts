import { CharacterDeckService } from './character-deck.service';
import { CharacterAbilityCard, CharacterClassName, CharacterDeck } from '../types/character-card-types';

describe('CharacterDeckService', () => {
  let service: CharacterDeckService;

  const card = (over: Partial<CharacterAbilityCard>): CharacterAbilityCard => ({
    cardId: 1, name: 'Card', level: 1, initiative: 50,
    top: { actions: [] },
    bottom: { actions: [] },
    ...over,
  });

  const deck = (cards: CharacterAbilityCard[], characterClass: CharacterClassName = 'drifter'): CharacterDeck =>
    ({ characterClass, edition: 'fh', cards });

  beforeEach(() => { service = new CharacterDeckService(); });

  describe('decodePackedInitiative', () => {
    it('splits a four-digit packed value', () => {
      expect(CharacterDeckService.decodePackedInitiative(2050)).toEqual({ fast: 20, slow: 50 });
    });

    it('pads a three-digit value before splitting', () => {
      // 232 is Borrowed Time: fast 02, slow 32.
      expect(CharacterDeckService.decodePackedInitiative(232)).toEqual({ fast: 2, slow: 32 });
      expect(CharacterDeckService.decodePackedInitiative(131)).toEqual({ fast: 1, slow: 31 });
      expect(CharacterDeckService.decodePackedInitiative(1040)).toEqual({ fast: 10, slow: 40 });
    });

    it('treats anything at or below 99 as a plain initiative', () => {
      // Verified across all 17 Frosthaven decks: only blinkblade exceeds 99, and all
      // 29 of its cards do, so ">99" is a sound detector.
      expect(CharacterDeckService.decodePackedInitiative(99)).toBeNull();
      expect(CharacterDeckService.decodePackedInitiative(32)).toBeNull();
    });
  });

  describe('cardsForLevel', () => {
    it('includes cards at or below the hero level', () => {
      const d = deck([card({ cardId: 1, level: 1 }), card({ cardId: 5, level: 5 })]);
      expect(service.cardsForLevel(d, 3).map(c => c.cardId)).toEqual([1]);
      expect(service.cardsForLevel(d, 5).map(c => c.cardId)).toEqual([1, 5]);
    });

    it('always includes level X cards', () => {
      const d = deck([card({ cardId: 9, level: 'X' })]);
      expect(service.cardsForLevel(d, 1).map(c => c.cardId)).toEqual([9]);
    });

    it('returns nothing for a missing deck', () => {
      expect(service.cardsForLevel(null, 5)).toEqual([]);
    });
  });

  describe('resolve', () => {
    /** The service resolves against decks it has loaded, so seed the cache directly. */
    function seed(d: CharacterDeck): void {
      (service as any).loaded.set(d.characterClass, d);
      for (const c of d.cards) (service as any).cardsById.set(c.cardId, c);
    }

    it('resolves a unique initiative to one card', () => {
      seed(deck([card({ cardId: 10, name: 'Deadly Shot', initiative: 32, level: 1 })]));
      const found = service.resolve('drifter', 1, 32);
      expect(found.length).toBe(1);
      expect(found[0].card.name).toBe('Deadly Shot');
    });

    it('returns both cards when a deck genuinely collides', () => {
      // drifter 32 is both Deadly Shot (L1) and Fierce Barrage (L3).
      seed(deck([
        card({ cardId: 10, name: 'Deadly Shot', initiative: 32, level: 1 }),
        card({ cardId: 11, name: 'Fierce Barrage', initiative: 32, level: 3 }),
      ]));
      expect(service.resolve('drifter', 3, 32).length).toBe(2);
    });

    it('level filtering removes a collision below the higher card level', () => {
      seed(deck([
        card({ cardId: 10, name: 'Deadly Shot', initiative: 32, level: 1 }),
        card({ cardId: 11, name: 'Fierce Barrage', initiative: 32, level: 3 }),
      ]));
      const atLevelOne = service.resolve('drifter', 1, 32);
      expect(atLevelOne.length).toBe(1);
      expect(atLevelOne[0].card.name).toBe('Deadly Shot');
    });

    it('matches either blinkblade identity and reports which', () => {
      seed(deck([
        card({ cardId: 40, name: 'Blurry Jab', initiative: 2050, initiativeFast: 20, initiativeSlow: 50 }),
      ], 'blinkblade'));

      const fast = service.resolve('blinkblade', 1, 20);
      expect(fast.length).toBe(1);
      expect(fast[0].identity).toBe('fast');

      const slow = service.resolve('blinkblade', 1, 50);
      expect(slow.length).toBe(1);
      expect(slow[0].identity).toBe('slow');

      // The packed value itself is not a playable initiative.
      expect(service.resolve('blinkblade', 1, 2050).length).toBe(0);
    });

    it('returns nothing for an unknown initiative or an unloaded deck', () => {
      seed(deck([card({ cardId: 10, initiative: 32 })]));
      expect(service.resolve('drifter', 1, 77)).toEqual([]);
      expect(service.resolve('astral', 1, 32)).toEqual([]);
    });

    it('orders candidates by level then cardId, so every client agrees', () => {
      seed(deck([
        card({ cardId: 30, initiative: 15, level: 5 }),
        card({ cardId: 12, initiative: 15, level: 'X' }),
        card({ cardId: 20, initiative: 15, level: 5 }),
      ]));
      expect(service.resolve('drifter', 9, 15).map(c => c.card.cardId)).toEqual([12, 20, 30]);
    });
  });

  it('reports which classes pack two initiatives per card', () => {
    expect(service.hasPackedInitiatives('blinkblade')).toBe(true);
    expect(service.hasPackedInitiatives('drifter')).toBe(false);
  });
});
