import { TestBed } from '@angular/core/testing';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { DamageService } from '../../../services/damage.service';
import { DataLoaderService } from '../../../services/data-loader.service';
import { CreatureFactoryService } from '../../../services/creature-factory.service';
import { LogService } from '../../../services/log.service';
import { NotificationService } from '../../../services/notification.service';
import { DbService } from '../../../services/db.service';
import { XpService } from '../../../services/xp.service';
import { Creature, CreatureConditions } from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * Rulebook behaviour the panel has to get right when it executes a strike, run
 * against the real AppContext and the real damage maths:
 *
 * - poison raises the attack value, so shield is subtracted from the poisoned total;
 * - ward and brittle modify one instance of damage and then come off the target;
 * - a target's retaliate comes back at the hero, provoked by the attack rather than
 *   by the damage — and Undo gives all three back.
 */
describe('PlayerCardExecutionPanelComponent rulebook behaviour', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let appContext: AppContext;

  const strike: CharacterAbilityCard = {
    cardId: 810, name: 'Strike', level: 1, initiative: 20,
    top: { actions: [{ type: 'attack', value: 4 }] },
    bottom: { actions: [{ type: 'heal', value: 2 }] },
  };

  const sweep: CharacterAbilityCard = {
    cardId: 811, name: 'Sweep', level: 1, initiative: 21,
    top: { actions: [{ type: 'attack', value: 4, multiTarget: true }] },
    bottom: { actions: [] },
  };

  const deck: CharacterDeck = {
    characterClass: 'drifter', edition: 'fh', cards: [strike, sweep],
  };

  const hero = (): Creature => ({
    id: 'hero', type: 'drifter', aggressive: false, level: 1,
    initiative: 20, secondaryInitiative: 0, cardAId: 810, cardBId: null,
    hp: 10, maxHp: 10, totalXp: 0, sessionExperience: 0, roundArmor: 0, roundRetaliate: 0,
  });

  const mob = (over: Partial<Creature> = {}): Creature => ({
    id: 'mob', type: 'algox-guard', aggressive: true, hp: 20, maxHp: 20, conditions: [], ...over,
  });

  beforeEach(() => {
    const deckServiceStub: Partial<CharacterDeckService> = {
      loadDeck: () => Promise.resolve(deck),
      getLoadedDeck: () => deck,
      resolve: () => [],
      cardById: (id) => deck.cards.find(c => c.cardId === id) ?? null,
      hasPackedInitiatives: () => false,
    };

    TestBed.configureTestingModule({
      imports: [PlayerCardExecutionPanelComponent],
      providers: [
        AppContext,
        DamageService,
        { provide: CharacterDeckService, useValue: deckServiceStub },
        { provide: DataLoaderService, useValue: { getData: () => ({ characters: [] }) } },
        { provide: CreatureFactoryService, useValue: {} },
        {
          provide: LogService,
          useValue: { init: () => { }, appendDamageToLastBatch: () => { }, appendKillToLastBatch: () => { } },
        },
        { provide: NotificationService, useValue: { emitErrorMessage: () => { }, emitInfoMessage: () => { } } },
        { provide: DbService, useValue: { getCharacter: () => Promise.resolve([]) } },
        { provide: XpService, useValue: { levelFromXp: () => 1 } },
      ],
    });

    appContext = TestBed.inject(AppContext);
    appContext.cardPanelCreatureId = 'hero';
    panel = TestBed.createComponent(PlayerCardExecutionPanelComponent).componentInstance;
  });

  const creature = (id: string) => appContext.getCreatures().find(c => c.id === id);
  const topTile = () => panel.tiles.find(t => t.source === 'A' && t.half === 'top')!;

  /** Sets the board up and selects the top half of whichever card the hero is on. */
  const board = (target: Partial<Creature>, cardId = 810) => {
    appContext.setCreatures([{ ...hero(), cardAId: cardId }, mob(target)]);
    panel.selectTile(topTile());
  };

  const strikeAt = (id: string, modifier: Parameters<typeof panel.setModifier>[0] = 0) => {
    panel.selectTarget(id);
    panel.setModifier(modifier);
    panel.execute();
  };

  describe('poison raises the attack value', () => {
    it('gets through a shield that would block the printed attack exactly', () => {
      board({ armor: 4, conditions: [CreatureConditions.poison] });
      strikeAt('mob');

      // (4 + 1 poison) − 4 shield. Adding poison after the shield lost it entirely.
      expect(creature('mob')!.hp).toBe(19);
    });

    it('is doubled by a x2 along with the rest of the attack', () => {
      board({ conditions: [CreatureConditions.poison] });
      strikeAt('mob', 'x2');

      expect(creature('mob')!.hp).toBe(20 - 10); // (4 + 1) × 2
    });

    it('stays on the target — it is not used up by the attack', () => {
      board({ conditions: [CreatureConditions.poison] });
      strikeAt('mob');

      expect(creature('mob')!.conditions).toEqual([CreatureConditions.poison]);
    });
  });

  describe('ward and brittle are used up', () => {
    it('halves the damage once, then comes off the target', () => {
      board({ conditions: [CreatureConditions.ward] });
      strikeAt('mob');

      expect(creature('mob')!.hp).toBe(20 - 2);
      expect(creature('mob')!.conditions).toEqual([]);
    });

    it('doubles the damage once, then comes off the target', () => {
      board({ conditions: [CreatureConditions.brittle] });
      strikeAt('mob');

      expect(creature('mob')!.hp).toBe(20 - 8);
      expect(creature('mob')!.conditions).toEqual([]);
    });

    it('removes both when they cancel each other out', () => {
      board({ conditions: [CreatureConditions.brittle, CreatureConditions.ward] });
      strikeAt('mob');

      expect(creature('mob')!.hp).toBe(20 - 4);
      expect(creature('mob')!.conditions).toEqual([]);
    });

    it('leaves every other condition in place', () => {
      board({ conditions: [CreatureConditions.wound, CreatureConditions.ward] });
      strikeAt('mob');

      expect(creature('mob')!.conditions).toEqual([CreatureConditions.wound]);
    });

    it('keeps the ward when the attack misses — no damage, nothing to halve', () => {
      board({ conditions: [CreatureConditions.ward] });
      strikeAt('mob', 'miss');

      expect(creature('mob')!.hp).toBe(20);
      expect(creature('mob')!.conditions).toEqual([CreatureConditions.ward]);
    });

    it('keeps the ward when shield blocks the attack outright', () => {
      board({ armor: 6, conditions: [CreatureConditions.ward] });
      strikeAt('mob');

      expect(creature('mob')!.conditions).toEqual([CreatureConditions.ward]);
    });

    it('is only spent by the first of two strikes', () => {
      appContext.setCreatures([
        { ...hero(), cardAId: 811 },
        mob({ conditions: [CreatureConditions.brittle] }),
        mob({ id: 'mob2' }),
      ]);
      panel.selectTile(topTile());

      strikeAt('mob');
      expect(creature('mob')!.hp).toBe(20 - 8); // doubled
      expect(creature('mob')!.conditions).toEqual([]);

      strikeAt('mob2');
      expect(creature('mob2')!.hp).toBe(20 - 4); // and the next target is unaffected
    });

    it('gives the ward back on Undo', () => {
      board({ conditions: [CreatureConditions.ward] });
      strikeAt('mob');
      panel.undoHalf(topTile());

      expect(creature('mob')!.hp).toBe(20);
      expect(creature('mob')!.conditions).toEqual([CreatureConditions.ward]);
    });

    it('gives both back on Undo when they cancelled', () => {
      board({ conditions: [CreatureConditions.brittle, CreatureConditions.ward] });
      strikeAt('mob');
      panel.undoHalf(topTile());

      expect(creature('mob')!.conditions).toEqual(
        [CreatureConditions.brittle, CreatureConditions.ward]
      );
    });
  });

  describe('retaliate comes back at the hero', () => {
    it('costs the hero the target\'s retaliate', () => {
      board({ retaliate: 2 });
      strikeAt('mob');

      expect(creature('hero')!.hp).toBe(10 - 2);
    });

    it('adds a round-long retaliate on top of the printed one', () => {
      board({ retaliate: 2, roundRetaliate: 1 });
      strikeAt('mob');

      expect(creature('hero')!.hp).toBe(10 - 3);
    });

    it('fires on a miss too — the attack is what provokes it', () => {
      board({ retaliate: 2 });
      strikeAt('mob', 'miss');

      expect(creature('mob')!.hp).toBe(20);
      expect(creature('hero')!.hp).toBe(10 - 2);
    });

    it('fires when shield blocks the attack outright', () => {
      board({ retaliate: 2, armor: 9 });
      strikeAt('mob');

      expect(creature('hero')!.hp).toBe(10 - 2);
    });

    it('is offered with the total and can be switched off when out of range', () => {
      board({ retaliate: 2 });
      panel.selectTarget('mob');
      expect(panel.retaliateTotal).toBe(2);

      panel.toggleRetaliate();
      panel.setModifier(0);
      panel.execute();

      expect(creature('hero')!.hp).toBe(10);
    });

    it('is not offered by a half that only heals', () => {
      appContext.setCreatures([hero(), mob({ retaliate: 2 })]);
      panel.selectTile(panel.tiles.find(t => t.source === 'A' && t.half === 'bottom')!);

      expect(panel.retaliateTotal).toBe(0);
    });

    it('is not offered before a target is picked', () => {
      board({ retaliate: 2 });
      expect(panel.retaliateTotal).toBe(0);
    });

    it('is dealt once per strike of a multi-target attack', () => {
      appContext.setCreatures([
        { ...hero(), cardAId: 811 },
        mob({ retaliate: 2 }),
        mob({ id: 'mob2', retaliate: 1 }),
      ]);
      panel.selectTile(topTile());

      strikeAt('mob');
      expect(creature('hero')!.hp).toBe(10 - 2);

      strikeAt('mob2');
      expect(creature('hero')!.hp).toBe(10 - 3);
    });

    it('never takes the hero below zero', () => {
      board({ retaliate: 99 });
      strikeAt('mob');

      expect(creature('hero')!.hp).toBe(0);
    });

    it('gives the hero their HP back on Undo', () => {
      board({ retaliate: 2 });
      strikeAt('mob');
      panel.undoHalf(topTile());

      expect(creature('hero')!.hp).toBe(10);
    });

    it('gives back only its own share on Undo, not a later heal', () => {
      board({ retaliate: 2 });
      strikeAt('mob');
      // Something else hurts the hero in between; Undo must not paper over it.
      appContext.updateCreatureBaseStat('hero', 'hp', 5);

      panel.undoHalf(topTile());
      expect(creature('hero')!.hp).toBe(7);
    });

    it('never heals the hero past their maximum on Undo', () => {
      board({ retaliate: 2 });
      strikeAt('mob');
      appContext.updateCreatureBaseStat('hero', 'hp', 10);

      panel.undoHalf(topTile());
      expect(creature('hero')!.hp).toBe(10);
    });
  });
});
