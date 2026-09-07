import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext, CustomAttackResult } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import { Creature, Element, ElementState, ElementType } from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * `textBonus` — a conditional bonus gated on a printed condition this app has no state
 * to compute ("if your current HP is less than half your max HP", "if you are the only
 * hero adjacent to the target"). Unlike `elementBonus`/`sufferDamageBonus`, there is
 * nothing to check or pay: the player reads the text and judges it themselves, so the
 * checkbox means "this is true right now," not "I choose this," and it is always
 * offered.
 */
describe('PlayerCardExecutionPanelComponent text bonuses', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let fixture: ComponentFixture<PlayerCardExecutionPanelComponent>;
  let creatures: Creature[];
  let elements: Element[];
  let patchCalls: { creatureId: string; patch: Partial<Creature> }[];

  /** shackles #319 "Down to the Dirt": Attack 2, +3 Attack and 1 XP if HP < half max. */
  const downToTheDirt: CharacterAbilityCard = {
    cardId: 319, name: 'Down to the Dirt', level: 4, initiative: 39,
    top: {
      actions: [{
        type: 'attack', value: 2,
        subActions: [{
          type: 'textBonus',
          text: 'if your current hit point value is less than half (rounded up) your maximum hit point value',
          subActions: [
            { type: 'attack', value: 3, valueType: 'add', small: true },
            { type: 'xp', value: 1 },
          ],
        }],
      }],
    },
    bottom: {
      actions: [{
        type: 'heal', value: 'X', selfOnly: true,
        subActions: [{ type: 'text', text: 'where X is the number of negative conditions you have.', small: true }],
      }],
    },
  };

  const deck: CharacterDeck = {
    characterClass: 'shackles', edition: 'fh', cards: [downToTheDirt],
  };

  const heroPatch = () => patchCalls.find(p => p.creatureId === 'hero')?.patch;

  beforeEach(() => {
    patchCalls = [];
    elements = (Object.values(ElementType) as ElementType[])
      .map(type => ({ type, state: ElementState.None }));
    creatures = [
      {
        id: 'hero', type: 'shackles', aggressive: false, level: 4,
        initiative: 39, secondaryInitiative: 0, cardAId: 319, cardBId: null,
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

    fixture = TestBed.createComponent(PlayerCardExecutionPanelComponent);
    panel = fixture.componentInstance;
    panel.selected = { source: 'A', half: 'top' };
  });

  it('finds the bonus on the half and carries its printed text', () => {
    expect(panel.selectedBonuses.length).toBe(1);
    expect(panel.isTextBonus(panel.selectedBonuses[0])).toBe(true);
    expect(panel.selectedBonuses[0].text).toContain('less than half');
  });

  it('is always available — there is no cost to check, only a judgment to make', () => {
    // No elements active, hero at full HP: an elementBonus/sufferDamageBonus in the
    // same spot would be withheld. A textBonus is offered regardless.
    expect(panel.isBonusAvailable(panel.selectedBonuses[0])).toBe(true);
  });

  it('grants nothing until the player checks it', () => {
    expect(panel.selectedAttackValue).toBe(2);
    expect(panel.takenBonusXp).toBe(0);
  });

  it('adds its attack and xp once taken, whether or not the condition is actually true', () => {
    // The app has no way to verify "HP < half max" itself — taking the box is the
    // player's assertion that it's true, exactly like every other conditional bonus
    // being a choice to press rather than a fact the panel checks.
    panel.toggleBonus(0, panel.selectedBonuses[0]);

    expect(panel.isBonusTaken(0)).toBe(true);
    expect(panel.selectedAttackValue).toBe(5); // 2 printed + 3 bonus
    expect(panel.takenBonusXp).toBe(1);
  });

  it('untoggles back to the printed values', () => {
    const bonus = panel.selectedBonuses[0];
    panel.toggleBonus(0, bonus);
    panel.toggleBonus(0, bonus);

    expect(panel.isBonusTaken(0)).toBe(false);
    expect(panel.selectedAttackValue).toBe(2);
  });

  it('costs nothing to take: no HP, no elements consumed', () => {
    panel.toggleBonus(0, panel.selectedBonuses[0]);
    panel.selectTarget('mob');
    panel.setModifier(0);
    panel.execute();

    // 2 + 3 = 5 damage landed; the hero's own HP is untouched by taking the bonus.
    expect(creatures.find(c => c.id === 'mob')!.hp).toBe(15);
    expect(heroPatch()?.hp).toBeUndefined();
  });

  it('awards the xp on execute once taken', () => {
    panel.toggleBonus(0, panel.selectedBonuses[0]);
    panel.selectTarget('mob');
    panel.setModifier(0);
    panel.execute();

    expect(heroPatch()?.sessionExperience).toBe(1);
  });

  it('works alongside the accompanying "Heal X" on the other half', () => {
    panel.selected = { source: 'A', half: 'bottom' };
    expect(panel.isCurrentHealManual).toBe(true);
    panel.setManualHealValue(2);
    expect(panel.selectedSelfHealValue).toBe(2);
  });
});
