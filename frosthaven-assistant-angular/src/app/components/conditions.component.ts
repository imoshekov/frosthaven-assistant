import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Creature, CreatureConditions } from '../types/game-types';
import { CommonModule } from '@angular/common';
import { AppContext } from '../app-context';

@Component({
  selector: 'app-conditions',
  templateUrl: './conditions.component.html',
  styleUrl: './conditions.component.scss',
  standalone: true,
  imports: [CommonModule]
})
export class ConditionsComponent {
  @Input() creature!: Creature;
  @Input() conditions: CreatureConditions[];
  @Input() shouldShowBuffs: boolean;

  @Output() conditionToggled = new EventEmitter<CreatureConditions>();

  constructor() { }

  toggleCondition(condition: CreatureConditions) {
    if (this.creature) {
      this.conditionToggled.emit(condition);
    }
  }
}
