import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { combineLatest, map, filter, take, tap } from 'rxjs';
import { AppContext } from '../../../app-context';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-scenario-monster-reference',
  templateUrl: './scenario-monster-reference.component.html',
  styleUrls: ['./scenario-monster-reference.component.scss']
})
export class ScenarioMonsterReference {
  private appContext = inject(AppContext);

  // View-model (for template)
  vm$ = combineLatest([
    this.appContext.scenarioId$,
    this.appContext.defaultLevel$
  ]).pipe(
    map(([scenarioId, level]) => ({
      scenarioId,
      level,
      ready: scenarioId != null && level != null
    }))
  );

  // 🔔 One-time trigger when scenario + level are set
  private buildOnce$ = combineLatest([
    this.appContext.scenarioId$,
    this.appContext.defaultLevel$
  ]).pipe(
    filter(([scenarioId, level]) => scenarioId != null && level != null),
    take(1),
    tap(([scenarioId, level]) => {
      this.buildMonsterArray(scenarioId!, level!);
    })
  );

  constructor() {
    // start the trigger
    this.buildOnce$.subscribe();
  }

  private buildMonsterArray(scenarioId: number, level: number): void {
    console.log('Building monsters for scenario', scenarioId, 'at level', level);
    // 👉 put your getAllScenarioMonsters + stats logic here
  }
}