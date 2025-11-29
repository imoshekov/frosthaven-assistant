import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { pairwise, map, filter } from 'rxjs/operators';
import { Creature } from '../types/game-types';

export interface LogEntry {
  id: string;
  time: string;
  creatureId?: string;
  creature: string;
  stat: string;
  value: any;
  oldValue: any;
  data?: {
    new?: Partial<Creature>;
    old?: Partial<Creature>;
  };
}

export const CREATURE_AUDIT_FIELDS = [
  'name', 'standee', 'level', 'initiative', 'hp', 'aggressive', 'armor', 'roundArmor', 'retaliate', 'roundRetaliate', 'conditions', 'sessionExperience'
] as const satisfies readonly (keyof Creature)[];

export type AuditKey = typeof CREATURE_AUDIT_FIELDS[number];

@Injectable({ providedIn: 'root' })
export class LogService {
  private readonly logsSubject = new BehaviorSubject<LogEntry[]>([]);
  readonly logs$: Observable<LogEntry[]> = this.logsSubject.asObservable();

  init(creatures$: Observable<Creature[]>): void {
    const snapshot$ = creatures$.pipe(
      // take an immutable snapshot of each creature we care about (base fields)
      map((arr) =>
        (arr ?? []).map((c) => {
          const snap: any = { id: c.id, type: c.type };
          for (const field of CREATURE_AUDIT_FIELDS) {
            snap[field] = (c as any)[field];
          }
          return snap;
        })
      )
    );

    snapshot$
      .pipe(
        pairwise(),
        map(([prev, next]) => this.diff(prev, next)),
        filter((entries) => entries.length > 0)
      )
      .subscribe((entries) => {
        this.logsSubject.next([...entries, ...this.logsSubject.value]);
      });
  }

  readonly characterOptions$: Observable<{ value: string; text: string }[]> = this.logs$.pipe(
    map((logs: LogEntry[]) => {
      const seen = new Map<string, string>();
      for (const l of logs) {
        if (l.creatureId && !seen.has(l.creatureId)) {
          seen.set(l.creatureId, l.creature);
        }
      }
      return Array.from(seen.entries()).map(([value, text]) => ({ value, text }));
    })
  );


  getLastAliveHpBefore(logId: string, creatureId: string): number | undefined {
    const logs = this.logsSubject.value;
    const idx = logs.findIndex(l => l.id === logId);
    if (idx === -1) return undefined;

    // logs are newest-first; older entries are at higher indices
    for (let i = idx + 1; i < logs.length; i++) {
      const l = logs[i];
      if (l.creatureId === creatureId && l.stat === 'hp') {
        const v = typeof l.value === 'number' ? l.value : undefined;
        if (v !== undefined && v > 0) return v;
      }
    }
    return undefined;
  }

  /** Latest positive HP anywhere in history (fallback). */
  getLastPositiveHp(creatureId: string): number | undefined {
    const logs = this.logsSubject.value;
    for (const l of logs) { // newest-first
      if (l.creatureId === creatureId && l.stat === 'hp') {
        const v = typeof l.value === 'number' ? l.value : undefined;
        if (v !== undefined && v > 0) return v;
      }
    }
    return undefined;
  }

  private diff(prev: Creature[], next: Creature[]): LogEntry[] {
    const p = new Map((prev ?? []).map(c => [c.id!, c]));
    const n = new Map((next ?? []).map(c => [c.id!, c]));
    const out: LogEntry[] = [];

    // creations / updates
    for (const [id, nc] of n) {
      const pc = p.get(id);

      if (!pc) {
        out.push(this.entry(id, nc.name ?? '(unknown)', 'created', this.pretty(nc), null, { new: this.snap(nc) }));
        continue;
      }

      // compare every audited field, no special cases
      for (const k of CREATURE_AUDIT_FIELDS) {
        const oldV = (pc as any)[k];
        const newV = (nc as any)[k];
        if (!Object.is(oldV, newV)) {
          out.push(this.entry(id, nc.name ?? '(unknown)', String(k), newV, oldV));
        }
      }
    }

    // removals
    for (const [id, pc] of p) {
      if (!n.has(id)) {
        const displayName = `${pc.name ?? '(unknown)'} (killed)`;
        out.push(
          this.entry(
            id,
            displayName,
            'killed',
            null,
            this.pretty(pc),
            { old: this.snap(pc) }
          )
        );
      }
    }


    return out;
  }


  private pretty(c: Creature): string {
    return `hp=${c.hp}, lvl=${c.level}`;
  }

  private entry(
    creatureId: string | undefined,
    creatureName: string,
    stat: string,
    value: any,
    oldValue: any,
    data?: { new?: Partial<Creature>; old?: Partial<Creature> }
  ): LogEntry {
    return {
      id: this.randId(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      creatureId,
      creature: creatureName,
      stat,
      value,
      oldValue,
      data
    };
  }

  private snap(c: Creature) {
    return {
      name: c.name,
      type: c.type,
      standee: c.standee,
      level: c.level,
      hp: c.hp,
      aggressive: (c as any)?.aggressive
    };
  }

  private randId(): string { return Math.random().toString(36).slice(2, 10); }
}
