import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Input, ViewChild } from '@angular/core';
import { Creature, CreatureConditions } from '../../types/game-types';
import { AppContext } from '../../app-context';
import { ConditionsComponent } from '../conditions.component';
import { GlobalTelInputDirective } from '../../directives/global-tel-input.directive';
import { BuffsComponent } from './buffs.component';
import { FormsModule } from '@angular/forms';

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
  private tempConditions: CreatureConditions[] = [];

  constructor(public appContext: AppContext) {
    this.creature = appContext.selectedCreature;
  }

  toggleCondition(condition: CreatureConditions) {
    this.tempConditions.push(condition);
  }

  calculateDamage(): number {
    if (this.attack <= 0) {
      return 0;
    }

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

    return Math.max(damage, 0);
  }


  confirm() {
    this.tempConditions.forEach(condition => {
      this.creature && this.appContext.toggleCreatureConditions(this.creature.id!, condition);
    });
    this.calculateDamage();
    this.buffsComponent.publishBuffs();

    this.close();
  }

  close() {
    this.appContext.selectedCreature = null;
  }
}
