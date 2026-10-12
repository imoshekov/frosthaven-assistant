import { isHiddenLogEntry } from './log.service';

/**
 * Which journal rows are bookkeeping and which are moves.
 *
 * The turn-state fields are both: `resetCreaturesForNewRound()` clears all three on
 * every hero at once (three rows per hero, per round, saying nothing), while the very
 * same fields record real moves when they are *set* — a half played or skipped, and
 * "End turn early". Hiding them by field name alone threw the moves away with the
 * noise, so the filter reads the new value too.
 */
describe('isHiddenLogEntry', () => {
  describe('always-hidden card bookkeeping', () => {
    it('hides slot and card-id fields whatever they hold', () => {
      expect(isHiddenLogEntry({ stat: 'cardAId', value: 314 })).toBe(true);
      expect(isHiddenLogEntry({ stat: 'cardBId', value: null })).toBe(true);
      expect(isHiddenLogEntry({ stat: 'topHalfSlot', value: 'A' })).toBe(true);
      expect(isHiddenLogEntry({ stat: 'bottomHalfSlot', value: null })).toBe(true);
      expect(isHiddenLogEntry({ stat: 'secondaryInitiative', value: 42 })).toBe(true);
    });
  });

  describe('turn state cleared — the round advance', () => {
    it('hides the halves being cleared', () => {
      expect(isHiddenLogEntry({ stat: 'topHalfState', value: null })).toBe(true);
      expect(isHiddenLogEntry({ stat: 'bottomHalfState', value: null })).toBe(true);
    });

    it('hides the turn being reopened for the new round', () => {
      expect(isHiddenLogEntry({ stat: 'isTurnCompleted', value: false })).toBe(true);
    });
  });

  describe('turn state set — a real move', () => {
    it('shows "End turn early"', () => {
      expect(isHiddenLogEntry({ stat: 'isTurnCompleted', value: true })).toBe(false);
    });

    it('shows a half being executed or skipped', () => {
      expect(isHiddenLogEntry({ stat: 'topHalfState', value: 'executed' })).toBe(false);
      expect(isHiddenLogEntry({ stat: 'bottomHalfState', value: 'skipped' })).toBe(false);
    });
  });

  it('shows everything else', () => {
    expect(isHiddenLogEntry({ stat: 'hp', value: 4 })).toBe(false);
    expect(isHiddenLogEntry({ stat: 'hp', value: 0 })).toBe(false);
    expect(isHiddenLogEntry({ stat: 'conditions', value: [] })).toBe(false);
    expect(isHiddenLogEntry({ stat: 'initiative', value: 0 })).toBe(false);
  });
});
