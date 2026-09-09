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
 * End-to-end for the tile's Undo: execute a half for real (real AppContext, real
 * damage maths), then press Undo and check the board and the Stats screen are back
 * where they started — including when the numbers came from the attack modal's
 * "Custom…" rather than the card.
 */
describe('PlayerCardExecutionPanelComponent undo reverses the execution', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let appContext: AppContext;

  const poisonStrike: CharacterAbilityCard = {
    cardId: 800, name: 'Poison Strike', level: 1, initiative: 20,
    top: {
      xp: 1,
      actions: [{
        type: 'attack', value: 4,
        subActions: [{ type: 'condition', value: 'poison', small: true }],
      }],
    },
    bottom: { actions: [{ type: 'shield', value: 2 }] },
  };

  const deck: CharacterDeck = {
    characterClass: 'drifter', edition: 'fh', cards: [poisonStrike],
  };

  const hero = (): Creature => ({
    id: 'hero', type: 'drifter', aggressive: false, level: 1,
    initiative: 20, secondaryInitiative: 0, cardAId: 800, cardBId: null,
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
          useValue: {
            init: () => { },
            appendDamageToLastBatch: () => { },
            appendKillToLastBatch: () => { },
            runWithoutLogging: (fn: () => void) => fn(),
          },
        },
        { provide: NotificationService, useValue: { emitErrorMessage: () => { }, emitInfoMessage: () => { } } },
        { provide: DbService, useValue: { getCharacter: () => Promise.resolve([]) } },
        { provide: XpService, useValue: { levelFromXp: () => 1 } },
      ],
    });

    appContext = TestBed.inject(AppContext);
    appContext.setCreatures([hero(), mob()]);
    appContext.cardPanelCreatureId = 'hero';

    panel = TestBed.createComponent(PlayerCardExecutionPanelComponent).componentInstance;
  });

  const creature = (id: string) => appContext.getCreatures().find(c => c.id === id);
  const topTile = () => panel.tiles.find(t => t.source === 'A' && t.half === 'top')!;

  const executeTop = () => {
    panel.selectTile(topTile());
    panel.selectTarget('mob');
    panel.setModifier(0);
    panel.execute();
  };

  it('applies the attack, poison, XP and damage credit first', () => {
    executeTop();

    expect(creature('mob')!.hp).toBe(16);
    expect(creature('mob')!.conditions).toEqual([CreatureConditions.poison]);
    expect(creature('hero')!.topHalfState).toBe('executed');
    expect(creature('hero')!.sessionExperience).toBe(1);
    expect(appContext.getDamageTracker()['drifter']).toBe(4);
  });

  it('puts all of it back when the tile Undo is pressed', () => {
    executeTop();
    panel.undoHalf(topTile());

    expect(creature('mob')!.hp).toBe(20);
    expect(creature('mob')!.conditions).toEqual([]);
    expect(creature('hero')!.topHalfState).toBeNull();
    expect(creature('hero')!.sessionExperience).toBe(0);
    expect(creature('hero')!.totalXp).toBe(0);
    expect(appContext.getDamageTracker()['drifter']).toBe(0);
  });

  it('reverses the +/- adjusted value that actually landed, not the printed one', () => {
    panel.selectTile(topTile());
    panel.adjustAttack(0, 2); // Attack 4 -> 6
    panel.selectTarget('mob');
    panel.setModifier(0);
    panel.execute();

    expect(creature('mob')!.hp).toBe(14);
    expect(appContext.getDamageTracker()['drifter']).toBe(6);

    panel.undoHalf(topTile());
    expect(creature('mob')!.hp).toBe(20);
    expect(appContext.getDamageTracker()['drifter']).toBe(0);
  });

  it('reverses values that came from the attack modal Custom… flow', () => {
    panel.selectTile(topTile());
    panel.selectTarget('mob');
    // What "Custom…" hands back: 9 damage and a wound the card never printed.
    panel.customOverride = {
      attack: 9, armorPen: 0, conditions: [CreatureConditions.wound], ignoreArmor: false,
    };
    panel.execute();

    expect(creature('mob')!.hp).toBe(11);
    expect(creature('mob')!.conditions).toContain(CreatureConditions.wound);
    expect(appContext.getDamageTracker()['drifter']).toBe(9);

    panel.undoHalf(topTile());

    expect(creature('mob')!.hp).toBe(20);
    expect(creature('mob')!.conditions).toEqual([]);
    expect(appContext.getDamageTracker()['drifter']).toBe(0);
  });

  it('revives a target the half killed, with the HP it had before', () => {
    appContext.setCreatures([hero(), mob({ hp: 3 })]);
    executeTop();

    expect(creature('mob')).toBeUndefined(); // killed by the 4 damage
    expect(appContext.getKillTracker()['drifter']).toBe(1);

    panel.undoHalf(topTile());

    expect(creature('mob')!.hp).toBe(3);
    expect(appContext.getKillTracker()['drifter']).toBe(0);
    expect(appContext.getDamageTracker()['drifter']).toBe(0);
  });

  it('takes back a round-long shield the other half granted', () => {
    const bottom = panel.tiles.find(t => t.source === 'A' && t.half === 'bottom')!;
    panel.selectTile(bottom);
    panel.execute(); // shield 2, no attack — nothing to draw

    expect(creature('hero')!.roundArmor).toBe(2);

    panel.undoHalf(bottom);
    expect(creature('hero')!.roundArmor).toBe(0);
    expect(creature('hero')!.bottomHalfState).toBeNull();
  });

  it('leaves a condition the target already had, undoing only what the half added', () => {
    appContext.setCreatures([hero(), mob({ conditions: [CreatureConditions.wound] })]);
    executeTop();

    expect(creature('mob')!.conditions).toEqual([CreatureConditions.wound, CreatureConditions.poison]);

    panel.undoHalf(topTile());
    expect(creature('mob')!.conditions).toEqual([CreatureConditions.wound]);
  });

  it('can be re-executed after an undo, and undone again, without drifting', () => {
    executeTop();
    panel.undoHalf(topTile());
    executeTop();

    expect(creature('mob')!.hp).toBe(16);
    expect(appContext.getDamageTracker()['drifter']).toBe(4);

    panel.undoHalf(topTile());
    expect(creature('mob')!.hp).toBe(20);
    expect(appContext.getDamageTracker()['drifter']).toBe(0);
  });
});
