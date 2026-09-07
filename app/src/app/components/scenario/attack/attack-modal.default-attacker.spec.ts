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
 * `selectedCharacterId` on open — who the modal defaults to crediting the attack to.
 *
 * `InitiativeService.getSelectedCharacterType()` is "whichever character this device
 * is set to," a per-device preference unrelated to who is actually swinging. Defaulting
 * to it is a guess, and for an attack landing on an enemy it's exactly the crediting
 * that matters — so it's suppressed there and the DM picks explicitly. Any other open
 * (damage landing on a hero or a friendly summon, say) still defaults, since nothing
 * there hinges on picking the attacker right.
 */
describe('AttackModalComponent default attacker', () => {
  const hero = (): Creature => ({
    id: 'hero', type: 'drifter', aggressive: false, level: 3, hp: 10, maxHp: 10,
  });
  const mob = (): Creature => ({
    id: 'mob', type: 'algox-guard', aggressive: true, hp: 20, maxHp: 20, conditions: [],
  });
  const summon = (): Creature => ({
    id: 'fox', type: 'fox', aggressive: false, isSummon: true, hp: 5, maxHp: 5, conditions: [],
  });

  /** A device set to "drifter" — the one thing that used to seed the default. */
  const setUp = (target: Creature) => {
    TestBed.configureTestingModule({
      providers: [
        AppContext,
        StringUtils,
        CreatureFactoryService,
        DamageService,
        { provide: DataLoaderService, useValue: { getData: () => ({ characters: [], monsters: [], decks: [] }) } },
        { provide: LogService, useValue: { init: () => { }, appendDamageToLastBatch: () => { }, appendKillToLastBatch: () => { } } },
        { provide: NotificationService, useValue: { emitErrorMessage: () => { }, emitInfoMessage: () => { } } },
        { provide: DbService, useValue: { getCharacter: () => Promise.resolve([]) } },
        { provide: XpService, useValue: { levelFromXp: () => 1 } },
        { provide: CharacterDeckService, useValue: { loadDeck: () => Promise.resolve(null), resolve: () => [] } },
        { provide: InitiativeService, useValue: { getSelectedCharacterType: () => 'drifter' } },
      ],
    });
    const ctx = TestBed.inject(AppContext);
    ctx.setCreatures([hero(), target]);
    ctx.selectedCreature = target;
    ctx.isGroupSelected = false;
    return ctx;
  };

  it('opens with no attacker picked when the target is an enemy', () => {
    setUp(mob());
    const component = TestBed.createComponent(AttackModalComponent).componentInstance;

    expect(component.selectedCharacterId).toBeNull();
  });

  it('still defaults to the device\'s character when the target is a hero', () => {
    setUp(hero());
    const component = TestBed.createComponent(AttackModalComponent).componentInstance;

    expect(component.selectedCharacterId).toBe('hero');
  });

  it('still defaults when the target is a friendly summon', () => {
    setUp(summon());
    const component = TestBed.createComponent(AttackModalComponent).componentInstance;

    expect(component.selectedCharacterId).toBe('hero');
  });

  it('a card panel prefill\'s known attacker still wins over the enemy-target suppression', () => {
    const ctx = setUp(mob());
    ctx.attackModalPrefill = { attack: 3, armorPen: 0, attackerId: 'hero', ignoreArmor: false };
    const component = TestBed.createComponent(AttackModalComponent).componentInstance;

    expect(component.selectedCharacterId).toBe('hero');
  });
});
