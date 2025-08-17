import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppContext } from '../../app-context';
import { Creature, CreatureConditions } from '../../types/game-types';
import { Subject, takeUntil } from 'rxjs';
import { GlobalTelInputDirective } from '../../directives/global-tel-input.directive';
import { FormsModule } from '@angular/forms';
import { ConditionsComponent } from '../conditions.component';


@Component({
  selector: 'app-creature',
  templateUrl: './creature.component.html',
  styleUrls: ['./creature.component.scss'],
  standalone: true,
  imports: [CommonModule, GlobalTelInputDirective, FormsModule, ConditionsComponent]
})
export class CreatureComponent {
  @Input() creature!: Creature;

  constructor(public appContext: AppContext) { }

  openConditionModal() {
    this.appContext.selectedCreature = this.creature;
    this.appContext.isGroupSelected = false;
  }

  toggleCondition(condition: CreatureConditions) {
    this.creature && this.appContext.toggleCreatureConditions(this.creature.id!, condition);
  }
}
