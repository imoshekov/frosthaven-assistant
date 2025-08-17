import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppContext } from '../../app-context';
import { Creature } from '../../types/game-types';
import { Subject, takeUntil } from 'rxjs';
import { GlobalTelInputDirective } from '../../directives/global-tel-input.directive';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-creature',
  templateUrl: './creature.component.html',
  styleUrls: ['./creature.component.scss'],
  standalone: true,
  imports: [CommonModule, GlobalTelInputDirective, FormsModule]
})
export class CreatureComponent {
  @Input() creature!: Creature;

  constructor(public appContext: AppContext) {}

    // Get current value for any stat or condition
  getStatValue(creature: Creature, stat: keyof Creature, options?: { isCondition?: boolean; isTemporary?: boolean }): any {
    if (options?.isCondition) {
      return creature.conditions?.[stat as string] ? 1 : 0;
    } else if (options?.isTemporary) {
      return creature.tempStats?.[stat] ?? 0;
    }
  }
}
