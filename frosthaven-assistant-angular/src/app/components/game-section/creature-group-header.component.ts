import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppContext } from '../../app-context';
import { Creature } from '../../types/game-types';
import { Subject, takeUntil } from 'rxjs';
import { GlobalTelInputDirective } from '../../directives/global-tel-input.directive';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-creature-group-header',
  templateUrl: './creature-group-header.component.html',
  styleUrls: ['./creature-group-header.component.scss'],
  standalone: true,
  imports: [CommonModule, GlobalTelInputDirective, FormsModule]
})
export class CreatureGroupHeaderComponent {
  @Input() creature!: Creature;

  constructor(public appContext: AppContext) { }

  getCreaturePic(creature: Creature): string {
    if (creature.aggressive) {
      if (creature.boss) {
        return `./images/bb/monster.svg`
      }
      return `./images/monster/thumbnail/fh-${creature?.type}.png`
    }
    return `./images/character/thumbnail/fh-${creature?.type}.png`
  }

openConditionModal() {
  this.appContext.selectedCreature = this.creature;
  this.appContext.isGroupSelected = true;
}
}
