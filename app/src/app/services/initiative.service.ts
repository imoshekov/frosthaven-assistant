import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LocalStorageService } from './local-storage.service';

@Injectable({ providedIn: 'root' })
export class InitiativeService {
  private readonly CHAR_KEY = 'initiative_char_type';
  private readonly SUBMISSIONS_KEY = 'initiative_submissions';

  private selectedCharacterTypeSubject = new BehaviorSubject<string | null>(null);
  public selectedCharacterType$ = this.selectedCharacterTypeSubject.asObservable();

  /** Map of characterType → submitted hiddenInitiative value for this client. */
  private submissionsSubject = new BehaviorSubject<Record<string, number>>({});
  public submissions$ = this.submissionsSubject.asObservable();

  constructor(private localStorage: LocalStorageService) {
    const saved = this.localStorage.load(this.CHAR_KEY);
    if (saved) this.selectedCharacterTypeSubject.next(saved);

    const savedSubmissions = this.localStorage.load(this.SUBMISSIONS_KEY);
    if (savedSubmissions) this.submissionsSubject.next(savedSubmissions);
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

  setSubmission(type: string, value: number): void {
    const updated = { ...this.submissionsSubject.value, [type]: value };
    this.localStorage.set(this.SUBMISSIONS_KEY, JSON.stringify(updated));
    this.submissionsSubject.next(updated);
  }

  clearSubmissions(): void {
    this.localStorage.clear(this.SUBMISSIONS_KEY);
    this.submissionsSubject.next({});
  }
}
