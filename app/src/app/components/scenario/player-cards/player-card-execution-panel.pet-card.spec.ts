import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext, CustomAttackResult } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import { Creature, Element, ElementState, ElementType } from '../../../types/game-types';

/**
 * A summon opened in the card execution panel (via its own "Attack" button — see
 * `creature.component`) is not a hero with a hand of cards to choose between: it gets
 * the same rich attack flow (modifier draw, targeting, damage) built from its own
 * printed attack/pierce/movement instead, as one synthetic tile rather than the usual
 * two-cards-plus-default grid. Once executed, though, it behaves exactly like a hero's
 * half: spent, with an Undo button, same as any card — the only things that don't
 * apply to a summon are XP and the turn-completion badge, which need a second half it
 * never has.
 */
describe('PlayerCardExecutionPanelComponent — summon acting as a pet card', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let fixture: ComponentFixture<PlayerCardExecutionPanelComponent>;
  let creatures: Creature[];
  let elements: Element[];
  let patchCalls: { creatureId: string; patch: Partial<Creature> }[];
  let damageCredits: { type: string; damage: number }[];
  let halfExecutionCalls: unknown[];
  let undoCalls: { creatureId: string; half: string }[];
  let loadDeckCalls: string[];

  const owner: Creature = {
    id: 'hero', type: 'astral', aggressive: false, level: 3,
    hp: 10, maxHp: 10, totalXp: 0, sessionExperience: 0,
  };
  const attackingSummon: Creature = {
    id: 'fox', type: 'fox', aggressive: false, isSummon: true, isTurnCompleted: false,
    name: 'Snow Fox', summonOwnerId: 'hero', attack: 3, pierce: 1, movement: 2,
    hp: 5, maxHp: 5, conditions: [],
  };
  const mob: Creature = { id: 'mob', type: 'algox-guard', aggressive: true, hp: 20, maxHp: 20, armor: 0, conditions: [] };

  beforeEach(() => {
    patchCalls = [];
    damageCredits = [];
    halfExecutionCalls = [];
    undoCalls = [];
    loadDeckCalls = [];
    elements = (Object.values(ElementType) as ElementType[])
      .map(type => ({ type, state: ElementState.None }));
    creatures = [
      { ...owner }, { ...attackingSummon }, { ...mob },
    ];

    const appContextStub: Partial<AppContext> = {
      cardPanelCreatureId: 'fox',
      creatures$: new Subject<Creature[]>().asObservable(),
      customAttackResult$: new Subject<CustomAttackResult>().asObservable(),
      getCreatures: () => creatures,
      getElements: () => elements,
      setElementState: () => { },
      applyCreaturePatches: (patches) => {
        patchCalls.push(...patches);
        for (const { creatureId, patch } of patches) {
          const creature = creatures.find(c => c.id === creatureId);
          if (creature) Object.assign(creature, patch);
        }
      },
      buildAddConditionsPatch: () => ({}),
      buildRemoveConditionsPatch: () => ({}),
      autoBindHeroCards: () => Promise.resolve(),
      recordDamage: (type, damage) => { damageCredits.push({ type, damage }); },
      recordKill: () => { },
      killCreature: () => { },
      recordHalfExecution: (...args: unknown[]) => { halfExecutionCalls.push(args); },
      undoCardHalf: (creatureId, half) => { undoCalls.push({ creatureId, half }); },
    };

    const deckServiceStub: Partial<CharacterDeckService> = {
      loadDeck: (type) => { loadDeckCalls.push(type); return Promise.resolve(null); },
      getLoadedDeck: () => null,
      resolve: () => [],
      cardById: () => null,
      hasPackedInitiatives: () => false,
    };

    TestBed.configureTestingModule({
      imports: [PlayerCardExecutionPanelComponent],
      providers: [
        { provide: AppContext, useValue: appContextStub },
        { provide: CharacterDeckService, useValue: deckServiceStub },
        { provide: LogService, useValue: { appendDamageToLastBatch: () => { }, appendKillToLastBatch: () => { } } },
      ],
    });

    fixture = TestBed.createComponent(PlayerCardExecutionPanelComponent);
    panel = fixture.componentInstance;
    fixture.detectChanges(); // runs ngOnInit
  });

  it('never loads a deck for a summon — it has no hand of cards', () => {
    expect(loadDeckCalls).toEqual([]);
  });

  it('shows exactly one tile, built from the summon\'s own printed stats', () => {
    expect(panel.tiles.length).toBe(1);
    const [tile] = panel.tiles;
    expect(tile.label).toBe('Snow Fox');
    expect(tile.content?.actions).toEqual([
      { type: 'attack', value: 3, subActions: [{ type: 'pierce', value: 1 }] },
      { type: 'move', value: 2 },
    ]);
  });

  it('uses the summon\'s token art, not a hero thumbnail', () => {
    expect(panel.heroPortrait).toBe('./images/summons/fh.png');
  });

  it('resolves an attack against a picked enemy, crediting damage to the owner', () => {
    panel.selectTile(panel.tiles[0]);
    panel.selectTarget('mob');
    panel.setModifier(0);
    panel.execute();

    expect(creatures.find(c => c.id === 'mob')!.hp).toBe(17); // 20 - 3
    expect(damageCredits).toEqual([{ type: 'astral', damage: 3 }]);
  });

  it('grants no XP and does not mark the summon\'s turn complete', () => {
    panel.selectTile(panel.tiles[0]);
    panel.selectTarget('mob');
    panel.setModifier(0);
    panel.execute();

    const fox = creatures.find(c => c.id === 'fox')!;
    expect(fox.totalXp ?? 0).toBe(0);
    expect(fox.isTurnCompleted).toBe(false);
  });

  it('records a half execution on Execute, same as a hero\'s half', () => {
    panel.selectTile(panel.tiles[0]);
    panel.selectTarget('mob');
    panel.setModifier(0);
    panel.execute();

    expect(halfExecutionCalls.length).toBe(1);
  });

  it('marks the tile spent once executed', () => {
    const tile = panel.tiles[0];
    expect(panel.isTileSpent(tile)).toBe(false);

    panel.selectTile(tile);
    panel.selectTarget('mob');
    panel.setModifier(0);
    panel.execute();

    expect(panel.isTileSpent(panel.tiles[0])).toBe(true);
  });

  it('undoing the spent tile calls through to AppContext.undoCardHalf', () => {
    const tile = panel.tiles[0];
    panel.selectTile(tile);
    panel.selectTarget('mob');
    panel.setModifier(0);
    panel.execute();

    panel.undoHalf(panel.tiles[0]);

    expect(undoCalls).toEqual([{ creatureId: 'fox', half: 'top' }]);
  });

  it('hides the hero-only turn-complete footer buttons', () => {
    expect(panel.isSummonActing).toBe(true);
  });
});
