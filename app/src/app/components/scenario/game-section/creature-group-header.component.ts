import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppContext } from '../../../app-context';
import { Creature, XP_CAP } from '../../../types/game-types';
import { GlobalTelInputDirective } from '../../../directives/global-tel-input.directive';
import { FormsModule } from '@angular/forms';
import { DbService } from '../../../services/db.service';
import { DataLoaderService } from '../../../services/data-loader.service';
import { NotificationService } from '../../../services/notification.service';
import { XpService } from '../../../services/xp.service';


@Component({
  selector: 'app-creature-group-header',
  templateUrl: './creature-group-header.component.html',
  styleUrls: ['./creature-group-header.component.scss'],
  standalone: true,
  imports: [CommonModule, GlobalTelInputDirective, FormsModule]
})
export class CreatureGroupHeaderComponent {
  @Input() creature!: Creature;

  constructor(public appContext: AppContext, private dbService: DbService, private dataLoader: DataLoaderService, private notificationService: NotificationService, private xpService: XpService) { }

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

  getXpPercentToNext(creature: Creature): number {
    if (!creature.id) return 0;
    const live = this.appContext.findCreature(creature.id);
    return this.xpService.progressToNextLevelPercent(live.totalXp ?? 0);
  }

  async gainXp(creature: Creature, amount = 1): Promise<void> {
    creature.sessionExperience = (creature.sessionExperience ?? 0) + amount;

    const effectiveTotalXp = (creature.totalXp ?? 0) + creature.sessionExperience;
    const clampedTotalXp = Math.min(XP_CAP, effectiveTotalXp);
    creature.totalXp = clampedTotalXp;
  }

  getXpRemainingToNext(creature: Creature): number {
    if (!creature.id) return 0;
    const live = this.appContext.findCreature(creature.id);
    const effectiveXp =
      (live.totalXp ?? 0) + (live.sessionExperience ?? 0);

    return this.xpService.xpToNextLevel(effectiveXp);
  }

  async onSessionXpClick(creature: Creature): Promise<void> {
    if (!creature.id) return;

    const live = this.appContext.findCreature(creature.id);
    const newSession = (live.sessionExperience ?? 0) + 1;
    this.appContext.updateCreatureBaseStat(creature.id, 'sessionExperience', newSession, true);

    await this.applyXpChange(creature.id, 1);
  }

  async onSessionXpBlur(creature: Creature, event: FocusEvent): Promise<void> {
    if (!creature.id) return;

    const input = event.target as HTMLInputElement | null;
    const typed = Number(input?.value);
    if (!Number.isFinite(typed)) return;

    const live = this.appContext.findCreature(creature.id);

    const oldSession = live.sessionExperience ?? 0;
    const newSession = Math.max(0, typed);
    const delta = newSession - oldSession;

    this.appContext.updateCreatureBaseStat(creature.id, 'sessionExperience', newSession, true);

    if (delta !== 0) {
      await this.applyXpChange(creature.id, delta);
    }
  }

  private async applyXpChange(creatureId: string, deltaXp: number): Promise<void> {
    const live = this.appContext.findCreature(creatureId);

    const oldLevel = live.level ?? 1;
    const newTotal = Math.max(0, Math.min(XP_CAP, (live.totalXp ?? 0) + deltaXp));
    const newLevel = this.xpService.levelFromXp(newTotal);

    this.appContext.updateCreatureBaseStat(creatureId, 'totalXp', newTotal, true);
    this.appContext.updateCreatureBaseStat(creatureId, 'level', newLevel, true);
  }
}
