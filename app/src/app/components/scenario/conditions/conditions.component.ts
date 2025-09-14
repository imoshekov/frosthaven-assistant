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

export class ConditionsComponent implements OnInit {
  @Input() creature!: Creature;
  @Input() conditions: CreatureConditions[];
  @Input() immunities: CreatureConditions[];
  @Input() shouldShowBuffs: boolean;
  private activeConditions: CreatureConditions[] = [];
  private activeImmunities: CreatureConditions[] = [];

  @Output() conditionToggled = new EventEmitter<CreatureConditions>();

  constructor() { }

  ngOnInit(): void {
    this.creature?.conditions?.forEach(condition => {
      this.activeConditions.push(condition);
    })
    this.creature?.immunities?.forEach(immunity => {
      this.activeImmunities.push(immunity);
    })
  }

  toggleCondition(condition: CreatureConditions) {
    if (this.isImmune(condition)) return;
    this.activeConditions.includes(condition) ? this.removeCondition(condition) : this.activeConditions.push(condition);
    this.conditionToggled.emit(condition);

  }

  isActive(condition: CreatureConditions): boolean {
    return this.activeConditions.includes(condition);
  }

  isImmune(immunity: CreatureConditions): boolean {
    return this.activeImmunities.includes(immunity);
  }

  private removeCondition(value: string) {
    const index = this.activeConditions.findIndex(c => c === value);
    if (index !== -1) {
      this.activeConditions.splice(index, 1);
    }
  }
}
