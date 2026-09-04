import { TestBed } from '@angular/core/testing';
import { AttackModalComponent } from './attack-modal.component';
import { AppContext } from '../../../app-context';
import { DataLoaderService } from '../../../services/data-loader.service';
import { CreatureFactoryService } from '../../../services/creature-factory.service';
import { LogService } from '../../../services/log.service';
import { NotificationService } from '../../../services/notification.service';
import { DbService } from '../../../services/db.service';
import { XpService } from '../../../services/xp.service';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { StringUtils } from '../../../services/string-utils.service';
import { InitiativeService } from '../../../services/initiative.service';
import { DamageService } from '../../../services/damage.service';
import { Creature } from '../../../types/game-types';

/**
 * A summon has no damage stats of its own — its owner acts through it — so its attack
 * must be selectable in the modal's character strip (with its own token art and its
 * printed attack/pierce prefilled, the same convenience a hero's card gives), and any
 * damage it deals must land on the owner's tally, not a nonexistent one of its own.
 */
describe('AttackModalComponent summon attribution', () => {
  let appContext: AppContext;
  let component: AttackModalComponent;
  let loggedDamage: { type: string; damage: number }[];

  const owner: Creature = {
    id: 'hero', type: 'snowflake', aggressive: false, level: 3, hp: 10, maxHp: 10,
  };
  const monster: Creature = {
    id: 'mob', type: 'algox-guard', aggressive: true, hp: 8, maxHp: 8, armor: 0, conditions: [],
  };

  beforeEach(() => {
    loggedDamage = [];
    TestBed.configureTestingModule({
      providers: [
        AppContext,
        StringUtils,
        CreatureFactoryService,
        DamageService,
        { provide: DataLoaderService, useValue: { getData: () => ({ characters: [], monsters: [], decks: [] }) } },
        {
          provide: LogService,
          useValue: {
            init: () => { },
            appendDamageToLastBatch: (type: string, damage: number) => loggedDamage.push({ type, damage }),
            appendKillToLastBatch: () => { },
          },
        },
        { provide: NotificationService, useValue: { emitErrorMessage: () => { }, emitInfoMessage: () => { } } },
        { provide: DbService, useValue: { getCharacter: () => Promise.resolve([]) } },
        { provide: XpService, useValue: { levelFromXp: () => 1 } },
        { provide: CharacterDeckService, useValue: { loadDeck: () => Promise.resolve(null), resolve: () => [] } },
        { provide: InitiativeService, useValue: { getSelectedCharacterType: () => null } },
      ],
    });
    appContext = TestBed.inject(AppContext);
    appContext.setCreatures([owner, monster]);
    const factory = TestBed.inject(CreatureFactoryService);
    const fox = factory.createSummon(
      { name: 'Snow Fox', health: 5, attack: 3, abilities: [{ type: 'pierce', value: 2 }] },
      owner,
      1,
    );
    appContext.setCreatures([...appContext.getCreatures(), fox]);

    appContext.selectedCreature = monster;
    appContext.isGroupSelected = false;
    component = TestBed.createComponent(AttackModalComponent).componentInstance;
  });

  const fox = () => appContext.getCreatures().find(c => c.isSummon)!;

  it('shows the summon in the attacker strip alongside heroes', () => {
    expect(component.getHeroes().some(c => c.id === fox().id)).toBe(true);
  });

  it('gives a summon its card token art instead of a hero thumbnail', () => {
    expect(component.attackerPortrait(fox())).toBe('./images/summons/fh.png');
  });

  it('prefills the attack and pierce from the summon printed stats on selection', () => {
    component.selectCharacter(fox().id!);
    expect(component.attack).toBe(3);
    expect(component.armorPen).toBe(2);
  });

  it('does not disturb a manually typed value for an actual hero', () => {
    component.attack = 99;
    component.selectCharacter(owner.id!);
    expect(component.attack).toBe(99);
  });

  it("credits the summon's damage to its owner", () => {
    component.selectCharacter(fox().id!);
    component.confirm();
    expect(loggedDamage).toEqual([{ type: 'snowflake', damage: 3 }]);
  });

  it('never credits damage to the summon own (nonexistent) stats', () => {
    component.selectCharacter(fox().id!);
    component.confirm();
    expect(loggedDamage.some(d => d.type === fox().type)).toBe(false);
  });
});
