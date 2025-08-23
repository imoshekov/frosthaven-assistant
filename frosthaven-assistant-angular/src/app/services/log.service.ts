// log.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

export interface LogEntry {
  time: string;
  creature: string;
  stat: string;
  value: any;
}

@Injectable({ providedIn: 'root' })
export class LogService {
  private logs = new BehaviorSubject<LogEntry[]>([]);   // ✅ typed
  logs$ = this.logs.asObservable();

  characters$ = this.logs$.pipe(
    map((entries: LogEntry[]) => {
      const unique = Array.from(new Set(entries.map(e => e.creature)));
      return unique.map(c => ({ text: c, value: c }));
    })
  );

  addLog(creature: string, stat: string, value: any) {
    const entry: LogEntry = {
      time: new Date().toLocaleTimeString(),
      creature,
      stat,
      value
    };
    this.logs.next([...this.logs.value, entry]);
  }

  clear() {
    this.logs.next([]);
  }
}
