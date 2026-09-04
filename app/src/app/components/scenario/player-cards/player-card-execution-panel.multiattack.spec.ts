import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext, CustomAttackResult } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import { Creature, CreatureConditions, Element, ElementType } from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * A multi-attack half — more than one independent `attack` action, e.g. drifter #7
 * "Vile Assault": Attack 2 Poison, Attack 2 Wound. Each strike gets its own modifier
 * draw and damage instance, resolved one at a time via repeated execute() calls; only
 * the last one finalizes the half (XP, spent flag, etc).
 */
describe('PlayerCardExecutionPanelComponent multi-attack', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let creatures: Creature[];
  let elements: Element[];
  let patchCalls: { creatureId: string; patch: Partial<Creature> }[];

  const vileAssault: CharacterAbilityCard = {
    cardId: 7, name: 'Vile Assault', level: 1, initiative: 27,
    top: {
      actions: [
        { type: 'attack', value: 2, subActions: [{ type: 'condition', value: 'poison', small: true }] },
        { type: 'attack', value: 2, subActions: [{ type: 'condition', value: 'wound', small: true }] },
      ],
      lost: true,
    },
    bottom: { actions: [{ type: 'heal', value: 2 }] },
  };

  const deck: CharacterDeck = {
    characterClass: 'drifter', edition: 'fh',
    cards: [vileAssault],
  };

  beforeEach(() => {
    elements = (Object.values(ElementType) as ElementType[]).map(type => ({ type, state: 0 as any }));
    patchCalls = [];
    creatures = [
      {
        id: 'hero', type: 'drifter', aggressive: false, level: 1,
        initiative: 27, secondaryInitiative: 0, cardAId: 7, cardBId: null,
        hp: 10, maxHp: 10, totalXp: 0, sessionExperience: 0,
      },
      { id: 'mob', type: 'algox-guard', aggressive: true, hp: 20, maxHp: 20, conditions: [] },
    ];

    const appContextStub: Partial<AppContext> = {
      cardPanelCreatureId: 'hero',
      creatures$: new Subject<Creature[]>().asObservable(),
      customAttackResult$: new Subject<CustomAttackResult>().asObservable(),
      getCreatures: () => creatures,
      getElements: () => elements,
      setElementState: () => { },
      applyCreaturePatches: (patches) => {
        patchCalls.push(...patches);
        // Mirror patches onto the stubbed creatures so a second attack step sees the
        // first one's damage, the same way the real store would.
        for (const { creatureId, patch } of patches) {
          const creature = creatures.find(c => c.id === creatureId);
          if (creature) Object.assign(creature, patch);
        }
      },
      buildAddConditionsPatch: () => ({}),
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

    panel = TestBed.createComponent(PlayerCardExecutionPanelComponent).componentInstance;
    panel.selectTile({ source: 'A', half: 'top', card: vileAssault, content: vileAssault.top, label: 'Vile Assault' });
    panel.targetId = 'mob';
  });

  it('collects both independent attacks', () => {
    expect(panel.selectedAttacks.length).toBe(2);
    expect(panel.isMultiAttack).toBe(true);
  });

  it('starts on the first attack, scoped to its own condition', () => {
    expect(panel.attackIndex).toBe(0);
    expect(panel.isLastAttack).toBe(false);
    expect(panel.selectedAttackValue).toBe(2);
    expect(panel.selectedConditions).toEqual([CreatureConditions.poison]);
  });

  it('does not finalize the half on the first execute() — only applies that strike', () => {
    panel.setModifier(0);
    panel.execute();

    expect(creatures[1].hp).toBe(18); // 20 - 2
    const heroPatch = patchCalls.find(p => p.creatureId === 'hero');
    expect(heroPatch).toBeUndefined(); // not finalized yet: no spent flag, no XP
    expect(panel.selected).not.toBeNull();
  });

  it('advances to the second attack, scoped to its own condition', () => {
    panel.setModifier(0);
    panel.execute();

    expect(panel.attackIndex).toBe(1);
    expect(panel.isLastAttack).toBe(true);
    expect(panel.selectedConditions).toEqual([CreatureConditions.wound]);
  });

  it('resets the modifier and custom override between strikes', () => {
    panel.setModifier(2);
    panel.customOverride = { attack: 9, armorPen: 0, conditions: [], ignoreArmor: false };
    panel.execute();

    // Null, not ±0: the next strike has to draw its own card before it can execute.
    expect(panel.modifier).toBeNull();
    expect(panel.customOverride).toBeNull();
    expect(panel.canExecute).toBe(false);
  });

  it('finalizes the half on the last attack: both hits land and the half is spent', () => {
    panel.setModifier(0);
    panel.execute(); // first attack: 2 damage
    panel.setModifier(0);
    panel.execute(); // second attack: finalizes

    expect(creatures[1].hp).toBe(16); // 20 - 2 - 2

    const heroPatch = patchCalls.find(p => p.creatureId === 'hero')?.patch;
    expect(heroPatch?.topHalfState).toBe('executed');
    expect(panel.selected).toBeNull();
    expect(panel.attackIndex).toBe(0); // reset for next time this half is opened
  });
});
