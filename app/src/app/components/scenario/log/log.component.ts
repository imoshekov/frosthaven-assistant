import { Component } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable, startWith } from 'rxjs';
import { LogEntry, LogService } from '../../../services/log.service';
import { CommonModule } from '@angular/common';
import { AppContext } from '../../../app-context'; // adjust path if needed
import { NotificationService } from '../../../services/notification.service';

type Updater = (id: string, value: any, log: LogEntry) => void;


@Component({
  selector: 'app-log',
  standalone: true,
  templateUrl: './log.component.html',
  styleUrls: ['./log.component.scss'],
  imports: [CommonModule]
})
export class LogComponent {
  readonly pageSize = 10;
  shouldShowLog = false; // collapsed by default

  private defaultUpdate!: Updater;
  private undoHandlers!: Record<string, Updater>;

  // local UI state
  readonly currentPage$ = new BehaviorSubject<number>(1);
  private readonly selectedIds$ = new BehaviorSubject<string[]>([]);

  // streams (explicitly typed)
  characters$!: Observable<{ value: string; text: string }[]>;
  filteredAll$!: Observable<LogEntry[]>;
  totalPages$!: Observable<number>;
  filteredLogs$!: Observable<LogEntry[]>;


  constructor(
    private readonly logService: LogService,
    public readonly appContext: AppContext,
    private readonly notificationService: NotificationService
  ) {
    this.characters$ = this.logService.characterOptions$;

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

        this.appContext.updateCreatureBaseStat(
          id,
          log.stat as any,
          value,
          applyToAll
        );

        const isEmptyArray = Array.isArray(value) && value.length === 0;
        const message = isEmptyArray
          ? `${log.stat} restored to default`
          : `${log.stat} restored to ${value}`;
        this.notificationService.emitInfoMessage(message);
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
        this.appContext.reviveCreature(id, hp);
      },
      created: (id) => {
        if ((this.appContext as AppContext).killCreature) (this.appContext as AppContext).killCreature(id);
      },
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

  undo(log: LogEntry) {
    const id = log.creatureId;
    if (!id) return;
    (this.undoHandlers[log.stat] ?? this.defaultUpdate)(id, log.oldValue, log);
  }
}
