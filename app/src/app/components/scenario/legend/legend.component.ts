import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { from, Observable } from 'rxjs';
import { distinctUntilChanged, map, shareReplay, switchMap } from 'rxjs/operators';

import { AppContext } from '../../../app-context';
import { DbService } from '../../../services/db.service';
import { ScenarioReferenceRow } from '../../../types/db-types';

@Component({
  selector: 'app-legend',
  standalone: true,
  templateUrl: './legend.component.html',
  styleUrls: ['./legend.component.scss'],
  imports: [CommonModule],
})
export class LegendComponent {
  readonly level$: Observable<number>;
  readonly scenarioRef$: Observable<ScenarioReferenceRow | null>;

  constructor(public appContext: AppContext, private db: DbService) {
    this.level$ = this.appContext.defaultLevel$.pipe(
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.scenarioRef$ = this.level$.pipe(
      switchMap(level => from(this.db.getScenarioReference(level))), 
      map(rows => rows[0] ?? null),                                  
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }
}
