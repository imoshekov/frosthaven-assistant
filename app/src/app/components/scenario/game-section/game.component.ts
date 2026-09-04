import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppContext } from '../../../app-context';
import { Creature } from '../../../types/game-types';
import { effectiveInitiative, effectiveSecondaryInitiative } from '../../../types/turn-state.util';
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
      // Summons are grouped per owner as well as per type: two heroes can each summon
      // the same creature, and they act at different initiatives.
      const key = creature.isSummon
        ? `${creature.type}-${creature.isElite}-${creature.summonOwnerId}`
        : `${creature.type}-${creature.isElite}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(creature);
    }

    this.groupedCreatures = Object.keys(groups).map(type => ({
      type,
      creatureType: groups[type][0],
      creatures: [...groups[type]].sort((a, b) => {
        const numA = Number(a.standee);
        const numB = Number(b.standee);

        const parsedA = Number.isNaN(numA) ? Number.POSITIVE_INFINITY : numA;
        const parsedB = Number.isNaN(numB) ? Number.POSITIVE_INFINITY : numB;

        return parsedA - parsedB;
      })
    }));

  }

  get sortedCreatureGroups() {
    const all = this.appContext.getCreatures();

    return [...this.groupedCreatures].sort((a, b) => {
      const typeA = a.creatureType;
      const typeB = b.creatureType;

      // 1. Initiative (asc). A summon borrows its owner's, so the two land together.
      const initA = effectiveInitiative(typeA, all);
      const initB = effectiveInitiative(typeB, all);
      if (initA !== initB) {
        return initA - initB;
      }

      // 1b. Two players tied on their main (first) card break the tie on their second
      // card's initiative — the real rule for two identical draws — before falling
      // through to the arbitrary aggressive/name/standee ordering below. Applies to
      // summons too (borrowing the owner's second card, same as the first), so tied
      // heroes' summons still cluster with their own owner instead of every tied
      // summon lumping together ahead of every tied hero. Excludes monsters — they
      // have no second card to break a tie with.
      if (!typeA.aggressive && !typeB.aggressive) {
        const secondaryA = effectiveSecondaryInitiative(typeA, all);
        const secondaryB = effectiveSecondaryInitiative(typeB, all);
        if (secondaryA !== secondaryB) {
          return secondaryA - secondaryB;
        }
      }

      // 2. A summon acts just before the hero it belongs to, so it sorts ahead of any
      //    non-summon sharing that initiative.
      if (!!typeA.isSummon !== !!typeB.isSummon) {
        return typeA.isSummon ? -1 : 1;
      }

      // 3. Aggressive: false (characters) before true (monsters)
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
