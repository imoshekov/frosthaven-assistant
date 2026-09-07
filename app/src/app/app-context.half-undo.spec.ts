import { TestBed } from '@angular/core/testing';
import { AppContext, HalfExecution } from './app-context';
import { DataLoaderService } from './services/data-loader.service';
import { CreatureFactoryService } from './services/creature-factory.service';
import { LogService } from './services/log.service';
import { NotificationService } from './services/notification.service';
import { DbService } from './services/db.service';
import { XpService } from './services/xp.service';
import { CharacterDeckService } from './services/character-deck.service';
import { Creature, CreatureConditions } from './types/game-types';

/**
 * Undoing a card half puts back everything it applied, not just the spent flag on the
 * tile: each target's HP, the conditions *that half* inflicted, anything it killed,
 * the hero's XP and round-long shield/retaliate, and the damage/kills it was credited
 * with on the Stats screen.
 *
 * What's reversed is what actually landed — a value adjusted through the attack
 * modal's "Custom…" is recorded the same way the printed one is, because the panel
 * records the effect, not the card.
 */
describe('AppContext card-half undo', () => {
  let appContext: AppContext;

  const hero = (over: Partial<Creature> = {}): Creature => ({
    id: 'hero', type: 'drifter', aggressive: false, level: 2, hp: 10, maxHp: 10,
    initiative: 0, hiddenInitiative: 0, secondaryInitiative: 0, secondaryHiddenInitiative: 0,
    totalXp: 10, sessionExperience: 4, roundArmor: 0, roundRetaliate: 0,
    topHalfState: 'executed', topHalfSlot: 'A',
    ...over,
  });

  const mob = (over: Partial<Creature> = {}): Creature => ({
    id: 'mob', type: 'algox-guard', aggressive: true, hp: 12, maxHp: 20, conditions: [],
    ...over,
  });

  /** A half that hit `mob` for 8, poisoned it, and earned the hero 2 XP. */
  const execution = (over: Partial<HalfExecution> = {}): HalfExecution => ({
    targets: [{ creatureId: 'mob', hpBefore: 20, addedConditions: [CreatureConditions.poison], removedConditions: [], killed: false }],
    damageCredited: 8,
    killsCredited: 0,
    xpGained: 2,
    shieldGained: 0,
    retaliateGained: 0,
    retaliateSuffered: 0,
    selfHealGained: 0,
    selfConditionsGained: [],
    selfDamageSuffered: 0,
    selfHealConditionsRemoved: [],
    ...over,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AppContext,
        { provide: DataLoaderService, useValue: { getData: () => ({ characters: [] }) } },
        { provide: CreatureFactoryService, useValue: {} },
        { provide: LogService, useValue: { init: () => { } } },
        { provide: NotificationService, useValue: { emitErrorMessage: () => { }, emitInfoMessage: () => { } } },
        { provide: DbService, useValue: { getCharacter: () => Promise.resolve([]) } },
        // Mirrors the real curve closely enough to prove the level is recomputed.
        { provide: XpService, useValue: { levelFromXp: (xp: number) => (xp >= 10 ? 2 : 1) } },
        { provide: CharacterDeckService, useValue: { loadDeck: () => Promise.resolve(null), resolve: () => [] } },
      ],
    });
    appContext = TestBed.inject(AppContext);
  });

  const creature = (id: string) => appContext.getCreatures().find(c => c.id === id);

  describe('target damage and conditions', () => {
    beforeEach(() => {
      appContext.setCreatures([hero(), mob({ hp: 12, conditions: [CreatureConditions.poison] })]);
      appContext.recordDamage('drifter', 8);
      appContext.recordHalfExecution('hero', 'top', execution());
    });

    it('restores the HP the target had before the half', () => {
      appContext.undoCardHalf('hero', 'top');
      expect(creature('mob')!.hp).toBe(20);
    });

    it('removes the condition the half inflicted', () => {
      appContext.undoCardHalf('hero', 'top');
      expect(creature('mob')!.conditions).toEqual([]);
    });

    it('leaves a condition somebody else inflicted alone', () => {
      // Wound was already on the target; only poison came from this half.
      appContext.setCreatures([hero(), mob({ hp: 12, conditions: [CreatureConditions.wound, CreatureConditions.poison] })]);
      appContext.undoCardHalf('hero', 'top');

      expect(creature('mob')!.conditions).toEqual([CreatureConditions.wound]);
    });

    it('still un-grays the half, as it always did', () => {
      appContext.undoCardHalf('hero', 'top');

      expect(creature('hero')!.topHalfState).toBeNull();
      expect(creature('hero')!.topHalfSlot).toBeNull();
      expect(creature('hero')!.isTurnCompleted).toBe(false);
    });
  });

  /**
   * HP the half charged its own player — a `sufferDamage` cost, or a
   * `sufferDamageBonus` the player chose to pay. Given back, not reset to a remembered
   * value: something else may have hurt or healed the hero since, and only this half's
   * share belongs to this undo.
   */
  describe('self-damage the half charged', () => {
    it('gives the HP back', () => {
      appContext.setCreatures([hero({ hp: 8 }), mob()]);
      appContext.recordHalfExecution('hero', 'top', execution({ selfDamageSuffered: 2 }));

      appContext.undoCardHalf('hero', 'top');
      expect(creature('hero')!.hp).toBe(10);
    });

    it('gives back only its own share, leaving later damage alone', () => {
      // Cost 2, then something else hit the hero for 3: 10 → 8 → 5.
      appContext.setCreatures([hero({ hp: 5 }), mob()]);
      appContext.recordHalfExecution('hero', 'top', execution({ selfDamageSuffered: 2 }));

      appContext.undoCardHalf('hero', 'top');
      expect(creature('hero')!.hp).toBe(7);
    });

    it('adds to retaliate rather than replacing it', () => {
      // 10 − 2 cost − 3 retaliate = 5, and undoing restores both.
      appContext.setCreatures([hero({ hp: 5 }), mob()]);
      appContext.recordHalfExecution('hero', 'top', execution({
        selfDamageSuffered: 2, retaliateSuffered: 3,
      }));

      appContext.undoCardHalf('hero', 'top');
      expect(creature('hero')!.hp).toBe(10);
    });

    it('never gives back more than the hero can hold', () => {
      appContext.setCreatures([hero({ hp: 9 }), mob()]);
      appContext.recordHalfExecution('hero', 'top', execution({ selfDamageSuffered: 4 }));

      appContext.undoCardHalf('hero', 'top');
      expect(creature('hero')!.hp).toBe(10);
    });

    it('accumulates across the strikes of one half', () => {
      appContext.setCreatures([hero({ hp: 7 }), mob()]);
      appContext.recordHalfExecution('hero', 'top', execution({ selfDamageSuffered: 1 }));
      appContext.recordHalfExecution('hero', 'top', execution({ selfDamageSuffered: 2 }));

      appContext.undoCardHalf('hero', 'top');
      expect(creature('hero')!.hp).toBe(10);
    });

    it('leaves the hero alone when the half cost nothing', () => {
      appContext.setCreatures([hero({ hp: 6 }), mob()]);
      appContext.recordHalfExecution('hero', 'top', execution());

      appContext.undoCardHalf('hero', 'top');
      expect(creature('hero')!.hp).toBe(6);
    });
  });

  describe('the Stats screen', () => {
    it('gives back the damage the half was credited with', () => {
      appContext.setCreatures([hero(), mob()]);
      appContext.recordDamage('drifter', 8);
      appContext.recordHalfExecution('hero', 'top', execution());

      expect(appContext.getDamageTracker()['drifter']).toBe(8);
      appContext.undoCardHalf('hero', 'top');
      expect(appContext.getDamageTracker()['drifter']).toBe(0);
    });

    it('leaves damage from other sources intact', () => {
      appContext.setCreatures([hero(), mob()]);
      appContext.recordDamage('drifter', 5);  // an earlier, unrelated attack
      appContext.recordDamage('drifter', 8);  // this half
      appContext.recordHalfExecution('hero', 'top', execution());

      appContext.undoCardHalf('hero', 'top');
      expect(appContext.getDamageTracker()['drifter']).toBe(5);
    });

    it('gives back each kill it was credited with', () => {
      appContext.setCreatures([hero(), mob()]);
      appContext.recordKill('drifter');
      appContext.recordKill('drifter');
      appContext.recordHalfExecution('hero', 'top', execution({ killsCredited: 2 }));

      appContext.undoCardHalf('hero', 'top');
      expect(appContext.getKillTracker()['drifter']).toBe(0);
    });
  });

  describe('a target the half killed', () => {
    beforeEach(() => {
      appContext.setCreatures([hero(), mob({ hp: 3 })]);
      appContext.recordDamage('drifter', 3);
      appContext.recordKill('drifter');
      appContext.killCreature('mob');
      appContext.recordHalfExecution('hero', 'top', execution({
        targets: [{ creatureId: 'mob', hpBefore: 3, addedConditions: [], removedConditions: [], killed: true }],
        damageCredited: 3,
        killsCredited: 1,
      }));
    });

    it('brings it back with the HP it had before', () => {
      expect(creature('mob')).toBeUndefined(); // in the graveyard

      appContext.undoCardHalf('hero', 'top');

      expect(creature('mob')).toBeTruthy();
      expect(creature('mob')!.hp).toBe(3);
    });

    it('gives back its kill and damage on the Stats screen', () => {
      appContext.undoCardHalf('hero', 'top');
      expect(appContext.getKillTracker()['drifter']).toBe(0);
      expect(appContext.getDamageTracker()['drifter']).toBe(0);
    });
  });

  describe('hero-side effects', () => {
    it('takes back the XP, and the level it bought', () => {
      appContext.setCreatures([hero({ totalXp: 10, sessionExperience: 4, level: 2 }), mob()]);
      appContext.recordHalfExecution('hero', 'top', execution({ xpGained: 2 }));

      appContext.undoCardHalf('hero', 'top');

      const h = creature('hero')!;
      expect(h.totalXp).toBe(8);
      expect(h.sessionExperience).toBe(2);
      expect(h.level).toBe(1); // 8 XP is back below the level-2 threshold
    });

    it('takes back a round-long shield and retaliate', () => {
      appContext.setCreatures([hero({ roundArmor: 3, roundRetaliate: 2 }), mob()]);
      appContext.recordHalfExecution('hero', 'top', execution({
        xpGained: 0, shieldGained: 2, retaliateGained: 1,
      }));

      appContext.undoCardHalf('hero', 'top');

      expect(creature('hero')!.roundArmor).toBe(1);   // the other 1 came from elsewhere
      expect(creature('hero')!.roundRetaliate).toBe(1);
    });

    it('gives back shield a bonus removed — a negative shieldGained', () => {
      // A "remove 1 shield" bonus with no printed shield of its own left roundArmor
      // where it was minus 1, floored at 0. Undo has to raise it back by that 1.
      appContext.setCreatures([hero({ roundArmor: 0 }), mob()]);
      appContext.recordHalfExecution('hero', 'top', execution({
        xpGained: 0, shieldGained: -1,
      }));

      appContext.undoCardHalf('hero', 'top');

      expect(creature('hero')!.roundArmor).toBe(1);
    });
  });

  describe('wound/poison a selfOnly heal removed', () => {
    it('gives the poison back, along with the HP it never actually granted', () => {
      appContext.setCreatures([hero({ hp: 4, conditions: [] }), mob()]);
      appContext.recordHalfExecution('hero', 'top', execution({
        xpGained: 0, selfHealGained: 0,
        selfHealConditionsRemoved: [CreatureConditions.poison],
      }));

      appContext.undoCardHalf('hero', 'top');

      // Poison blocked the heal, so selfHealGained was 0 — nothing to give back on
      // the HP side, but the condition itself has to come back.
      expect(creature('hero')!.hp).toBe(4);
      expect(creature('hero')!.conditions).toEqual([CreatureConditions.poison]);
    });

    it('gives the wound back, along with the HP the heal did grant', () => {
      appContext.setCreatures([hero({ hp: 9, conditions: [] }), mob()]);
      appContext.recordHalfExecution('hero', 'top', execution({
        xpGained: 0, selfHealGained: 5,
        selfHealConditionsRemoved: [CreatureConditions.wound],
      }));

      appContext.undoCardHalf('hero', 'top');

      expect(creature('hero')!.hp).toBe(4);   // 9 - 5 given back
      expect(creature('hero')!.conditions).toEqual([CreatureConditions.wound]);
    });

    it('does not clobber a selfOnly condition the same half also applied', () => {
      appContext.setCreatures([hero({ hp: 9, conditions: [CreatureConditions.strengthen] }), mob()]);
      appContext.recordHalfExecution('hero', 'top', execution({
        xpGained: 0, selfHealGained: 5,
        selfConditionsGained: [CreatureConditions.strengthen],
        selfHealConditionsRemoved: [CreatureConditions.wound],
      }));

      appContext.undoCardHalf('hero', 'top');

      // strengthen (gained by the half) comes off; wound (removed by the heal) comes
      // back — the two operate on the same conditions array without stepping on each
      // other.
      expect(creature('hero')!.conditions).toEqual([CreatureConditions.wound]);
    });
  });

  describe('accumulating across a half strikes', () => {
    it('restores the HP from before the *first* strike on a target hit twice', () => {
      appContext.setCreatures([hero(), mob({ hp: 12 })]);

      // Two strikes of one multi-attack half, 4 damage each.
      appContext.recordHalfExecution('hero', 'top', execution({
        targets: [{ creatureId: 'mob', hpBefore: 20, addedConditions: [CreatureConditions.poison], removedConditions: [], killed: false }],
        damageCredited: 4, xpGained: 0,
      }));
      appContext.recordHalfExecution('hero', 'top', execution({
        targets: [{ creatureId: 'mob', hpBefore: 16, addedConditions: [CreatureConditions.wound], removedConditions: [], killed: false }],
        damageCredited: 4, xpGained: 0,
      }));
      appContext.recordDamage('drifter', 8);

      appContext.undoCardHalf('hero', 'top');

      expect(creature('mob')!.hp).toBe(20);
      expect(appContext.getDamageTracker()['drifter']).toBe(0);
    });

    it('records both strikes targets when they hit different enemies', () => {
      appContext.setCreatures([hero(), mob({ id: 'a', hp: 5 }), mob({ id: 'b', hp: 6 })]);
      appContext.recordHalfExecution('hero', 'top', execution({
        targets: [{ creatureId: 'a', hpBefore: 9, addedConditions: [], removedConditions: [], killed: false }], xpGained: 0, damageCredited: 4,
      }));
      appContext.recordHalfExecution('hero', 'top', execution({
        targets: [{ creatureId: 'b', hpBefore: 10, addedConditions: [], removedConditions: [], killed: false }], xpGained: 0, damageCredited: 4,
      }));

      appContext.undoCardHalf('hero', 'top');

      expect(creature('a')!.hp).toBe(9);
      expect(creature('b')!.hp).toBe(10);
    });
  });

  describe('nothing recorded', () => {
    it('un-grays a skipped half without touching anything else', () => {
      appContext.setCreatures([hero({ topHalfState: 'skipped' }), mob({ hp: 12 })]);
      appContext.undoCardHalf('hero', 'top');

      expect(creature('hero')!.topHalfState).toBeNull();
      expect(creature('mob')!.hp).toBe(12); // untouched
    });

    it('forgets a half execution once it has been undone, so a second undo is inert', () => {
      appContext.setCreatures([hero(), mob({ hp: 12 })]);
      appContext.recordDamage('drifter', 8);
      appContext.recordHalfExecution('hero', 'top', execution());

      appContext.undoCardHalf('hero', 'top');
      appContext.undoCardHalf('hero', 'top'); // no double refund

      expect(creature('mob')!.hp).toBe(20);
      expect(appContext.getDamageTracker()['drifter']).toBe(0);
      expect(appContext.getHalfExecution('hero', 'top')).toBeNull();
    });

    it('keeps what already landed when a part-resolved half is skipped', () => {
      // Skip is offered while the half is unspent, which includes a multi-target
      // attack part-way through its targets — those strikes have to stay undoable.
      appContext.setCreatures([hero({ topHalfState: null }), mob({ hp: 12 })]);
      appContext.recordDamage('drifter', 8);
      appContext.recordHalfExecution('hero', 'top', execution());

      appContext.skipCardHalf('hero', 'top', null);
      expect(appContext.getHalfExecution('hero', 'top')).toBeTruthy();

      appContext.undoCardHalf('hero', 'top');
      expect(creature('mob')!.hp).toBe(20);
      expect(appContext.getDamageTracker()['drifter']).toBe(0);
    });

    it('drops everything on a new round: last round is history, not undoable', () => {
      appContext.setCreatures([hero(), mob()]);
      appContext.recordHalfExecution('hero', 'top', execution());

      appContext.resetCreaturesForNewRound();

      expect(appContext.getHalfExecution('hero', 'top')).toBeNull();
    });
  });

  describe('the two halves are tracked apart', () => {
    it('undoing the top half leaves the bottom half effects in place', () => {
      appContext.setCreatures([hero({ bottomHalfState: 'executed' }), mob({ hp: 6 })]);
      appContext.recordHalfExecution('hero', 'top', execution({
        targets: [{ creatureId: 'mob', hpBefore: 12, addedConditions: [], removedConditions: [], killed: false }], xpGained: 0, damageCredited: 6,
      }));
      appContext.recordHalfExecution('hero', 'bottom', execution({
        targets: [{ creatureId: 'mob', hpBefore: 20, addedConditions: [], removedConditions: [], killed: false }], xpGained: 0, damageCredited: 8,
      }));
      appContext.recordDamage('drifter', 14);

      appContext.undoCardHalf('hero', 'top');

      expect(creature('mob')!.hp).toBe(12);                          // top's damage back
      expect(appContext.getDamageTracker()['drifter']).toBe(8);      // bottom's still counted
      expect(appContext.getHalfExecution('hero', 'bottom')).toBeTruthy();
      expect(creature('hero')!.bottomHalfState).toBe('executed');
    });
  });
});
