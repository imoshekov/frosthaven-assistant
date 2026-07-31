import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { Creature, CreatureConditions } from '../../../types/game-types';
import { AppContext } from '../../../app-context';
import { ConditionsComponent } from '../conditions/conditions.component';
import { GlobalTelInputDirective } from '../../../directives/global-tel-input.directive';
import { BuffsComponent } from './buffs.component';
import { FormsModule } from '@angular/forms';
import { InitiativeService } from '../../../services/initiative.service';
import { LogService } from '../../../services/log.service';

@Component({
  selector: 'app-attack-modal',
  standalone: true,
  imports: [CommonModule, ConditionsComponent, GlobalTelInputDirective, BuffsComponent, FormsModule],
  templateUrl: './attack-modal.component.html',
  styleUrl: './attack-modal.component.scss'
})
export class AttackModalComponent {

  @ViewChild(BuffsComponent) buffsComponent!: BuffsComponent;
  public creature: Creature;
  public conditions = Object.values(CreatureConditions);
  public attack = 0;
  public armorPen = 0;
  public damage = 0;
  public selectedCharacterId: string | null = null;
  private tempConditions: CreatureConditions[] = [];

  constructor(
    public appContext: AppContext,
    private initiativeService: InitiativeService,
    private logService: LogService
  ) {
    this.creature = appContext.selectedCreature;
    this.selectedCharacterId = this.getDefaultSelectedCharacterId();
  }

  get shouldShowBuffs(): boolean {
    const {
      armor = 0,
      roundArmor = 0,
      retaliate = 0,
      roundRetaliate = 0
    } = this.creature ?? {};

    return (
      armor > 0 ||
      roundArmor > 0 ||
      retaliate > 0 ||
      roundRetaliate > 0
    );
  }

  getHeroes(): Creature[] {
    return this.appContext.getCreatures().filter(c => !c.aggressive);
  }

  private getDefaultSelectedCharacterId(): string | null {
    const selectedCharacterType = this.initiativeService.getSelectedCharacterType();
    if (!selectedCharacterType) {
      return null;
    }

    const selectedHero = this.getHeroes().find(hero => hero.type === selectedCharacterType);
    return selectedHero?.id ?? null;
  }

  selectCharacter(characterId: string | null): void {
    this.selectedCharacterId = this.selectedCharacterId === characterId ? null : characterId;
  }

  toggleCondition(condition: CreatureConditions) {
    this.tempConditions.push(condition);
  }

  attackCreature(): void {
    if (this.attack <= 0) {
      return;
    }
    const calculatedDamage = this.calculateDamage();
    const resultHp = this.creature.hp - calculatedDamage;
    this.appContext.updateCreatureBaseStat(this.creature.id!, 'hp', this.creature.hp - calculatedDamage);
    if (resultHp <= 0) {
      this.appContext.killCreature(this.creature.id!);
    }
  }

  calculateDamage(): number {
    let damage = this.attack;

    // Apply armor
    const effectiveArmor = Math.max(
      (this.creature.armor + this.creature.roundArmor) - this.armorPen,
      0
    );
    damage -= effectiveArmor;

    // Apply conditions
    const conditionEffects: Partial<Record<CreatureConditions, (d: number) => number>> = {
      [CreatureConditions.poison]: d => d + 1,
      [CreatureConditions.brittle]: d => d * 2,
      [CreatureConditions.ward]: d => Math.floor(d / 2),
    };

    const modifiers = this.creature.conditions
      .filter(c => conditionEffects[c] && damage > 0)
      .map(c => conditionEffects[c]);

    damage = modifiers.reduce((d, fn) => fn(d), damage);
    this.damage = Math.max(damage, 0);
    return this.damage;
  }

  confirm() {
    const currentHp = this.creature?.hp ?? 0;
    this.attackCreature();
    this.tempConditions.forEach(condition => {
      this.creature && this.appContext.toggleCreatureConditions(this.creature.id!, condition);
    });
    
    // Record damage if a character is selected, capped at the monster's HP before the attack
    if (this.selectedCharacterId && this.damage > 0) {
      const selectedChar = this.appContext.getCreatures().find(c => c.id === this.selectedCharacterId);
      if (selectedChar && selectedChar.type) {
        const effectiveDamage = Math.min(this.damage, currentHp);
        this.appContext.recordDamage(selectedChar.type, effectiveDamage);
        this.logService.appendDamageToLastBatch(selectedChar.type, effectiveDamage);
      }
    }
    
    this.buffsComponent?.publishBuffs();
    this.close();
  }
  close() {
    this.appContext.selectedCreature = null;
  }
}
