import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Creature, CreatureConditions } from '../../../types/game-types';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-conditions',
  templateUrl: './conditions.component.html',
  styleUrl: './conditions.component.scss',
  standalone: true,
  imports: [CommonModule]
})

export class ConditionsComponent implements OnInit{
  @Input() creature!: Creature;
  @Input() conditions: CreatureConditions[];
  @Input() shouldShowBuffs: boolean;
  private activeConditions: CreatureConditions[] = [];

  @Output() conditionToggled = new EventEmitter<CreatureConditions>();

  constructor() { }

  ngOnInit(): void {
    this.creature?.conditions?.forEach(condition => {
      this.activeConditions.push(condition);
    })
  }

  toggleCondition(condition: CreatureConditions) {
    if (this.creature) {
      this.activeConditions.includes(condition) ? this.removeCondition(condition) : this.activeConditions.push(condition);
      this.conditionToggled.emit(condition);
    }
  }

  isActive(condition: CreatureConditions) {
    return this.activeConditions.includes(condition);
  }

  private removeCondition(value: string) {
    const index = this.activeConditions.findIndex(c => c === value);
    if (index !== -1) {
      this.activeConditions.splice(index, 1);
    }
  }
}
