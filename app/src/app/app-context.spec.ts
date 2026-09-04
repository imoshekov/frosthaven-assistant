import { TestBed } from '@angular/core/testing';
import { AppContext } from './app-context';
import { DataLoaderService } from './services/data-loader.service';
import { CreatureFactoryService } from './services/creature-factory.service';
import { LogService } from './services/log.service';
import { NotificationService } from './services/notification.service';
import { DbService } from './services/db.service';
import { XpService } from './services/xp.service';
import { CharacterDeckService } from './services/character-deck.service';
import { Creature } from './types/game-types';

/**
 * Covers round-reset behaviour. The constructor kicks off an async default-party
 * load from Supabase (via DbService), so that is stubbed to resolve to an empty
 * list — tests seed their own creatures directly through setCreatures() instead.
 */
describe('AppContext.resetCreaturesForNewRound', () => {
  let appContext: AppContext;

  const hero = (over: Partial<Creature> = {}): Creature => ({
    id: 'h', type: 'drifter', aggressive: false, level: 1, hp: 10, maxHp: 10,
    initiative: 0, hiddenInitiative: 0, secondaryInitiative: 0, secondaryHiddenInitiative: 0,
    ...over,
  });

  const monster = (over: Partial<Creature> = {}): Creature => ({
    id: 'm', type: 'algox-guard', aggressive: true, hp: 0, maxHp: 10,
    initiative: 0, hiddenInitiative: null,
    ...over,
  });

  /**
   * A second hero who has not submitted anything, so revealIfAllReady() (which
   * subscribes to every creatures$ emission) does not auto-reveal the party the
   * moment the downed hero's hidden initiatives are auto-filled — letting tests
   * inspect the pre-reveal hidden state instead of racing straight past it.
   */
  const pendingCompanion = (): Creature => hero({ id: 'pending', hp: 8 });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AppContext,
        { provide: DataLoaderService, useValue: { getData: () => ({ characters: [] }) } },
        { provide: CreatureFactoryService, useValue: {} },
        { provide: LogService, useValue: { init: () => { } } },
        { provide: NotificationService, useValue: { emitErrorMessage: () => { }, emitInfoMessage: () => { } } },
        { provide: DbService, useValue: { getCharacter: () => Promise.resolve([]) } },
        { provide: XpService, useValue: { levelFromXp: () => 1 } },
        { provide: CharacterDeckService, useValue: { loadDeck: () => Promise.resolve(null), resolve: () => [] } },
      ],
    });
    appContext = TestBed.inject(AppContext);
  });

  it('gives a downed hero (0 HP) both hidden initiatives at 99', () => {
    appContext.setCreatures([hero({ hp: 0 }), pendingCompanion()]);
    appContext.resetCreaturesForNewRound();

    const reset = appContext.getCreatures().find(c => c.id === 'h')!;
    expect(reset.hiddenInitiative).toBe(99);
    expect(reset.secondaryHiddenInitiative).toBe(99);
  });

  it('treats negative HP the same as 0', () => {
    appContext.setCreatures([hero({ hp: -3 }), pendingCompanion()]);
    appContext.resetCreaturesForNewRound();

    const reset = appContext.getCreatures().find(c => c.id === 'h')!;
    expect(reset.hiddenInitiative).toBe(99);
    expect(reset.secondaryHiddenInitiative).toBe(99);
  });

  it('resets a healthy hero to the normal empty state, not 99', () => {
    appContext.setCreatures([hero({ hp: 8 })]);
    appContext.resetCreaturesForNewRound();

    const reset = appContext.getCreatures()[0];
    expect(reset.hiddenInitiative).toBe(0);
    expect(reset.secondaryHiddenInitiative).toBe(0);
  });

  it('never applies the 0-HP rule to monsters', () => {
    appContext.setCreatures([monster({ hp: 0 })]);
    appContext.resetCreaturesForNewRound();

    const reset = appContext.getCreatures()[0];
    expect(reset.hiddenInitiative).toBeNull();
  });

  it('a downed hero does not block reveal once the rest of the party submits', () => {
    appContext.setCreatures([
      hero({ id: 'down', hp: 0 }),
      hero({ id: 'alive', hp: 5 }),
    ]);
    appContext.resetCreaturesForNewRound();

    // Only the still-alive hero needs to actually submit anything.
    appContext.updateCreatureMultipleStats('alive', {
      hiddenInitiative: 30,
      secondaryHiddenInitiative: 40,
    });

    const creatures = appContext.getCreatures();
    // Both heroes reveal together: the downed one lands on the 99 it was auto-filled with.
    expect(creatures.find(c => c.id === 'down')!.initiative).toBe(99);
    expect(creatures.find(c => c.id === 'alive')!.initiative).toBe(30);
    expect(creatures.every(c => !(c.hiddenInitiative! > 0))).toBe(true);
  });

  it('promotes the auto-filled 99 to the public initiative on reveal', () => {
    // A lone downed hero already counts as "submitted" by themselves, so this reveals
    // immediately — resetCreaturesForNewRound() subscribes reveal to every emission.
    appContext.setCreatures([hero({ hp: 0 })]);
    appContext.resetCreaturesForNewRound();

    const reset = appContext.getCreatures()[0];
    expect(reset.initiative).toBe(99);
    expect(reset.secondaryInitiative).toBe(99);
    expect(reset.hiddenInitiative).toBe(0);
  });

  it('auto-completes a downed hero turn on reveal, the same as any other long rest', () => {
    appContext.setCreatures([hero({ hp: 0 })]);
    appContext.resetCreaturesForNewRound();

    const reset = appContext.getCreatures()[0];
    expect(reset.topHalfState).toBe('skipped');
    expect(reset.bottomHalfState).toBe('skipped');
    expect(reset.isTurnCompleted).toBe(true);
  });
});

