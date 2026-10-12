import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PlayerCardExecutionPanelComponent } from './player-card-execution-panel.component';
import { AppContext, CustomAttackResult, HalfExecution } from '../../../app-context';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { LogService } from '../../../services/log.service';
import { Creature, Element, ElementState, ElementType } from '../../../types/game-types';
import { CharacterAbilityCard, CharacterDeck } from '../../../types/character-card-types';

/**
 * The two ways a card can charge its own player HP:
 *
 * - `sufferDamage` — a printed cost, taken whenever the half is executed;
 * - `sufferDamageBonus` — an offer, the `elementBonus` bargain paid in HP instead of
 *   elements, and like it never applied unless the player takes it.
 */
describe('PlayerCardExecutionPanelComponent self-damage', () => {
  let panel: PlayerCardExecutionPanelComponent;
  let fixture: ComponentFixture<PlayerCardExecutionPanelComponent>;
  let creatures: Creature[];
  let elements: Element[];
  let patchCalls: { creatureId: string; patch: Partial<Creature> }[];
  let recorded: HalfExecution[];

  /** Mandatory: "Attack 3, suffer 2." */
  const bloodPrice: CharacterAbilityCard = {
    cardId: 901, name: 'Blood Price', level: 1, initiative: 30,
    top: {
      actions: [
        { type: 'attack', value: 3 },
        { type: 'sufferDamage', value: 2 },
      ],
    },
    bottom: { actions: [] },
  };

  /** Optional: "Attack 2. Suffer 1: +3 Attack and 1 XP." */
  const recklessSwing: CharacterAbilityCard = {
    cardId: 902, name: 'Reckless Swing', level: 1, initiative: 31,
    top: {
      actions: [{
        type: 'attack', value: 2, subActions: [{
          type: 'sufferDamageBonus', value: 1,
          subActions: [
            { type: 'attack', value: 3, valueType: 'add', small: true },
            { type: 'xp', value: 1 },
          ],
        }],
      }],
    },
    bottom: { actions: [] },
  };

  /**
   * shackles #325 "Penance" shape (simplified to a single target here — its own
   * `multiTarget` shape is covered by the multitarget specs): "Attack 3... Suffer X,
   * where X is the number of enemies that suffered damage with this action." The cost
   * isn't fixed on the card, it's a number the player computes and types in.
   */
  const penance: CharacterAbilityCard = {
    cardId: 903, name: 'Penance', level: 1, initiative: 32,
    top: {
      actions: [
        { type: 'attack', value: 3 },
        {
          type: 'sufferDamage', value: 'X',
          subActions: [{ type: 'text', text: 'where X is the number of enemies hit.', small: true }],
        },
      ],
    },
    bottom: { actions: [] },
  };

  const deck: CharacterDeck = {
    characterClass: 'shackles', edition: 'fh', cards: [bloodPrice, recklessSwing, penance],
  };

  const heroHp = (hp: number) => { creatures[0].hp = hp; };
  const heroPatch = () => patchCalls.find(p => p.creatureId === 'hero')?.patch;

  beforeEach(() => {
    patchCalls = [];
    recorded = [];
    elements = (Object.values(ElementType) as ElementType[])
      .map(type => ({ type, state: ElementState.None }));
    creatures = [
      {
        id: 'hero', type: 'shackles', aggressive: false, level: 1,
        initiative: 30, secondaryInitiative: 31, cardAId: 901, cardBId: 902,
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
      applyCreaturePatches: (patches) => { patchCalls.push(...patches); },
      buildAddConditionsPatch: () => ({}),
      autoBindHeroCards: () => Promise.resolve(),
      recordDamage: () => { },
      recordKill: () => { },
      killCreature: () => { },
      recordHalfExecution: (_id, _half, effect) => { recorded.push(effect); },
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

  /** The rendered panel, for the parts of this feature that only exist in the view. */
  const render = (): HTMLElement => {
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  describe('mandatory sufferDamage', () => {
    it('reads the printed cost off the half', () => {
      expect(panel.selectedSelfDamage).toBe(2);
      expect(panel.totalSelfDamage).toBe(2);
    });

    it('takes the HP off the hero on execute', () => {
      panel.targetId = 'mob';
      panel.setModifier(0);
      panel.execute();

      expect(heroPatch()?.hp).toBe(8);
    });

    it('does not draw a modifier for it, and shield does not reduce it', () => {
      // The half's attack is what draws; the cost is charged at its printed value
      // whatever the draw was — here a miss, which deals no damage at all.
      panel.targetId = 'mob';
      panel.setModifier('miss');
      panel.execute();

      expect(heroPatch()?.hp).toBe(8);
      expect(patchCalls.find(p => p.creatureId === 'mob')?.patch.hp).toBe(20);
    });

    it('records the cost so undo can give it back', () => {
      panel.targetId = 'mob';
      panel.setModifier(0);
      panel.execute();

      expect(recorded.at(-1)?.selfDamageSuffered).toBe(2);
    });

    it('floors the hero at 0 rather than taking them negative', () => {
      heroHp(1);
      panel.targetId = 'mob';
      panel.setModifier(0);
      panel.execute();

      expect(heroPatch()?.hp).toBe(0);
    });

    it('is charged once for the half, not once per strike', () => {
      // applyStrike() files 0; only finalizeHalf() charges the cost.
      panel.targetId = 'mob';
      panel.setModifier(0);
      panel.execute();

      const total = recorded.reduce((sum, r) => sum + r.selfDamageSuffered, 0);
      expect(total).toBe(2);
    });

    it('is not read off an unauthored half', () => {
      panel.selected = { source: 'A', half: 'bottom' };
      expect(panel.selectedSelfDamage).toBe(0);
    });
  });

  describe('optional sufferDamageBonus', () => {
    beforeEach(() => {
      panel.selected = { source: 'B', half: 'top' };
    });

    it('is found as a bonus on the half', () => {
      expect(panel.selectedBonuses.length).toBe(1);
      expect(panel.isSelfDamageBonus(panel.selectedBonuses[0])).toBe(true);
      expect(panel.bonusSelfDamageCost(panel.selectedBonuses[0])).toBe(1);
    });

    it('grants nothing until it is taken', () => {
      expect(panel.selectedAttackValue).toBe(2);
      expect(panel.takenBonusXp).toBe(0);
      expect(panel.totalSelfDamage).toBe(0);
    });

    it('adds its attack and xp, and its cost, once taken', () => {
      panel.toggleBonus(0, panel.selectedBonuses[0]);

      expect(panel.isBonusTaken(0)).toBe(true);
      expect(panel.selectedAttackValue).toBe(5);   // 2 printed + 3 bonus
      expect(panel.takenBonusXp).toBe(1);
      expect(panel.totalSelfDamage).toBe(1);
    });

    it('untoggles back to the printed values, cost included', () => {
      const bonus = panel.selectedBonuses[0];
      panel.toggleBonus(0, bonus);
      panel.toggleBonus(0, bonus);

      expect(panel.selectedAttackValue).toBe(2);
      expect(panel.totalSelfDamage).toBe(0);
    });

    it('charges the HP and awards the xp on execute', () => {
      panel.toggleBonus(0, panel.selectedBonuses[0]);
      panel.targetId = 'mob';
      panel.setModifier(0);
      panel.execute();

      expect(heroPatch()?.hp).toBe(9);
      expect(heroPatch()?.sessionExperience).toBe(1);
      expect(recorded.at(-1)?.selfDamageSuffered).toBe(1);
    });

    it('costs nothing when declined', () => {
      panel.targetId = 'mob';
      panel.setModifier(0);
      panel.execute();

      expect(heroPatch()?.hp).toBeUndefined();
      expect(recorded.at(-1)?.selfDamageSuffered).toBe(0);
    });

    it('is offered while the hero has HP to spare', () => {
      heroHp(5);
      expect(panel.isBonusAvailable(panel.selectedBonuses[0])).toBe(true);
    });

    /**
     * Paying down to exactly 0 is exhaustion, not a bargain, and this app has no
     * exhaustion state — so the offer is withheld instead of flooring the hero at 0
     * and leaving them standing.
     */
    it('is withheld when paying it would reduce the hero to 0', () => {
      heroHp(1);
      expect(panel.isBonusAvailable(panel.selectedBonuses[0])).toBe(false);
    });

    it('refuses to be taken while unavailable', () => {
      heroHp(1);
      panel.toggleBonus(0, panel.selectedBonuses[0]);
      expect(panel.isBonusTaken(0)).toBe(false);
    });

    it('says why it is greyed out', () => {
      expect(panel.bonusUnavailableReason(panel.selectedBonuses[0])).toBe('not enough HP');
    });
  });

  describe('what the panel shows', () => {
    it('annotates the HP a mandatory cost will take', () => {
      const annotation = render().querySelector('.annotation.self-damage');
      expect(annotation).toBeTruthy();
      expect(annotation!.querySelector('.icon.damage')).toBeTruthy();
      expect(annotation!.textContent).toContain('2');
    });

    it('offers an HP bonus as a checkbox row priced in damage', () => {
      panel.selected = { source: 'B', half: 'top' };
      const row = render().querySelector('.bonus-row');

      expect(row).toBeTruthy();
      expect(row!.textContent!.toLowerCase()).toContain('suffer');
      expect(row!.querySelector('.consume .icon.damage')).toBeTruthy();
      expect(row!.classList.contains('unavailable')).toBe(false);
      // Not an element bonus: nothing to pick between, so no element chooser.
      expect(row!.querySelector('.element-choice')).toBeNull();
    });

    it('greys the row and says why when the hero cannot pay', () => {
      panel.selected = { source: 'B', half: 'top' };
      heroHp(1);
      const row = render().querySelector('.bonus-row');

      expect(row!.classList.contains('unavailable')).toBe(true);
      expect(row!.querySelector('.requires')!.textContent!.trim()).toBe('not enough HP');
      expect(row!.querySelector('button')!.disabled).toBe(true);
    });

    it('shows the cost rising once the bonus is taken', () => {
      panel.selected = { source: 'B', half: 'top' };
      panel.toggleBonus(0, panel.selectedBonuses[0]);

      const annotation = render().querySelector('.annotation.self-damage');
      expect(annotation!.textContent).toContain('1');
    });

    it('does not call a half with a cost "nothing to apply"', () => {
      // The half attacks too, but the cost alone must be enough to earn Execute.
      expect(render().querySelector('.note')).toBeNull();
    });
  });

  /**
   * `"value": "X"` on a `sufferDamage` — the mandatory cost isn't fixed on the card,
   * the player computes it and types it in, the same bargain "Attack X" and "Heal X"
   * strike with their own values. Never a `sufferDamageBonus`: an optional bonus has
   * to be offered at a known price, not a number filled in after deciding to take it.
   */
  describe('mandatory sufferDamage with "value": "X"', () => {
    beforeEach(() => {
      creatures[0].cardAId = 903;
      panel.selectTile({ source: 'A', half: 'top', card: penance, content: penance.top, label: 'Penance' });
    });

    it('is recognised and starts at 0 until the player types something', () => {
      expect(panel.isSelfDamageManual).toBe(true);
      expect(panel.selectedSelfDamage).toBe(0);
      expect(panel.totalSelfDamage).toBe(0);
    });

    it('leaves an ordinary printed sufferDamage alone', () => {
      creatures[0].cardAId = 901;
      panel.selectTile({ source: 'A', half: 'top', card: bloodPrice, content: bloodPrice.top, label: 'Blood Price' });
      expect(panel.isSelfDamageManual).toBe(false);
    });

    it('takes the typed value as the cost', () => {
      panel.setManualSelfDamageValue(3);
      expect(panel.selectedSelfDamage).toBe(3);
      expect(panel.totalSelfDamage).toBe(3);
    });

    it('coerces a string and refuses a negative', () => {
      panel.setManualSelfDamageValue('2');
      expect(panel.selectedSelfDamage).toBe(2);

      panel.setManualSelfDamageValue(-5);
      expect(panel.selectedSelfDamage).toBe(0);
    });

    it('charges the typed HP on execute', () => {
      panel.setManualSelfDamageValue(3);
      panel.targetId = 'mob';
      panel.setModifier(0);
      panel.execute();

      expect(heroPatch()?.hp).toBe(7); // 10 - 3
    });

    it('is not offered on a `sufferDamageBonus` — its price must stay fixed', () => {
      panel.selectTile({ source: 'B', half: 'top', card: recklessSwing, content: recklessSwing.top, label: 'Reckless Swing' });
      expect(panel.isSelfDamageManual).toBe(false);
    });

    it('shows a box even at 0 rather than being called "nothing to apply"', () => {
      expect(render().querySelector('.note')).toBeNull();
      expect(render().querySelector('.annotation.self-damage')).toBeTruthy();
    });

    it('lets the box drive execution through the rendered input', () => {
      const input = render().querySelector('.annotation.self-damage input') as HTMLInputElement;
      expect(input).toBeTruthy();

      input.value = '4';
      input.dispatchEvent(new Event('input'));
      expect(panel.selectedSelfDamage).toBe(4);
    });
  });
});
