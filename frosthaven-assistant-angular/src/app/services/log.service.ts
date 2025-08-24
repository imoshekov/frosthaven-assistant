import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { LogEntry } from '../types/game-types'

@Injectable({ providedIn: 'root' })
export class LogService {
  private readonly _logs = new BehaviorSubject<LogEntry[]>([]);
  readonly logs$: Observable<LogEntry[]> = this._logs.asObservable();
  private byCreatureId = new Map<string, LogEntry[]>();

  readonly loggedOptions$ = this.logs$.pipe(
    map(() => {
      const out: Array<{ value: string; text: string }> = [];
      for (const [id, entries] of this.byCreatureId.entries()) {
        const latest = entries[0];
        out.push({ value: id, text: latest?.creature ?? 'Unknown' });
      }

      return out.sort((a, b) => a.text.localeCompare(b.text));
    })
  );

  private entryToId = new WeakMap<LogEntry, string>();

  addLog(creatureId: string, creatureName: string, stat: string, value: any, oldValue: any) {
    const entry: LogEntry = {
      time: this.formatDate(new Date()),
      creature: creatureName,
      stat,
      value,
      oldValue
    };
    this._logs.next([entry, ...this._logs.value]);
    const current = this.byCreatureId.get(creatureId) ?? [];
    this.byCreatureId.set(creatureId, [entry, ...current]);
    this.entryToId.set(entry, creatureId); 
  }

  getCreatureIdForEntry(entry: LogEntry): string | undefined {
    return this.entryToId.get(entry);
  }

  clear(): void {
    this.byCreatureId.clear();
    this._logs.next([]);
  }

  getLogsByIds(ids: string[]): LogEntry[] {
    const collected: LogEntry[] = [];
    for (const id of ids) {
      const arr = this.byCreatureId.get(id);
      if (arr?.length) collected.push(...arr);
    }

    const all = this._logs.value;
    const order = new Map<LogEntry, number>(all.map((e, i) => [e, i]));
    collected.sort((a, b) => (order.get(a)! - order.get(b)!));

    return collected;
  }

  private formatDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
      `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    );
  }
}

