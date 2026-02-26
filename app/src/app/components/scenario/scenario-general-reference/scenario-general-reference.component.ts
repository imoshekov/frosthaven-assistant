import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChevronToggleComponent } from '../../chevron-toggle/chevron-toggle.component';
import { from, distinctUntilChanged, map, shareReplay, switchMap } from 'rxjs';
import { AppContext } from '../../../app-context';
import { DbService } from '../../../services/db.service';

@Component({
  selector: 'app-scenario-general-reference',
  standalone: true,
  imports: [CommonModule, ChevronToggleComponent],
  templateUrl: './scenario-general-reference.component.html',
  styleUrls: ['./scenario-general-reference.component.scss'],
})
export class ScenarioGeneralReferenceComponent {
  private appContext = inject(AppContext);
  private db = inject(DbService);
  public shouldExpand = true;

  readonly vm$ = this.appContext.defaultLevel$.pipe(
    distinctUntilChanged(),
    switchMap(level => from(this.db.getScenarioReference(level)).pipe(
      map(rows => ({
        level,
        ref: (Array.isArray(rows) ? rows[0] : rows) ?? null
      }))
    )),
    shareReplay({ bufferSize: 1, refCount: true })
  );
}