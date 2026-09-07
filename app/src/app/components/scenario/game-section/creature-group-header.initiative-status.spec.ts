import { CreatureGroupHeaderComponent } from './creature-group-header.component';
import { Creature } from '../../../types/game-types';

/**
 * Reproduces the reported bug: a freshly-added hero (before any round reset has run)
 * has `hiddenInitiative` as `undefined`, not `0`. The old template logic tested
 * `hiddenInitiative == 0` for "not ready", which is false for `undefined` — so
 * neither the `ready` nor `not-ready` class ever applied, and the eye-icon badge
 * fell through to its bare, background-less default no matter what `.not-ready`
 * was styled with. `isInitiativeReady` and its exact negation must cover every
 * value the field can hold: unset, 0, and a real submitted number.
 */
describe('CreatureGroupHeaderComponent.isInitiativeReady', () => {
  // isInitiativeReady only reads initiative fields, so a bare object stands in for
  // a full Creature without dragging in AppContext or its dependencies.
  const component = new CreatureGroupHeaderComponent(null as any, null as any, null as any, null as any, null as any);

  const hero = (over: Partial<Creature> = {}): Creature => ({
    id: 'h', type: 'drifter', aggressive: false, ...over,
  });

  it('is not ready for a freshly-added hero whose initiative fields are unset', () => {
    const creature = hero(); // hiddenInitiative/initiative both undefined
    expect(component.isInitiativeReady(creature)).toBe(false);
  });

  it('is not ready for a hero reset to the normal empty state (0, not undefined)', () => {
    const creature = hero({ hiddenInitiative: 0, secondaryHiddenInitiative: 0 });
    expect(component.isInitiativeReady(creature)).toBe(false);
  });

  it('is ready once both cards are submitted', () => {
    const creature = hero({ hiddenInitiative: 30, secondaryHiddenInitiative: 40 });
    expect(component.isInitiativeReady(creature)).toBe(true);
  });

  it('is ready once initiative is revealed', () => {
    const creature = hero({ initiative: 30, secondaryInitiative: 40, hiddenInitiative: 0 });
    expect(component.isInitiativeReady(creature)).toBe(true);
  });

  it('is never both ready and not-ready, or neither, for any of these states', () => {
    const cases = [
      hero(),
      hero({ hiddenInitiative: 0, secondaryHiddenInitiative: 0 }),
      hero({ hiddenInitiative: 30 }), // partial — only one card in
      hero({ hiddenInitiative: 30, secondaryHiddenInitiative: 40 }),
      hero({ initiative: 30, secondaryInitiative: 40 }),
    ];
    for (const creature of cases) {
      const ready = component.isInitiativeReady(creature);
      const notReady = !component.isInitiativeReady(creature);
      expect(ready).toBe(!notReady);
    }
  });
});
