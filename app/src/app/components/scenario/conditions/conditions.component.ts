import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { Creature, CreatureConditions } from '../../../types/game-types';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-conditions',
  templateUrl: './conditions.component.html',
  styleUrl: './conditions.component.scss',
  standalone: true,
  imports: [CommonModule]
})

export class ConditionsComponent implements OnInit, OnChanges {
  @Input() creature!: Creature;
  @Input() conditions: CreatureConditions[];
  @Input() immunities: CreatureConditions[];
  @Input() shouldShowBuffs: boolean;
  @Input() showConditionRounds = false;
  private activeConditions: CreatureConditions[] = [];
  private activeImmunities: CreatureConditions[] = [];

  @Output() conditionToggled = new EventEmitter<CreatureConditions>();

  constructor() { }

  ngOnInit(): void {
    this.seedFromCreature();
  }

  /**
   * Reseed when the bound creature changes. The local arrays used to be filled once in
   * ngOnInit, which was fine where this component is recreated per open (the attack
   * modal) but wrong anywhere it outlives a change of creature — the card execution
   * panel switches targets without being destroyed.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['creature'] && !changes['creature'].firstChange) {
      this.seedFromCreature();
    }
  }

  private seedFromCreature(): void {
    this.activeConditions = [...(this.creature?.conditions ?? [])];
    this.activeImmunities = [...(this.creature?.immunities ?? [])];
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

  getConditionRound(condition: CreatureConditions): number | undefined {
    return this.creature?.conditionRounds?.[condition];
  }

  private removeCondition(value: string) {
    const index = this.activeConditions.findIndex(c => c === value);
    if (index !== -1) {
      this.activeConditions.splice(index, 1);
    }
  }
}
