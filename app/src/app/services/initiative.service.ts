import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LocalStorageService } from './local-storage.service';

/** The two card initiatives a client submitted for a character this round. */
export interface InitiativeSubmission {
  main: number;
  secondary: number;
}

@Injectable({ providedIn: 'root' })
export class InitiativeService {
  private readonly CHAR_KEY = 'initiative_char_type';
  private readonly SUBMISSIONS_KEY = 'initiative_submissions';

  private selectedCharacterTypeSubject = new BehaviorSubject<string | null>(null);
  public selectedCharacterType$ = this.selectedCharacterTypeSubject.asObservable();

  /** Map of characterType → the pair of initiatives this client submitted. */
  private submissionsSubject = new BehaviorSubject<Record<string, InitiativeSubmission>>({});
  public submissions$ = this.submissionsSubject.asObservable();

  constructor(private localStorage: LocalStorageService) {
    const saved = this.localStorage.load(this.CHAR_KEY);
    if (saved) this.selectedCharacterTypeSubject.next(saved);

    const savedSubmissions = this.localStorage.load(this.SUBMISSIONS_KEY);
    if (savedSubmissions) this.submissionsSubject.next(this.migrate(savedSubmissions));
  }

  /**
   * Submissions used to be a bare `characterType → number`. Anything already in a
   * user's localStorage is in that shape, so widen it on read rather than losing it.
   */
  private migrate(raw: Record<string, number | InitiativeSubmission>): Record<string, InitiativeSubmission> {
    const out: Record<string, InitiativeSubmission> = {};
    for (const [type, value] of Object.entries(raw ?? {})) {
      out[type] = typeof value === 'number' ? { main: value, secondary: 0 } : value;
    }
    return out;
  }

  getSelectedCharacterType(): string | null {
    return this.selectedCharacterTypeSubject.getValue();
  }

  selectCharacter(type: string | null): void {
    if (type) {
      this.localStorage.set(this.CHAR_KEY, JSON.stringify(type));
    } else {
      this.localStorage.clear(this.CHAR_KEY);
    }
    this.selectedCharacterTypeSubject.next(type);
  }

  setSubmission(type: string, main: number, secondary: number): void {
    const updated = { ...this.submissionsSubject.value, [type]: { main, secondary } };
    this.localStorage.set(this.SUBMISSIONS_KEY, JSON.stringify(updated));
    this.submissionsSubject.next(updated);
  }

  getSubmission(type: string): InitiativeSubmission | undefined {
    return this.submissionsSubject.value[type];
  }

  clearSubmissions(): void {
    this.localStorage.clear(this.SUBMISSIONS_KEY);
    this.submissionsSubject.next({});
  }
}
