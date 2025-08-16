import { Component, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppContext } from '../app-context';
import { Creature } from '../types/game-types';
import { Subject, takeUntil } from 'rxjs';
import { GlobalTelInputDirective } from '../directives/global-tel-input.directive';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  standalone: true,
  imports: [CommonModule, GlobalTelInputDirective, FormsModule]
})
export class GameComponent implements OnDestroy {
  groupedCreatures: { type: string; creatureType: Creature, creatures: Creature[] }[] = [];
  groupedGraveyard: { type: string; creatureType: Creature, creatures: Creature[] }[] = [];
  private unsubscribe$ = new Subject<void>();
  public creatureHpInputs: Record<number, string> = {};

  constructor(public appContext: AppContext) {
    this.sortCreatures();
    this.sortGraveyard();
    this.appContext.creatures$.pipe(
      takeUntil(this.unsubscribe$)
    ).subscribe(creatures => {
      this.sortCreatures();
    });

    this.appContext.graveyard$.pipe(
      takeUntil(this.unsubscribe$)
    ).subscribe(creatures => {
      this.sortGraveyard();
    });
  }

  getCreaturePic(creature: Creature): string {
    const subFolder = creature?.aggressive ? 'monster' : 'character';
    return `./images/${subFolder}/thumbnail/fh-${creature?.type}.png`
  }

  private sortCreatures() {
    const groups: { [key: string]: Creature[] } = {};
    for (const creature of this.appContext.getCreatures()) {
      const key = `${creature.type}-${creature.isElite}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(creature);
    }

    this.groupedCreatures = Object.keys(groups).map(type => ({
      type,
      creatureType: groups[type][0],
      creatures: groups[type]
    }));
  }

  private sortGraveyard() {
    const groups: { [key: string]: any[] } = {};
    for (const creature of this.appContext.getCreatures()) {
      const key = `${creature.type}-${creature.isElite}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(creature);
    }

    this.groupedGraveyard = Object.keys(groups).map(type => ({
      type,
      creatureType: groups[type][0],
      creatures: groups[type]
    }));
  }

  // Get current value for any stat or condition
  getStatValue(creature: Creature, stat: keyof Creature, options?: { isCondition?: boolean; isTemporary?: boolean }): any {
    if (options?.isCondition) {
      return creature.conditions?.[stat as string] ? 1 : 0;
    } else if (options?.isTemporary) {
      return creature.tempStats?.[stat] ?? 0;
    }
    return creature[stat];
  }

  // Input handler for any stat
  onStatInput(
    creature: Creature,
    stat: keyof Creature,
    value: string,
    options?: { isCondition?: boolean; isTemporary?: boolean }
  ) {
    const sanitized = value.replace(/\D/g, '');
    const numericValue = sanitized ? parseInt(sanitized, 10) : 0;

    if (options?.isCondition) {
      if (numericValue > 0) {
        creature.conditions = { ...creature.conditions, [stat as string]: true };
      } else {
        // Remove the condition entirely if "0"
        const { [stat as string]: _, ...rest } = creature.conditions ?? {};
        creature.conditions = rest;
      }
    } else if (options?.isTemporary) {
      creature.tempStats = { ...creature.tempStats, [stat]: numericValue };
    } else {
      (creature as any)[stat] = numericValue;
    }
  }

  commitStat(
    creature: Creature,
    stat: keyof Creature,
    options?: { isCondition?: boolean; isTemporary?: boolean; applyToAllOfType?: boolean }
  ) {
    const value = this.getStatValue(creature, stat, options);

    if (options?.applyToAllOfType) {
      this.appContext.getCreatures()
        .filter(c => c.type === creature.type)
        .forEach(c => {
          this.appContext.updateCreatureStat(c.id!, stat, value, options);
        });
    } else {
      this.appContext.updateCreatureStat(creature.id!, stat, value, options);
    }
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
}
