import { Creature } from './game-types';
import { effectiveInitiative, effectiveSecondaryInitiative, isHero, isSummon } from './turn-state.util';

/**
 * A summon shares its owner's initiative and acts immediately before them, and must
 * never be mistaken for a hero — `isHero` used to be plain `!aggressive`, which a
 * friendly summon would have satisfied.
 */
describe('summon ordering and identity', () => {
  const hero = (over: Partial<Creature> = {}): Creature => ({
    id: 'hero', type: 'snowflake', aggressive: false, initiative: 30, ...over,
  });

  const summonOf = (ownerId: string, over: Partial<Creature> = {}): Creature => ({
    id: 'summon', name: 'Snow Fox', type: 'snow-fox', aggressive: false,
    isSummon: true, summonOwnerId: ownerId, initiative: 0, ...over,
  });

  const monster = (over: Partial<Creature> = {}): Creature => ({
    id: 'mob', type: 'algox-guard', aggressive: true, initiative: 30, ...over,
  });

  describe('identity', () => {
    it('does not count a summon as a hero, despite being friendly', () => {
      const s = summonOf('hero');
      expect(s.aggressive).toBe(false);
      expect(isHero(s)).toBe(false);
      expect(isSummon(s)).toBe(true);
    });

    it('still counts an actual hero as a hero', () => {
      expect(isHero(hero())).toBe(true);
      expect(isSummon(hero())).toBe(false);
    });

    it('does not count a monster as either', () => {
      expect(isHero(monster())).toBe(false);
      expect(isSummon(monster())).toBe(false);
    });
  });

  describe('effectiveInitiative', () => {
    it('borrows the owner initiative rather than using its own zero', () => {
      const owner = hero({ initiative: 42 });
      const all = [owner, summonOf('hero')];
      expect(effectiveInitiative(all[1], all)).toBe(42);
    });

    it('tracks the owner when their initiative changes between rounds', () => {
      const s = summonOf('hero');
      expect(effectiveInitiative(s, [hero({ initiative: 12 }), s])).toBe(12);
      expect(effectiveInitiative(s, [hero({ initiative: 88 }), s])).toBe(88);
    });

    it('falls back to its own value if the owner is gone', () => {
      const orphan = summonOf('missing', { initiative: 7 });
      expect(effectiveInitiative(orphan, [orphan])).toBe(7);
    });

    it('leaves non-summons on their own initiative', () => {
      const m = monster({ initiative: 55 });
      expect(effectiveInitiative(m, [m])).toBe(55);
    });
  });

  /** Mirrors the comparator in GameComponent.sortedCreatureGroups. */
  function order(creatures: Creature[]): string[] {
    return [...creatures].sort((a, b) => {
      const initA = effectiveInitiative(a, creatures);
      const initB = effectiveInitiative(b, creatures);
      if (initA !== initB) return initA - initB;
      if (!a.aggressive && !b.aggressive) {
        const secondaryA = effectiveSecondaryInitiative(a, creatures);
        const secondaryB = effectiveSecondaryInitiative(b, creatures);
        if (secondaryA !== secondaryB) return secondaryA - secondaryB;
      }
      if (!!a.isSummon !== !!b.isSummon) return a.isSummon ? -1 : 1;
      if (a.aggressive !== b.aggressive) return a.aggressive ? 1 : -1;
      return 0;
    }).map(c => c.id!);
  }

  it('places a summon immediately before its owner', () => {
    const owner = hero({ initiative: 30 });
    expect(order([owner, summonOf('hero')])).toEqual(['summon', 'hero']);
  });

  it('keeps the owner and summon together in the wider turn order', () => {
    const early = hero({ id: 'early', initiative: 10 });
    const owner = hero({ id: 'hero', initiative: 30 });
    const mob = monster({ id: 'mob', initiative: 50 });

    expect(order([mob, owner, summonOf('hero'), early]))
      .toEqual(['early', 'summon', 'hero', 'mob']);
  });

  it('orders each hero own summon with that hero, not as one block', () => {
    const slow = hero({ id: 'slow', initiative: 70 });
    const fast = hero({ id: 'fast', initiative: 20 });
    const slowPet = summonOf('slow', { id: 'slow-pet' });
    const fastPet = summonOf('fast', { id: 'fast-pet' });

    expect(order([slow, slowPet, fast, fastPet]))
      .toEqual(['fast-pet', 'fast', 'slow-pet', 'slow']);
  });

  it('still puts a friendly summon ahead of a monster on the same initiative', () => {
    const owner = hero({ initiative: 30 });
    expect(order([monster({ initiative: 30 }), owner, summonOf('hero')]))
      .toEqual(['summon', 'hero', 'mob']);
  });

  describe('tied main initiative between two heroes', () => {
    it('breaks the tie on the second card, lower going first', () => {
      const a = hero({ id: 'a', initiative: 30, secondaryInitiative: 60 });
      const b = hero({ id: 'b', initiative: 30, secondaryInitiative: 45 });
      expect(order([a, b])).toEqual(['b', 'a']);
    });

    it('falls through to the ordinary rules when both cards are also tied', () => {
      const a = hero({ id: 'zebra', type: 'trap', initiative: 30, secondaryInitiative: 60 });
      const b = hero({ id: 'apple', type: 'astral', initiative: 30, secondaryInitiative: 60 });
      // Neither hero has an edge left, so this just proves it doesn't throw or hang —
      // GameComponent's own name/standee rules take over from here, not this mirror.
      expect(order([a, b]).sort()).toEqual(['apple', 'zebra']);
    });

    it('does not apply the second-card tiebreak to a monster tied with a hero', () => {
      const h = hero({ id: 'hero', initiative: 30, secondaryInitiative: 5 });
      const m = monster({ id: 'mob', initiative: 30 });
      // A monster has no second card; the hero still sorts before it on rule 3.
      expect(order([m, h])).toEqual(['hero', 'mob']);
    });

    it('keeps each hero summon ordered with its own owner once the tie breaks', () => {
      const a = hero({ id: 'a', initiative: 30, secondaryInitiative: 60 });
      const b = hero({ id: 'b', initiative: 30, secondaryInitiative: 45 });
      const petA = summonOf('a', { id: 'pet-a' });
      const petB = summonOf('b', { id: 'pet-b' });
      expect(order([a, petA, b, petB])).toEqual(['pet-b', 'b', 'pet-a', 'a']);
    });
  });
});
