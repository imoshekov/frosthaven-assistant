import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Input, ViewChild } from '@angular/core';
import { Creature, CreatureConditions } from '../../types/game-types';
import { AppContext } from '../../app-context';
import { ConditionsComponent } from '../conditions.component';
import { GlobalTelInputDirective } from '../../directives/global-tel-input.directive';
import { BuffsComponent } from './buffs.component';

@Component({
  selector: 'app-attack-modal',
  standalone: true,
  imports: [CommonModule, ConditionsComponent, GlobalTelInputDirective, BuffsComponent],
  templateUrl: './attack-modal.component.html',
  styleUrl: './attack-modal.component.scss'
})
export class AttackModalComponent {
  @ViewChild(BuffsComponent) buffsComponent!: BuffsComponent;
  public creature: Creature;
  public conditions = Object.values(CreatureConditions);
  public damage = 0;
  public armorPen = 0;
  private tempConditions: CreatureConditions[] = [];
  
  constructor(public appContext: AppContext) {
    this.creature = appContext.selectedCreature;
  }

  toggleCondition(condition: CreatureConditions) {
    this.tempConditions.push(condition);
  }

  confirm() {
    this.tempConditions.forEach(condition => {
      this.creature && this.appContext.toggleCreatureConditions(this.creature.id!, condition);
    });

    this.buffsComponent.publishBuffs();

    this.close();
  }

  close() {
    this.appContext.selectedCreature = null;
  }
}
