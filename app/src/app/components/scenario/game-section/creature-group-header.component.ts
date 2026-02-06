import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppContext } from '../../../app-context';
import { Creature, LEVEL_XP, MAX_LEVEL, XP_CAP } from '../../../types/game-types';
import { GlobalTelInputDirective } from '../../../directives/global-tel-input.directive';
import { FormsModule } from '@angular/forms';
import { DbService } from '../../../services/db.service';
import { DataLoaderService } from '../../../services/data-loader.service';
import { NotificationService } from '../../../services/notification.service';
import { Character } from '../../../types/data-file-types';


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

  levelFromXp(xp: number): number {
    const clamped = Math.min(XP_CAP, Math.max(0, xp));
    let level = 1;
    for (let i = 1; i < LEVEL_XP.length; i++) {
      if (clamped >= LEVEL_XP[i]) level = i + 1;
    }
    return Math.min(MAX_LEVEL, level);
  }

  progressToNextLevelPercent(totalXp: number): number {
    const xp = Math.max(0, Math.min(XP_CAP, totalXp));
    const level = this.levelFromXp(xp);

    if (level >= MAX_LEVEL) return 100;

    const start = LEVEL_XP[level - 1];
    const end = LEVEL_XP[level];
    return Math.max(0, Math.min(100, ((xp - start) / (end - start)) * 100));
  }

  // Use this in the template: [style.height.%]="getXpPercentToNext(creature)"
  getXpPercentToNext(creature: Creature): number {
    const effectiveTotalXp = (creature.totalXp ?? 0) + (creature.sessionExperience ?? 0);
    return this.progressToNextLevelPercent(effectiveTotalXp);
  }

  // Persist BOTH total_xp and level together (single source of truth)
  private async persistXpAndLevel(creatureType: string, totalXp: number, level: number): Promise<void> {
    // If you already have a dbService, replace this with: await this.dbService.updateCharacterProgress(...)
    await this.dbService.updateCharacterTotalXp(creatureType, totalXp);
    await this.dbService.updateCharacterLevel(creatureType, level);
  }

  // +1 XP during gameplay (persist every time)
  async gainXp(creature: Creature, amount = 1): Promise<void> {
    creature.sessionExperience = (creature.sessionExperience ?? 0) + amount;

    const effectiveTotalXp = (creature.totalXp ?? 0) + creature.sessionExperience;
    const clampedTotalXp = Math.min(XP_CAP, effectiveTotalXp);
    const newLevel = this.levelFromXp(clampedTotalXp);

    // UI updates immediately
    creature.level = newLevel;

    // Persist truth immediately (every +1)
    await this.persistXpAndLevel(creature.type, clampedTotalXp, newLevel);

    // Optionally keep memory "totalXp" in sync with DB truth:
    creature.totalXp = clampedTotalXp;
  }

  // Manual level edit should update XP truth (NOT level alone)
  async onLevelBlur(creature: Creature, event: FocusEvent): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const requestedLevel = Number(input?.value);

    if (!creature.id) return;
    if (!Number.isFinite(requestedLevel)) return;

    const newLevel = Math.max(1, Math.min(MAX_LEVEL, requestedLevel));
    const newTotalXp = LEVEL_XP[newLevel - 1]; // min XP for that level

    // Update UI state
    this.appContext.updateCreatureBaseStat(creature.id, 'level', newLevel);
    this.appContext.updateCreatureBaseStat(creature.id, 'totalXp', newTotalXp);
    this.appContext.updateCreatureBaseStat(creature.id, 'sessionExperience', 0);

    try {
      await this.persistXpAndLevel(creature.type, newTotalXp, newLevel);

      const hp = this.getHpForCharacterLevel(creature.type, newLevel);
      this.appContext.updateCreatureBaseStat(creature.id, 'hp', hp);
      this.appContext.updateCreatureBaseStat(creature.id, 'maxHp', hp);
    } catch (err) {
      this.notificationService.emitErrorMessage(`Failed to persist level/xp: ${err}`);
    }
  }

  async onSessionXpClick(creature: Creature): Promise<void> {
    if (!creature.id) return;

    // ALWAYS use the live object from appContext
    const live = this.appContext.findCreature(creature.id);

    const newSession = (live.sessionExperience ?? 0) + 1;
    const newTotal = (live.totalXp ?? 0) + 1;
    const newLevel = this.levelFromXp(newTotal);

    // Update UI via appContext (broadcasts to other clients too)
    this.appContext.updateCreatureBaseStat(creature.id, 'sessionExperience', newSession, true);
    this.appContext.updateCreatureBaseStat(creature.id, 'totalXp', newTotal, true);
    this.appContext.updateCreatureBaseStat(creature.id, 'level', newLevel, true);

    // Persist truth
    try {
      await this.persistXpAndLevel(live.type, newTotal, newLevel);
    } catch (err) {
      this.notificationService.emitErrorMessage(`Failed to persist XP: ${err}`);
    }
  }

  async onSessionXpBlur(creature: Creature, event: FocusEvent): Promise<void> {
    if (!creature.id) return;

    const input = event.target as HTMLInputElement | null;
    const typed = Number(input?.value);

    if (!Number.isFinite(typed)) return;

    const live = this.appContext.findCreature(creature.id);

    const oldSession = live.sessionExperience ?? 0;
    const newSession = Math.max(0, typed); // prevent negative session xp
    const delta = newSession - oldSession;

    // Update session XP in UI
    this.appContext.updateCreatureBaseStat(creature.id, 'sessionExperience', newSession, true);

    if (delta === 0) return;

    const newTotal = Math.max(0, Math.min(XP_CAP, (live.totalXp ?? 0) + delta));
    const newLevel = this.levelFromXp(newTotal);

    this.appContext.updateCreatureBaseStat(creature.id, 'totalXp', newTotal, true);
    this.appContext.updateCreatureBaseStat(creature.id, 'level', newLevel, true);

    try {
      await this.persistXpAndLevel(live.type, newTotal, newLevel);
    } catch (err) {
      this.notificationService.emitErrorMessage(`Failed to persist XP: ${err}`);
    }
  }

  private getHpForCharacterLevel(type: string, level: number): number {
    const charData = this.dataLoader.getData().characters.find(c => c.name === type);
    const stats = charData?.stats?.find(s => s.level === level);
    return Number(stats?.health) || 1;
  }
}
