import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { map, Observable, combineLatest, BehaviorSubject } from 'rxjs';
import { LogService } from '../services/log.service';
import { LogEntry } from '../types/game-types';
import { AppContext } from '../app-context';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-log',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './log.component.html',
  styleUrls: ['./log.component.scss']
})
export class LogComponent implements OnInit {
  logs$!: Observable<LogEntry[]>;
  characters$!: Observable<{ text: string; value: string }[]>;

  private selectedIds$ = new BehaviorSubject<string[]>([]);
  public currentPage$ = new BehaviorSubject<number>(1);

  pageSize = 10;

  private filteredAllLogs$!: Observable<LogEntry[]>;
  filteredLogs$!: Observable<LogEntry[]>; 
  totalPages$!: Observable<number>;

  constructor(private appContext: AppContext, private logService: LogService, private notificationService: NotificationService) { }

  ngOnInit() {
    this.logs$ = this.logService.logs$;

    this.characters$ = combineLatest([
      this.appContext.creatures$,     // live creatures stream
      this.logService.loggedOptions$  // historical IDs from logs
    ]).pipe(
      map(([creatures, logged]) => {
        const mapById = new Map<string, string>();

        // start with historical (dead/removed still included)
        for (const o of logged) mapById.set(o.value, o.text);

        // overlay live aggressive; live name wins if present
        creatures
          .filter(c => c.aggressive)
          .forEach(c => mapById.set(c.id, c.name));

        return [...mapById.entries()]
          .map(([value, text]) => ({ value, text }))
          .sort((a, b) => a.text.localeCompare(b.text));
      })
    );

    //filter by selected IDs
    this.filteredAllLogs$ = combineLatest([this.logs$, this.selectedIds$]).pipe(
      map(([logs, ids]) => (ids.length === 0 ? logs : this.logService.getLogsByIds(ids)))
    );

    //compute total pages based
    this.totalPages$ = this.filteredAllLogs$.pipe(
      map(arr => Math.max(1, Math.ceil(arr.length / this.pageSize)))
    );

    //slice page
    this.filteredLogs$ = combineLatest([this.filteredAllLogs$, this.currentPage$, this.totalPages$]).pipe(
      map(([logs, page, totalPages]) => {
        // clamp page if data shrank
        const safePage = Math.min(Math.max(page, 1), totalPages);
        if (safePage !== page) this.currentPage$.next(safePage);
        const start = (safePage - 1) * this.pageSize;
        return logs.slice(start, start + this.pageSize);
      })
    );
  }

  onFilterChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const ids = Array.from(target.selectedOptions).map(o => o.value);
    this.selectedIds$.next(ids);
    this.currentPage$.next(1); // reset to first page on filter change
  }

  prevPage(totalPages: number) {
    const next = Math.max(1, this.currentPage$.value - 1);
    this.currentPage$.next(next);
  }

  nextPage(totalPages: number) {
    const next = Math.min(totalPages, this.currentPage$.value + 1);
    this.currentPage$.next(next);
  }

  undo(log: LogEntry) {
    const creatureId = this.logService.getCreatureIdForEntry(log);
    if (!creatureId) return;

    if (log.stat === 'killed' && log.value === true) {
      this.appContext.reviveCreature(creatureId);
      return;
    }

    //handle base stat reverts (hp, standee, name, etc.)
    if (typeof log.oldValue !== 'undefined') {
      this.appContext.updateCreatureBaseStat(
        creatureId,
        log.stat as any,
        log.oldValue,
        false
      );
      this.notificationService.emitInfoMessage(`Reverted ${log.stat} to ${log.oldValue} for ${log.creature}`);
      return;
    }

    // TODO: handle condition+ / condition- undo
    if (log.stat === 'condition+' && log.value) {
      (this.appContext as any).removeCondition?.(creatureId, log.value);
      return;
    }
    if (log.stat === 'condition-' && log.value) {
      (this.appContext as any).addCondition?.(creatureId, log.value);
      return;
    }
  }
}
