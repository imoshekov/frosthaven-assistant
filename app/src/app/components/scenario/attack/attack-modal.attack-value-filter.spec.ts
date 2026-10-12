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
 * A summon with no printed attack (a healer, a lure) has nothing to select it for in
 * the attacker strip — only an attacking summon belongs there, same as a hero.
 */
describe('AttackModalComponent attacker strip — attack-value filter', () => {
  const owner: Creature = { id: 'hero', type: 'snowflake', aggressive: false, level: 3, hp: 10, maxHp: 10 };
  const monster: Creature = { id: 'mob', type: 'algox-guard', aggressive: true, hp: 8, maxHp: 8, conditions: [] };
  const attackingSummon: Creature = {
    id: 'fox', type: 'fox', aggressive: false, isSummon: true, attack: 3, hp: 5, maxHp: 5, conditions: [],
  };
  const nonAttackingSummon: Creature = {
    id: 'lure', type: 'lure', aggressive: false, isSummon: true, hp: 2, maxHp: 2, conditions: [],
  };

  const setUp = () => {
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
        { provide: InitiativeService, useValue: { getSelectedCharacterType: () => null } },
      ],
    });
    const ctx = TestBed.inject(AppContext);
    ctx.setCreatures([owner, monster, attackingSummon, nonAttackingSummon]);
    ctx.selectedCreature = monster;
    ctx.isGroupSelected = false;
    return TestBed.createComponent(AttackModalComponent).componentInstance;
  };

  it('includes a summon that has a printed attack value', () => {
    const component = setUp();
    expect(component.getHeroes().some(c => c.id === 'fox')).toBe(true);
  });

  it('excludes a summon with no printed attack value', () => {
    const component = setUp();
    expect(component.getHeroes().some(c => c.id === 'lure')).toBe(false);
  });

  it('always includes heroes regardless of any attack stat', () => {
    const component = setUp();
    expect(component.getHeroes().some(c => c.id === 'hero')).toBe(true);
  });
});
