import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppContext } from '../../../app-context';
import { Creature } from '../../../types/game-types';
import { GlobalTelInputDirective } from '../../../directives/global-tel-input.directive';
import { FormsModule } from '@angular/forms';
import { DbService } from '../../../services/db.service';
import { DataLoaderService } from '../../../services/data-loader.service';
import { NotificationService } from '../../../services/notification.service';


@Component({
  selector: 'app-creature-group-header',
  templateUrl: './creature-group-header.component.html',
  styleUrls: ['./creature-group-header.component.scss'],
  standalone: true,
  imports: [CommonModule, GlobalTelInputDirective, FormsModule]
})
export class CreatureGroupHeaderComponent {
  @Input() creature!: Creature;

  constructor(public appContext: AppContext, private dbService: DbService, private dataLoader: DataLoaderService, private notificationService: NotificationService) { }

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

  async onLevelBlur(creature: Creature, event: FocusEvent): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const newLevel = Number(input?.value);

    if (!creature.id) return;
    if (!Number.isFinite(newLevel)) return;
    if (newLevel === creature.level) return;

    this.appContext.updateCreatureBaseStat(creature.id, 'level', newLevel);

    try {
      await this.dbService.updateCharacterLevel(creature.type, newLevel);
      const hp = this.getHpForCharacterLevel(creature.type, newLevel);
      this.appContext.updateCreatureBaseStat(creature.id, 'hp', hp);
      this.appContext.updateCreatureBaseStat(creature.id, 'maxHp', hp);
    } catch (err) {
      this.notificationService.emitErrorMessage(`Failed to persist level: ${err}`);
    }
  }

  private getHpForCharacterLevel(type: string, level: number): number {
    const charData = this.dataLoader.getData().characters.find(c => c.name === type);
    const stats = charData?.stats?.find(s => s.level === level);
    return Number(stats?.health) || 1;
  }
}
