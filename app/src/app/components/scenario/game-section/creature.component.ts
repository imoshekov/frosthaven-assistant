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

    const [currentValue] = raw.split(/[\/#]/);
    const parsed = Number(currentValue);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  getMaxHpFromInput(value: string | number): number | null {
    const raw = `${value}`.trim();
    if (!raw) return null;

    const parts = raw.split(/[\/#]/);
    if (parts.length < 2) return null;

    const parsed = Number(parts[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  updateCreatureHp(creatureId: string, value: number, maxHpValue?: number): void {
    const creature = this.appContext.findCreature(creatureId);
    const currentMaxHp = creature.maxHp ?? creature.hp ?? value;
    const newMaxHp = maxHpValue !== undefined && maxHpValue > 0 ? maxHpValue : currentMaxHp;

    const newHp = Math.min(value, newMaxHp);
    this.appContext.updateCreatureBaseStat(creatureId, 'hp', newHp);

    if (newMaxHp !== currentMaxHp) {
      this.appContext.updateCreatureBaseStat(creatureId, 'maxHp', newMaxHp);
    }

    if (newHp <= 0) {
      this.appContext.killCreature(creatureId);
    }
  }

  updateStandee(creatureId: string, creatureType: string, value: number) {
    this.appContext.updateCreatureBaseStat(creatureId, 'standee', value);
    this.appContext.updateCreatureBaseStat(creatureId, 'name', `${creatureType} - ${value}`);
  }
}
