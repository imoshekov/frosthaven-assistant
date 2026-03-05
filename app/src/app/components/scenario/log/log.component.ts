import { Component } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable, startWith } from 'rxjs';
import { LogEntry, LogService } from '../../../services/log.service';
import { CommonModule } from '@angular/common';
import { ChevronToggleComponent } from '../../chevron-toggle/chevron-toggle.component';
import { AppContext } from '../../../app-context';
import { NotificationService } from '../../../services/notification.service';

type Updater = (id: string, value: any, log: LogEntry) => void;


@Component({
  selector: 'app-log',
  standalone: true,
  templateUrl: './log.component.html',
  styleUrls: ['./log.component.scss'],
  imports: [CommonModule, ChevronToggleComponent]
})
export class LogComponent {
  readonly pageSize = 10;
  shouldShowLog = true;

  private defaultUpdate!: Updater;
  private undoHandlers!: Record<string, Updater>;

  readonly currentPage$ = new BehaviorSubject<number>(1);
  private readonly selectedIds$ = new BehaviorSubject<string[]>([]);

  characters$!: Observable<{ value: string; text: string }[]>;
  filteredAll$!: Observable<LogEntry[]>;
  totalPages$!: Observable<number>;
  filteredLogs$!: Observable<LogEntry[]>;
  canUndo$!: Observable<boolean>;


  constructor(
    private readonly logService: LogService,
    public readonly appContext: AppContext,
    private readonly notificationService: NotificationService
  ) {
    this.characters$ = this.logService.characterOptions$;
    this.canUndo$ = this.logService.canUndo$;

    this.filteredAll$ = combineLatest([
      this.logService.logs$,
      this.selectedIds$.pipe(startWith<string[]>([]))
    ]).pipe(
      map(([logs, selected]) => {
        if (!selected || selected.length === 0) return logs;
        const set = new Set(selected);
        return logs.filter(l => (l.creatureId ? set.has(l.creatureId) : false));
      })
    );

    this.totalPages$ = this.filteredAll$.pipe(
      map((arr: LogEntry[]) => Math.max(1, Math.ceil(arr.length / this.pageSize)))
    );

    this.filteredLogs$ = combineLatest([this.filteredAll$, this.currentPage$]).pipe(
      map(([arr, page]: [LogEntry[], number]) => {
        const start = (page - 1) * this.pageSize;
        return arr.slice(start, start + this.pageSize);
      })
    );

    this.defaultUpdate = (id, value, log) => {
      if (log.stat) {
        const applyToAll = ['armor', 'roundArmor', 'retaliate', 'roundRetaliate'].includes(log.stat);
        this.appContext.updateCreatureBaseStat(id, log.stat as any, value, applyToAll);
      }
    };

    this.undoHandlers = {
      killed: (id, _value, log) => {
        const hpBeforeDelete = this.logService.getLastAliveHpBefore(log.id, id);
        const hpFromSnapshot = (log.data?.old?.hp as number | undefined);
        const hpAnywhere = this.logService.getLastPositiveHp(id);
        const hp = hpBeforeDelete
          ?? (hpFromSnapshot && hpFromSnapshot > 0 ? hpFromSnapshot : undefined)
          ?? hpAnywhere
          ?? 1;
        const conditions = (log.data?.old?.conditions as any[] | undefined) ?? [];
        this.appContext.reviveCreature(id, hp, conditions);
      },
      created: (id) => {
        if ((this.appContext as AppContext).killCreature) (this.appContext as AppContext).killCreature(id);
      }
    };
  }

  onFilterChange(ev: Event) {
    const target = ev.target as HTMLSelectElement;
    const ids = Array.from(target.selectedOptions).map(o => o.value);
    this.currentPage$.next(1);
    this.selectedIds$.next(ids);
  }

  prevPage(total: number) {
    const cur = this.currentPage$.value;
    if (cur > 1) this.currentPage$.next(cur - 1);
  }

  nextPage(total: number) {
    const cur = this.currentPage$.value;
    if (cur < total) this.currentPage$.next(cur + 1);
  }

  /**
   * Undo all entries in the most recent batch (same batchId).
   * Because undoing calls appContext methods which emit on creatures$,
   * the WebSocket service automatically broadcasts the updated state.
   */
  undoLastBatch(): void {
    const batch = this.logService.getLastBatch();
    if (batch.length === 0) return;

    // Suppress logging while applying undo so the restoration doesn't
    // create a new batch that would immediately become the next undo target.
    this.logService.runWithoutLogging(() => {
      for (const log of batch) {
        const id = log.creatureId;
        if (!id) continue;
        (this.undoHandlers[log.stat] ?? this.defaultUpdate)(id, log.oldValue, log);
      }
    });

    // Remove the batch from the log after it has been applied
    this.logService.consumeLastBatch();
  }
}