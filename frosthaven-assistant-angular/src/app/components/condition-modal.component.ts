import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Creature, CreatureConditions } from '../types/game-types';
import { AppContext } from '../app-context';
import { ConditionsComponent } from './conditions.component';
import { GlobalTelInputDirective } from '../directives/global-tel-input.directive';

enum BuffTypes {
  armor = "armor",
  retaliate = "retaliate",
  roundArmor = "roundArmor",
  roundRetaliate = "roundRetaliate",
}
interface Buffs {
  type: BuffTypes,
  value: number;
}
@Component({
  selector: 'app-condition-modal',
  standalone: true,
  imports: [CommonModule, ConditionsComponent, GlobalTelInputDirective],
  templateUrl: './condition-modal.component.html',
  styleUrl: './condition-modal.component.scss'
})
export class ConditionModalComponent {
  public creature: Creature;
  public conditions = Object.values(CreatureConditions);
  private tempConditions: CreatureConditions[] = [];
  private buffs: Buffs[] = []

  constructor(public appContext: AppContext) {
    this.creature = appContext.selectedCreature;
  }

  toggleCondition(condition: CreatureConditions) {
    this.tempConditions.push(condition);
  }

  storeBuff(stat: string, value: number) {
    console.log('hrte')
    this.buffs.push({
      type: stat as BuffTypes,
      value: value
    })
  }

  confirm() {
    this.tempConditions.forEach(condition => {
      this.creature && this.appContext.toggleCreatureConditions(this.creature.id!, condition);
    });

    this.buffs.forEach(buff => {
      this.appContext.updateCreatureBaseStat(this.creature.id!, buff.type, buff.value, true);
    })


    this.close();
  }

  close() {
    this.appContext.selectedCreature = null;
  }
}