/**
 * `longRest()` is now driven from the initiative bubble, pre-reveal — it submits the
 * long-rest sentinel as a normal hidden-initiative pair rather than jumping the hero
 * straight to "revealed" on its own, which used to lock out anyone else still
 * mid-submission for the round.
 */
describe('AppContext.longRest', () => {
  let appContext: AppContext;

  const hero = (over: Partial<Creature> = {}): Creature => ({
    id: 'h', type: 'drifter', aggressive: false, level: 1, hp: 10, maxHp: 10,
    initiative: 0, hiddenInitiative: 0, secondaryInitiative: 0, secondaryHiddenInitiative: 0,
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
        { provide: XpService, useValue: { levelFromXp: () => 1 } },
        { provide: CharacterDeckService, useValue: { loadDeck: () => Promise.resolve(null), resolve: () => [] } },
      ],
    });
    appContext = TestBed.inject(AppContext);
  });

  it('submits the sentinel as a hidden pair rather than revealing on its own', () => {
    appContext.setCreatures([hero({ id: 'resting' }), hero({ id: 'still-deciding' })]);
    appContext.longRest('resting');

    const resting = appContext.getCreatures().find(c => c.id === 'resting')!;
    expect(resting.hiddenInitiative).toBe(99);
    expect(resting.secondaryHiddenInitiative).toBe(99);
    // Not revealed yet — the other hero hasn't submitted, so reveal hasn't fired.
    expect(resting.initiative).toBe(0);
  });

  it('finalizes the turn once the whole party reveals together', () => {
    appContext.setCreatures([hero({ id: 'resting' }), hero({ id: 'active' })]);
    appContext.longRest('resting');
    appContext.updateCreatureMultipleStats('active', {
      hiddenInitiative: 30,
      secondaryHiddenInitiative: 40,
    });

    const resting = appContext.getCreatures().find(c => c.id === 'resting')!;
    expect(resting.initiative).toBe(99);
    expect(resting.topHalfState).toBe('skipped');
    expect(resting.bottomHalfState).toBe('skipped');
    expect(resting.isTurnCompleted).toBe(true);

    // The rest of the party plays out normally — long rest doesn't touch them.
    const active = appContext.getCreatures().find(c => c.id === 'active')!;
    expect(active.initiative).toBe(30);
    expect(active.isTurnCompleted).toBeFalsy();
  });
});
