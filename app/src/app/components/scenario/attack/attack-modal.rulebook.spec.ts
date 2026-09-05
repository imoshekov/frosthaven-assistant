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
import { Creature, CreatureConditions } from '../../../types/game-types';

/**
 * The same rulebook behaviour the card panel enforces, on the manual path: ward and
 * brittle are used up by the attack they modify, and the target's retaliate comes
 * back at whichever hero is credited with the attack.
 */
describe('AttackModalComponent rulebook behaviour', () => {
  let appContext: AppContext;
  let component: AttackModalComponent;

  const hero = (): Creature => ({
    id: 'hero', type: 'drifter', aggressive: false, level: 3, hp: 10, maxHp: 10,
  });

  const open = (over: Partial<Creature> = {}) => {
    TestBed.resetTestingModule();
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

    appContext = TestBed.inject(AppContext);
    const target: Creature = {
      id: 'mob', type: 'algox-guard', aggressive: true, hp: 20, maxHp: 20, conditions: [], ...over,
    };
    appContext.setCreatures([hero(), target]);
    appContext.selectedCreature = target;
    appContext.isGroupSelected = false;

    component = TestBed.createComponent(AttackModalComponent).componentInstance;
    component.selectedCharacterId = 'hero';
    component.attack = 4;
    return component;
  };

  const creature = (id: string) => appContext.getCreatures().find(c => c.id === id);

  describe('poison raises the attack value', () => {
    it('gets through a shield that would block the printed attack exactly', () => {
      open({ armor: 4, conditions: [CreatureConditions.poison] });
      component.confirm();

      expect(creature('mob')!.hp).toBe(19); // (4 + 1) − 4
    });

    it('is left on the target', () => {
      open({ conditions: [CreatureConditions.poison] });
      component.confirm();

      expect(creature('mob')!.conditions).toEqual([CreatureConditions.poison]);
    });
  });

  describe('ward and brittle are used up', () => {
    it('halves the damage and comes off', () => {
      open({ conditions: [CreatureConditions.ward] });
      component.confirm();

      expect(creature('mob')!.hp).toBe(18);
      expect(creature('mob')!.conditions).toEqual([]);
    });

    it('doubles the damage and comes off', () => {
      open({ conditions: [CreatureConditions.brittle] });
      component.confirm();

      expect(creature('mob')!.hp).toBe(12);
      expect(creature('mob')!.conditions).toEqual([]);
    });

    it('clears the round marker along with the condition', () => {
      open({ conditions: [CreatureConditions.ward], conditionRounds: { ward: 2 } as any });
      component.confirm();

      expect(creature('mob')!.conditionRounds?.['ward']).toBeUndefined();
    });

    it('stays put when the attack is blocked outright', () => {
      open({ armor: 9, conditions: [CreatureConditions.ward] });
      component.confirm();

      expect(creature('mob')!.conditions).toEqual([CreatureConditions.ward]);
    });

    it('leaves the target\'s other conditions alone', () => {
      open({ conditions: [CreatureConditions.wound, CreatureConditions.brittle] });
      component.confirm();

      expect(creature('mob')!.conditions).toEqual([CreatureConditions.wound]);
    });
  });

  describe('retaliate', () => {
    it('comes back at the credited hero', () => {
      open({ retaliate: 3 });
      component.confirm();

      expect(creature('hero')!.hp).toBe(10 - 3);
    });

    it('is offered with the target\'s total', () => {
      open({ retaliate: 2, roundRetaliate: 1 });
      expect(component.retaliateDamage).toBe(3);
    });

    it('can be switched off when the attacker was out of range', () => {
      open({ retaliate: 3 });
      component.toggleRetaliate();
      component.confirm();

      expect(creature('hero')!.hp).toBe(10);
    });

    it('is skipped when no attacker is credited', () => {
      open({ retaliate: 3 });
      component.selectedCharacterId = null;
      component.confirm();

      expect(creature('hero')!.hp).toBe(10);
    });

    it('still fires when the attack was fully blocked', () => {
      open({ retaliate: 3, armor: 9 });
      component.confirm();

      expect(creature('mob')!.hp).toBe(20);
      expect(creature('hero')!.hp).toBe(10 - 3);
    });

    it('does not fire when nothing was attacked at all', () => {
      open({ retaliate: 3 });
      component.attack = 0;
      component.confirm();

      expect(creature('hero')!.hp).toBe(10);
    });

    it('never takes the hero below zero', () => {
      open({ retaliate: 99 });
      component.confirm();

      expect(creature('hero')!.hp).toBe(0);
    });
  });
});
