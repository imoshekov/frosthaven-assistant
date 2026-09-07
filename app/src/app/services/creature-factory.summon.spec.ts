import { CreatureFactoryService } from './creature-factory.service';
import { DataLoaderService } from './data-loader.service';
import { StringUtils } from './string-utils.service';
import { Creature, CreatureConditions } from '../types/game-types';
import { CardSummon } from '../types/character-card-types';

/**
 * Summons are built from the card that summons them, not from the monster tables —
 * their stats exist nowhere else — so this covers the mapping from a printed
 * `CardSummon` onto a real board figure.
 */
describe('CreatureFactoryService.createSummon', () => {
  let factory: CreatureFactoryService;

  const owner: Creature = {
    id: 'hero-1', type: 'snowflake', aggressive: false, level: 4, hp: 10, maxHp: 10,
  };

  beforeEach(() => {
    // Only getData() is touched during construction, and summons never consult it.
    const dataLoader = { getData: () => ({ monsters: [], decks: [] }) } as unknown as DataLoaderService;
    factory = new CreatureFactoryService(dataLoader, new StringUtils());
  });

  it('maps the printed stat line onto the figure', () => {
    const summon: CardSummon = {
      name: 'Polar Cat',
      health: '6', attack: '2', movement: '3', range: '1',
      armor: 2, retaliate: 1, retaliateRange: 2, attackTarget: 2,
    };

    const figure = factory.createSummon(summon, owner, 1);

    expect(figure.name).toBe('Polar Cat');
    expect(figure.hp).toBe(6);
    expect(figure.maxHp).toBe(6);
    expect(figure.attack).toBe(2);
    expect(figure.movement).toBe(3);
    expect(figure.range).toBe(1);
    expect(figure.armor).toBe(2);
    expect(figure.retaliate).toBe(1);
    expect(figure.retaliateRange).toBe(2);
    expect(figure.attackTarget).toBe(2);
  });

  it('is friendly but flagged a summon, so hero-only rules skip it', () => {
    const figure = factory.createSummon({ name: 'Snow Fox', health: 5 }, owner, 1);

    expect(figure.aggressive).toBe(false);
    expect(figure.isSummon).toBe(true);
    expect(figure.summonOwnerId).toBe('hero-1');
  });

  it('carries no initiative of its own', () => {
    const figure = factory.createSummon({ name: 'Snow Fox', health: 5 }, owner, 1);

    expect(figure.initiative).toBe(0);
    expect(figure.hiddenInitiative).toBeNull();
  });

  it('takes flying and immunities from the card', () => {
    const figure = factory.createSummon({
      name: 'White Owl', health: 3, flying: true, immunities: ['poison', 'wound'],
    }, owner, 1);

    expect(figure.flying).toBe(true);
    expect(figure.immunities).toEqual([CreatureConditions.poison, CreatureConditions.wound]);
  });

  it('turns printed condition abilities into the icon strip monsters use', () => {
    const figure = factory.createSummon({
      name: 'Polar Cat', health: 6,
      abilities: [{ type: 'pierce', value: 3 }, { type: 'condition', value: 'wound' }],
    }, owner, 1);

    // Only conditions render as icons on the row; pierce stays card-side reference.
    expect(figure.actions).toEqual([{ type: 'condition', value: 'wound' }]);
  });

  it('slugs the name for CSS classes, grouping and images', () => {
    expect(factory.createSummon({ name: 'Snow Fox' }, owner, 1).type).toBe('snow-fox');
    expect(factory.createSummon({ name: '2 White Owls' }, owner, 1).type).toBe('2-white-owls');
  });

  it('never starts below 1 HP, even from a card with none printed', () => {
    expect(factory.createSummon({ name: 'Banner' }, owner, 1).hp).toBe(1);
  });

  it('defaults a single target and no range when the card prints neither', () => {
    const figure = factory.createSummon({ name: 'Snow Fox', health: 5 }, owner, 1);
    expect(figure.attackTarget).toBe(1);
    expect(figure.range).toBe(0);
  });

  it('gives each figure the standee number it was handed', () => {
    expect(factory.createSummon({ name: 'Owl' }, owner, 2).standee).toBe(2);
  });

  it('gives every figure a distinct id', () => {
    const a = factory.createSummon({ name: 'Owl' }, owner, 1);
    const b = factory.createSummon({ name: 'Owl' }, owner, 2);
    expect(a.id).not.toBe(b.id);
  });
});
