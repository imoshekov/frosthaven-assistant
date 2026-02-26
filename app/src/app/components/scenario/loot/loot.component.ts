import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChevronToggleComponent } from '../../chevron-toggle/chevron-toggle.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AppContext } from '../../../app-context';
import { Scenario } from '../../../types/data-file-types';

@Component({
  selector: 'app-loot',
  standalone: true,
  imports: [CommonModule, ChevronToggleComponent],
  templateUrl: './loot.component.html',
  styleUrls: ['./loot.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LootComponent implements OnInit, OnDestroy {
  @Input() scenarioFile?: any;

  scenario: Scenario | null = null;
  shouldExpand: boolean = true;
  private destroy$ = new Subject<void>();

  constructor(
    private appContext: AppContext,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    if (this.scenarioFile) {
      this.scenario = this.scenarioFile as Scenario;
      this.cd.markForCheck();
    }

    this.appContext.scenarioFile$
      .pipe(takeUntil(this.destroy$))
      .subscribe(file => {
        if (file) {
          this.scenario = file as Scenario;
          this.cd.markForCheck();
        }
      });
  }

  trackByKey(item: any): string {
    return item.key;
  }

  /**
   * Produce a sorted list of the loot deck configuration entries.
   *
   * Order is:
   *   1. money
   *   2. metal
   *   3. lumber
   *   4. hide
   *   5. any other keys (herbs, etc) alphabetically
   *   6. random_item (always last)
   */
  get sortedLoot(): Array<{ key: string; value: any }> {
    const cfg = this.scenario?.lootDeckConfig;
    if (!cfg) {
      return [];
    }
    const order = ['money', 'metal', 'lumber', 'hide'];
    const entries = Object.entries(cfg).map(([k, v]) => ({ key: k, value: v }));
    entries.sort((a, b) => {
      const ai = order.indexOf(a.key);
      const bi = order.indexOf(b.key);
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }
      if (a.key === 'random_item') return 1;
      if (b.key === 'random_item') return -1;
      // alphabetical fallback covers herbs or other entries
      return a.key.localeCompare(b.key);
    });
    return entries;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
