import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppContext } from '../../../app-context';
import { Creature, CreatureConditions } from '../../../types/game-types';
import { GlobalTelInputDirective } from '../../../directives/global-tel-input.directive';
import { FormsModule } from '@angular/forms';
import { ConditionsComponent } from '../conditions/conditions.component';
import { NotificationService } from '../../../services/notification.service';


@Component({
  selector: 'app-creature',
  templateUrl: './creature.component.html',
  styleUrls: ['./creature.component.scss'],
  standalone: true,
  imports: [CommonModule, GlobalTelInputDirective, FormsModule, ConditionsComponent]
})
export class CreatureComponent {
  @Input() creature!: Creature;

  constructor(public appContext: AppContext, private notificationService: NotificationService) { }

  openConditionModal() {
    this.appContext.selectedCreature = this.creature;
    this.appContext.isGroupSelected = false;
  }

  toggleCondition(condition: CreatureConditions) {
    this.creature && this.appContext.toggleCreatureConditions(this.creature.id!, condition);
  }

  getHpDisplayValue(creature: Creature): string {
    const current = creature.hp ?? 0;
    const max = creature.maxHp ?? current;
    return `${current}/${max}`;
  }

  getHpValueFromInput(value: string | number): number {
    const raw = `${value}`.trim();
    if (!raw) return 0;

    const [currentValue] = raw.split('/');
    const parsed = Number(currentValue);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  updateCreatureHp(creatureId: string, value: number): void {
    const creature = this.appContext.findCreature(creatureId);
    const maxHp = creature.maxHp ?? creature.hp ?? value;

    const newHp = Math.min(value, maxHp);
    this.appContext.updateCreatureBaseStat(creatureId, 'hp', newHp);

    if (newHp <= 0) {
      this.appContext.killCreature(creatureId);
    }
  }

  updateStandee(creatureId: string, creatureType: string, value: number) {
    this.appContext.updateCreatureBaseStat(creatureId, 'standee', value);
    this.appContext.updateCreatureBaseStat(creatureId, 'name', `${creatureType} - ${value}`);
  }
}
