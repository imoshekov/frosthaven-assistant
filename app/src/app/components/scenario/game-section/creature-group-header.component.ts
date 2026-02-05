import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppContext } from '../../../app-context';
import { Creature } from '../../../types/game-types';
import { Subject, takeUntil } from 'rxjs';
import { GlobalTelInputDirective } from '../../../directives/global-tel-input.directive';
import { FormsModule } from '@angular/forms';
import { DbService } from '../../../services/db.service';


@Component({
  selector: 'app-creature-group-header',
  templateUrl: './creature-group-header.component.html',
  styleUrls: ['./creature-group-header.component.scss'],
  standalone: true,
  imports: [CommonModule, GlobalTelInputDirective, FormsModule]
})
export class CreatureGroupHeaderComponent {
  @Input() creature!: Creature;

  constructor(public appContext: AppContext, private dbService: DbService) { }

  getCreaturePic(creature: Creature): string {
    if (creature.aggressive) {
      return `./images/monster/thumbnail/fh-${creature?.type}.png`
    }
    return `./images/character/thumbnail/fh-${creature?.type}.png`
  }

  onImgError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = './images/bb/daemon-skull.svg';
  }

  openConditionModal() {
    this.appContext.selectedCreature = this.creature;
    this.appContext.isGroupSelected = true;
  }

  hasExtraStats(creature: Creature): boolean {
    return (creature.armor + creature.roundArmor > 0) ||
      (creature.retaliate + creature.roundRetaliate > 0) ||
      (creature.aggressive && creature.actions?.length > 0) ||
      (creature.flying)
  }

  updateCreatureHp(creatureId: string, value: number): void {
    const creature = this.appContext.findCreature(creatureId);

    const newHp = Math.min(value, creature.maxHp);
    this.appContext.updateCreatureBaseStat(creatureId, 'hp', newHp);

    if (newHp <= 0) {
      this.appContext.killCreature(creatureId);
    }
  }

  async onLevelBlur(creature: Creature, event: FocusEvent) {
    const input = event.target as HTMLInputElement;
    const newLevel = Number(input.value);

    if (Number.isNaN(newLevel) || newLevel === creature.level) {
      return;
    }

    this.appContext.updateCreatureBaseStat(
      creature.id!,
      'level',
      newLevel,
      true
    );

    try {
      await this.dbService.updateCharacterLevel(creature.type, newLevel);
    } catch (err) {
      console.error('Failed to persist level', err);
    }
  }

}
