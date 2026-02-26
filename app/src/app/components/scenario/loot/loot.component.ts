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
  /** direct file override, used rarely */
  @Input() scenarioFile?: any;

  scenario: Scenario | null = null;
  shouldExpand: boolean = true; // collapsed/expanded state
  private destroy$ = new Subject<void>();

  constructor(
    private appContext: AppContext,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // if consumer gave us the file explicitly, use it first
    if (this.scenarioFile) {
      this.scenario = this.scenarioFile as Scenario;
      this.cd.markForCheck();
    }

    // otherwise listen for the context's latest scenario file
    this.appContext.scenarioFile$
      .pipe(takeUntil(this.destroy$))
      .subscribe(file => {
        if (file) {
          this.scenario = file as Scenario;
          // OnPush component won't update automatically without marking
          this.cd.markForCheck();
        }
      });
  }

  trackByKey(index: number, item: any): string {
    // keyvalue pipe yields objects with `key` and `value`, but the generic
    // types are unknown, so loosen the signature to avoid type errors.
    return item.key;
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
