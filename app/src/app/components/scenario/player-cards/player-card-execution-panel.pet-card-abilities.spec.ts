import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext, CustomAttackResult } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import { Creature, CreatureConditions, Element, ElementState, ElementType } from '../../../types/game-types';

/**
 * A summon's printed abilities beyond a bare attack value — pierce, an inflicted
 * condition (poison, wound, …), a multi-target cap — must ride on the pet card's
 * attack the same way a hand-authored card would print them, or they stay decoration
 * (an icon on the summon's row) instead of something Execute actually applies.
 *
 * `CreatureFactoryService.createSummon` already splits a card's summon `abilities`
 * into `Creature.pierce` (a fixed stat) and `Creature.actions` (condition abilities,
 * rendered as icons) — see prism's "Toxin Distributor" (poison) and "Bombardier"
 * (attackTarget: 3) for real cards with this shape.
 */
describe('PlayerCardExecutionPanelComponent — summon abilities ride the pet card attack', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let fixture: ComponentFixture<PlayerCardExecutionPanelComponent>;
  let creatures: Creature[];
  let elements: Element[];
  let addedConditions: { creature: Creature; conditions: CreatureConditions[] }[];

  const owner: Creature = {
    id: 'hero', type: 'prism', aggressive: false, level: 3,
    hp: 10, maxHp: 10, totalXp: 0, sessionExperience: 0,
  };
  const poisonSummon: Creature = {
    id: 'toxin', type: 'toxin-distributor', aggressive: false, isSummon: true,
    name: 'Toxin Distributor', summonOwnerId: 'hero',
    attack: 2, pierce: 1, attackTarget: 2,
    actions: [{ type: 'condition', value: 'poison' }],
    hp: 6, maxHp: 6, conditions: [],
  };
  const mob1: Creature = { id: 'mob1', type: 'algox-guard', aggressive: true, hp: 20, maxHp: 20, armor: 0, conditions: [] };
  const mob2: Creature = { id: 'mob2', type: 'living-bones', aggressive: true, hp: 10, maxHp: 10, armor: 0, conditions: [] };

  beforeEach(() => {
    addedConditions = [];
    elements = (Object.values(ElementType) as ElementType[])
      .map(type => ({ type, state: ElementState.None }));
    creatures = [{ ...owner }, { ...poisonSummon }, { ...mob1 }, { ...mob2 }];

    const appContextStub: Partial<AppContext> = {
      cardPanelCreatureId: 'toxin',
      creatures$: new Subject<Creature[]>().asObservable(),
      customAttackResult$: new Subject<CustomAttackResult>().asObservable(),
      getCreatures: () => creatures,
      getElements: () => elements,
      setElementState: () => { },
      applyCreaturePatches: (patches) => {
        for (const { creatureId, patch } of patches) {
          const creature = creatures.find(c => c.id === creatureId);
          if (creature) Object.assign(creature, patch);
        }
      },
      buildAddConditionsPatch: (creature, conditions) => {
        addedConditions.push({ creature, conditions });
        const current = creature.conditions ?? [];
        const added = conditions.filter(c => !current.includes(c));
        return added.length ? { conditions: [...current, ...added] } : {};
      },
      buildRemoveConditionsPatch: (creature) => ({ conditions: creature.conditions ?? [] }),
      autoBindHeroCards: () => Promise.resolve(),
      recordDamage: () => { },
      recordKill: () => { },
      killCreature: () => { },
      recordHalfExecution: () => { },
    };

    const deckServiceStub: Partial<CharacterDeckService> = {
      loadDeck: () => Promise.resolve(null),
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
    fixture.detectChanges();
  });

  it('builds the attack with pierce, the inflicted condition and the multi-target cap all riding on it', () => {
    expect(panel.tiles[0].content?.actions).toEqual([{
      type: 'attack',
      value: 2,
      subActions: [
        { type: 'pierce', value: 1 },
        { type: 'condition', value: 'poison', small: true },
      ],
      multiTarget: 2,
    }]);
  });

  it('offers the printed multi-target cap once the tile is selected', () => {
    panel.selectTile(panel.tiles[0]);
    expect(panel.isAttackMultiTarget(0)).toBe(true);
    expect(panel.attackTargetLimit(0)).toBe(2);
  });

  it('inflicts poison on the struck target when the attack lands', () => {
    panel.selectTile(panel.tiles[0]);
    panel.selectTarget('mob1');
    panel.setModifier(0);
    panel.execute();

    expect(addedConditions.some(
      c => c.creature.id === 'mob1' && c.conditions.includes(CreatureConditions.poison)
    )).toBe(true);
  });

  it('applies pierce to reduce the target\'s armor', () => {
    creatures.find(c => c.id === 'mob1')!.armor = 2;
    panel.selectTile(panel.tiles[0]);
    panel.selectTarget('mob1');
    panel.setModifier(0);
    panel.execute();

    // Attack 2, armor 2, pierce 1 -> effective armor 1, so 1 damage gets through.
    // Without pierce riding the attack, armor 2 would fully block it (0 damage).
    expect(creatures.find(c => c.id === 'mob1')!.hp).toBe(19);
  });
});
