import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext, CustomAttackResult } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import { Creature, CreatureConditions, Element, ElementState, ElementType } from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * Regression for shackles #313 "Pleasure in Pain" bottom: self-Poison, Poison a picked
 * ally, then Attack every adjacent enemy — no heal anywhere on the half, unlike
 * "Reversal of Fate". The ally-directed condition needs its own target pick before the
 * attack takes over, exactly the way a target-facing heal already did — but the old
 * `isHealBeforeAttack` only checked for a heal, so with none present the half went
 * straight to the attack's own (enemy) target strip and the ally never got offered at
 * all; worse, the poison meant for the ally then landed on whichever enemy was struck.
 */
describe('PlayerCardExecutionPanelComponent — ally-directed condition before an attack', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let fixture: ComponentFixture<PlayerCardExecutionPanelComponent>;
  let creatures: Creature[];
  let elements: Element[];
  let addedConditions: { creature: Creature; conditions: CreatureConditions[] }[];

  const pleasureInPain: CharacterAbilityCard = {
    cardId: 313, name: 'Pleasure in Pain', level: 'X', initiative: 47,
    top: { actions: [] },
    bottom: {
      actions: [
        { type: 'condition', value: 'poison', selfOnly: true },
        { type: 'condition', value: 'poison', targetAlly: true },
        { type: 'attack', value: 1, multiTarget: true, ignoreArmor: true },
      ],
    },
  };

  const deck: CharacterDeck = {
    characterClass: 'shackles', edition: 'fh', cards: [pleasureInPain],
  };

  beforeEach(() => {
    addedConditions = [];
    elements = (Object.values(ElementType) as ElementType[])
      .map(type => ({ type, state: ElementState.None }));
    creatures = [
      {
        id: 'hero', type: 'shackles', aggressive: false, level: 9,
        initiative: 47, secondaryInitiative: 0, cardAId: 313, cardBId: null,
        hp: 10, maxHp: 10, totalXp: 0, sessionExperience: 0, conditions: [],
      },
      { id: 'ally', type: 'drifter', aggressive: false, hp: 10, maxHp: 10, conditions: [] },
      { id: 'mob', type: 'algox-guard', aggressive: true, hp: 20, maxHp: 20, armor: 0, conditions: [] },
    ];

    const appContextStub: Partial<AppContext> = {
      cardPanelCreatureId: 'hero',
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
      loadDeck: () => Promise.resolve(deck),
      getLoadedDeck: () => deck,
      resolve: () => [],
      cardById: (id) => deck.cards.find(c => c.cardId === id) ?? null,
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
    panel.selected = { source: 'A', half: 'bottom' };
  });

  it('offers an ally to pick, not an enemy, even though there is no heal on this half', () => {
    expect(panel.isResolvingAllyStep).toBe(true);
    expect(panel.targetsAreHeroes).toBe(true);
    // The acting hero is a valid ally target too, same as any other non-self,
    // ally-directed condition — only enemies are excluded.
    expect(panel.targetOptions.map(c => c.id)).toEqual(jasmine.arrayWithExactContents(['ally', 'hero']));
  });

  it('withholds Execute until the ally is picked', () => {
    expect(panel.canExecute).toBe(false);
    panel.selectTarget('ally');
    expect(panel.canExecute).toBe(true);
  });

  it('poisons the picked ally on the pre-step, then switches to offering enemies', () => {
    panel.selectTarget('ally');
    panel.execute();

    expect(addedConditions.some(
      c => c.creature.id === 'ally' && c.conditions.includes(CreatureConditions.poison)
    )).toBe(true);
    expect(panel.isResolvingAllyStep).toBe(false);
    expect(panel.targetsAreHeroes).toBe(false);
    expect(panel.targetOptions.map(c => c.id)).toEqual(['mob']);
  });

  it('does not also poison whichever enemy the attack strikes', () => {
    panel.selectTarget('ally');
    panel.execute(); // ally step

    panel.selectTarget('mob');
    panel.execute(); // attack step (ignoreArmor: no modifier needed)

    expect(addedConditions.some(
      c => c.creature.id === 'mob' && c.conditions.includes(CreatureConditions.poison)
    )).toBe(false);
    expect(creatures.find(c => c.id === 'mob')!.hp).toBe(19); // 20 - 1, ignoreArmor
  });

  it('still applies the self-poison once the half finalizes, exactly as printed', () => {
    panel.selectTarget('ally');
    panel.execute(); // ally step
    panel.selectTarget('mob');
    panel.execute(); // one strike of the sequential (multiTarget) attack
    panel.finishAttack(); // finalizes the half — self-only effects land here

    expect(creatures.find(c => c.id === 'hero')!.conditions).toContain(CreatureConditions.poison);
  });
});
