import { Component, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppContext } from '../app-context';
import { Creature } from '../types/game-types';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class GameComponent implements OnDestroy {
  groupedCreatures: { type: string; creatureType: Creature, creatures: Creature[] }[] = [];
  groupedGraveyard: { type: string; creatureType: Creature, creatures: Creature[] }[] = [];
  private unsubscribe$ = new Subject<void>();

  constructor(public appContext: AppContext) {
    this.sortCreatures();
    this.sortGraveyard();
    console.log(this.groupedCreatures)
    console.log(this.groupedGraveyard)
    this.appContext.creatures$.pipe(
      takeUntil(this.unsubscribe$)
    ).subscribe(creatures => {
      this.sortCreatures();
      console.log(this.groupedCreatures)
      console.log(this.groupedGraveyard)
    });

    this.appContext.graveyard$.pipe(
      takeUntil(this.unsubscribe$)
    ).subscribe(creatures => {
      this.sortGraveyard();
    });
  }

  getCreaturePic(creature: Creature): string {
    const subFolder = creature?.aggressive ? 'monster' : 'character';
    return `./../images/${subFolder}/thumbnail/fh-${creature?.type}.png`
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

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
}
