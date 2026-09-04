import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppContext } from '../../../app-context';
import { Creature } from '../../../types/game-types';
import { GlobalTelInputDirective } from '../../../directives/global-tel-input.directive';
import { FormsModule } from '@angular/forms';
import { DbService } from '../../../services/db.service';
import { DataLoaderService } from '../../../services/data-loader.service';
import { NotificationService } from '../../../services/notification.service';
import { XpService } from '../../../services/xp.service';
import { anyHeroPending, isHero, isInitiativeSubmitted } from '../../../types/turn-state.util';


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

  /**
   * A summon is friendly but statted like a monster, so it takes the monster stat
   * block (attack, move, shield, retaliate, inflicted conditions) rather than the
   * hero block (level badge, XP bar).
   */
  get isMonsterLike(): boolean {
    return !!this.creature.aggressive || !!this.creature.isSummon;
  }

  /** Hero-only chrome: level badge, XP bar and session XP. */
  get isHeroCreature(): boolean {
    return isHero(this.creature);
  }

  /** Summons have no initiative of their own — they act on their owner's. */
  get showsInitiative(): boolean {
    return !this.creature.isSummon;
  }

  /**
   * Whether this hero has committed their turn — both cards submitted, or already
   * revealed. Drives the eye-icon badge: `ready` (green fill) or `not-ready` (dark
   * fill) — the two are exact opposites so the icon always has one background or
   * the other, never neither. A prior version tested `hiddenInitiative == 0`
   * directly, which is false for a freshly-added hero whose `hiddenInitiative` is
   * still `undefined`/`null` rather than `0` — neither class matched, so the badge
   * fell through to its bare, background-less default and looked "stuck
   * transparent" no matter what `.not-ready` was styled with.
   */
  isInitiativeReady(creature: Creature): boolean {
    return isInitiativeSubmitted(creature);
  }

  getCreaturePic(creature: Creature): string {
    if (creature.isSummon) {
      // Token art is optional on a card; fall back to the generic summon token.
      return creature.summonImage
        ? `./images/${creature.summonImage}`
        : './images/summons/fh.png';
    }
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

  /**
   * Hidden mode (icons) is only active when at least one hero has submitted
   * their initiative but not all have. This protects submitted initiatives as
   * secrets until everyone is ready, while keeping initiatives visible when
   * nobody has submitted yet (fresh round state) or all have submitted.
   */
  get initiativesRevealed(): boolean {
    const creatures = this.appContext.getCreatures();
    if (creatures.filter(isHero).length === 0) return true;
    return !anyHeroPending(creatures); // hide only while some have pending hidden initiative
  }

  onMonsterInitiativeBlur(creatureId: string, event: FocusEvent): void {
    const value = +(event.target as HTMLInputElement).value;
    this.appContext.updateCreatureBaseStat(creatureId, 'initiative', value, true);
    this.appContext.revealHeroInitiatives();
  }

  hasExtraStats(creature: Creature): boolean {
    return (creature.armor + creature.roundArmor > 0) ||
      (creature.retaliate + creature.roundRetaliate > 0) ||
      ((creature.aggressive || creature.isSummon) && creature.actions?.length > 0) ||
      (creature.range > 0) ||
      (creature.flying)
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

  getXpPercentToNext(totalXp): number {
    return this.xpService.progressToNextLevelPercent(totalXp ?? 0);
  }

  getXpRemainingToNext(totalXp): number {
    return this.xpService.xpToNextLevel(totalXp ?? 0);
  }

  onSessionXpClick(creature: Creature) {
    if (!creature.id) return;
    const current = this.appContext.findCreature(creature.id).sessionExperience ?? 0;
    this.setSessionXp(creature.id, current + 1);
  }

  onSessionXpBlur(creature: Creature, event: FocusEvent) {
    if (!creature.id) return;

    const input = event.target as HTMLInputElement | null;
    const typed = Number(input?.value);
    if (!Number.isFinite(typed)) return;

    this.setSessionXp(creature.id, typed);
  }

  private setSessionXp(creatureId: string, newSessionXp: number) {
    const live = this.appContext.findCreature(creatureId);

    const oldSession = live.sessionExperience ?? 0;
    const clamped = Math.max(0, newSessionXp);
    const delta = clamped - oldSession;

    if (delta === 0) return;

    const newTotal = Math.max(0, (live.totalXp ?? 0) + delta);
    const newLevel = this.xpService.levelFromXp(newTotal);

    // Apply all three XP-related fields in a single emission so they
    // land in one log batch and can be undone together with one click.
    this.appContext.updateCreatureMultipleStats(
      creatureId,
      {
        sessionExperience: clamped,
        totalXp: newTotal,
        level: newLevel,
      },
      true
    );
  }
}