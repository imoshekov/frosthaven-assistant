import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { AttackModalComponent } from './attack-modal.component';
import { AppContext, CustomAttackResult } from '../../../app-context';
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
import { Creature, CreatureConditions } from '../../../types/game-types';

/**
 * The "ignore armor" toggle: off by default on every open, overrides pierce entirely
 * (rather than stacking with it) when on, and is passed through to the card panel's
 * "Custom…" flow the same way attack/armorPen/conditions already are.
 */
describe('AttackModalComponent ignore armor', () => {
  let appContext: AppContext;
  let component: AttackModalComponent;

  // Factories, not shared consts: AppContext.updateCreatureBaseStat mutates the
  // creature object in place ((creatureToUpdate as any)[stat] = value), so a single
  // shared object would carry HP changes from one test into the next.
  const hero = (): Creature => ({
    id: 'hero', type: 'drifter', aggressive: false, level: 3, hp: 10, maxHp: 10,
  });
  // A heavily armored target: pierce alone (short of the shield value) should still
  // leave some through, so an ignoreArmor-vs-pierce difference is observable.
  const armoredMob = (): Creature => ({
    id: 'mob', type: 'algox-guard', aggressive: true, hp: 20, maxHp: 20, armor: 5, conditions: [],
  });

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
    const mob = armoredMob();
    ctx.setCreatures([hero(), mob]);
    ctx.selectedCreature = mob;
    ctx.isGroupSelected = false;
    return ctx;
  };

  beforeEach(() => {
    appContext = setUp();
    component = TestBed.createComponent(AttackModalComponent).componentInstance;
    component.selectedCharacterId = 'hero';
    component.attack = 5;
    component.armorPen = 1; // less than the mob's 5 armor — leaves some blocked
  });

  it('starts off on every fresh open', () => {
    expect(component.ignoreArmor).toBe(false);
  });

  it('reduces damage normally with the toggle off, pierce partially through', () => {
    expect(component.calculateDamage()).toBe(5 - (5 - 1)); // 1
  });

  it('ignores the shield entirely once toggled on, beating pierce', () => {
    component.toggleIgnoreArmor();
    expect(component.ignoreArmor).toBe(true);
    expect(component.calculateDamage()).toBe(5); // full attack, no shield at all
  });

  it('toggles back off and restores the normal calculation', () => {
    component.toggleIgnoreArmor();
    component.toggleIgnoreArmor();
    expect(component.ignoreArmor).toBe(false);
    expect(component.calculateDamage()).toBe(1);
  });

  it('applies full unarmoured damage to the target on confirm', () => {
    component.toggleIgnoreArmor();
    component.confirm();
    expect(appContext.getCreatures().find(c => c.id === 'mob')!.hp).toBe(20 - 5);
  });

  describe('opened via the card panel "Custom…" flow', () => {
    let received: CustomAttackResult | null;

    const openWithPrefill = (ignoreArmor: boolean) => {
      appContext.attackModalPrefill = { attack: 5, armorPen: 1, attackerId: 'hero', ignoreArmor };
      component = TestBed.createComponent(AttackModalComponent).componentInstance;
    };

    beforeEach(() => {
      received = null;
      appContext.customAttackResult$.subscribe(r => { received = r; });
      openWithPrefill(false);
    });

    it('starts off when the card does not print it', () => {
      expect(component.ignoreArmor).toBe(false);
    });

    it('starts on when the card does print it, rather than dropping it', () => {
      openWithPrefill(true);
      expect(component.ignoreArmor).toBe(true);
    });

    it('hands a card-printed flag straight back when nothing is touched', () => {
      openWithPrefill(true);
      component.confirm();

      expect(received!.ignoreArmor).toBe(true);
    });

    it('hands the flag back to the panel instead of applying it here', () => {
      component.toggleIgnoreArmor();
      component.confirm();

      expect(received).toEqual({ attack: 5, armorPen: 1, conditions: [], ignoreArmor: true });
      // Nothing applied directly — the panel's own Execute is what commits it.
      expect(appContext.getCreatures().find(c => c.id === 'mob')!.hp).toBe(20);
    });

    it('lets the player switch a printed flag back off', () => {
      openWithPrefill(true);
      component.toggleIgnoreArmor();
      component.confirm();

      expect(received!.ignoreArmor).toBe(false);
    });
  });

  describe('condition toggles', () => {
    it('does not apply a condition that was switched on and back off', () => {
      appContext.attackModalPrefill = { attack: 5, armorPen: 0, attackerId: 'hero', ignoreArmor: false };
      component = TestBed.createComponent(AttackModalComponent).componentInstance;

      let handed: CustomAttackResult | null = null;
      appContext.customAttackResult$.subscribe(r => { handed = r; });

      component.toggleCondition(CreatureConditions.poison);
      component.toggleCondition(CreatureConditions.poison);
      component.confirm();

      // Used to hand back one poison: the list was push-only and the panel
      // de-duplicates, so the cancelling second click was swallowed.
      expect(handed!.conditions).toEqual([]);
    });

    it('applies a condition switched on once', () => {
      appContext.attackModalPrefill = { attack: 5, armorPen: 0, attackerId: 'hero', ignoreArmor: false };
      component = TestBed.createComponent(AttackModalComponent).componentInstance;

      let handed: CustomAttackResult | null = null;
      appContext.customAttackResult$.subscribe(r => { handed = r; });

      component.toggleCondition(CreatureConditions.poison);
      component.toggleCondition(CreatureConditions.wound);
      component.confirm();

      expect(handed!.conditions).toEqual([CreatureConditions.poison, CreatureConditions.wound]);
    });

    it('applies each flipped condition exactly once on the direct path', () => {
      // The direct path toggles the creature's own conditions, so a cancelled pair
      // must not reach it at all — two toggles there would flip it on and off again.
      const applied: CreatureConditions[] = [];
      spyOn(appContext, 'toggleCreatureConditions').and.callFake(
        (_id: string, condition: CreatureConditions) => { applied.push(condition); }
      );

      component = TestBed.createComponent(AttackModalComponent).componentInstance;
      component.selectedCharacterId = 'hero';
      component.attack = 3;
      component.toggleCondition(CreatureConditions.poison);
      component.toggleCondition(CreatureConditions.poison);
      component.toggleCondition(CreatureConditions.wound);
      component.confirm();

      expect(applied).toEqual([CreatureConditions.wound]);
    });
  });
});
