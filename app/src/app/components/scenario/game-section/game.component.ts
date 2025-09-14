import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppContext } from '../../../app-context';
import { Creature } from '../../../types/game-types';
import { Subject, takeUntil } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CreatureGroupHeaderComponent } from './creature-group-header.component';
import { CreatureComponent } from './creature.component';


@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, CreatureGroupHeaderComponent, CreatureComponent]
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

  get sortedCreatureGroups() {
    return [...this.groupedCreatures].sort((a, b) => {
      const typeA = a.creatureType;
      const typeB = b.creatureType;

      // 1. Initiative (asc)
      if ((typeA.initiative ?? 0) !== (typeB.initiative ?? 0)) {
        return (typeA.initiative ?? 0) - (typeB.initiative ?? 0);
      }

      // 2. Aggressive: false (characters) before true (monsters)
      if (typeA.aggressive !== typeB.aggressive) {
        return typeA.aggressive ? 1 : -1;
      }

      // 3. Name (asc, case-insensitive)
      const nameA = (typeA.type || '').toLowerCase();
      const nameB = (typeB.type || '').toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;

      // 4. Elite: true before false
      if (typeA.isElite !== typeB.isElite) {
        return typeA.isElite ? -1 : 1;
      }

      // 5. Standee (numeric if possible)
      const standeeA = typeA.standee ?? 0;
      const standeeB = typeB.standee ?? 0;

      if (standeeA < standeeB) return -1;
      if (standeeA > standeeB) return 1;

      return 0;
    });
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
