import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppContext } from '../../../app-context';
import { Creature, CreatureConditions } from '../../../types/game-types';
import { GlobalTelInputDirective } from '../../../directives/global-tel-input.directive';
import { FormsModule } from '@angular/forms';
import { ConditionsComponent } from '../conditions/conditions.component';
import { NotificationService } from '../../../services/notification.service';
import { isInitiativeRevealed } from '../../../types/turn-state.util';


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

  /**
   * Summons render like monsters: standee number, editable HP and conditions. They
   * are friendly, but they are figures on the board, not players.
   */
  get isMonsterLike(): boolean {
    return !!this.creature.aggressive || !!this.creature.isSummon;
  }

  /**
   * A summon's row carries the same colour its group plate does — its owner's class
   * colour, or the generic friendly colour if the owner can't be found. Without this
   * the row falls back to the plain `friendly` background and reads as a black band
   * hanging under a coloured plate. Mirrors `getSummonBackground` in the group header,
   * which colours the plate itself.
   */
  get summonBackground(): string | null {
    if (!this.creature.isSummon) return null;
    const owner = this.creature.summonOwnerId
      ? this.appContext.getCreatures().find(c => c.id === this.creature.summonOwnerId)
      : null;
    return owner ? `var(--${owner.type}-color)` : 'var(--friendly-color)';
  }

  /**
   * True once the hero has both cards revealed (played), which is when their name
   * becomes clickable. Gating on reveal rather than on `cardAId`/`cardBId` being
   * resolved matters: an ambiguous initiative (several decks collide) or an
   * unauthored deck never resolves those ids on its own, and the card panel — not
   * this check — is what lets the player pick or enter manually.
   */
  bothCardsSet(): boolean {
    return isInitiativeRevealed(this.creature);
  }

  /** Opens the card execution panel. Only reachable once both cards are set. */
  openCardPanel(): void {
    if (!this.bothCardsSet()) return;
    this.appContext.cardPanelCreatureId = this.creature.id ?? null;
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
