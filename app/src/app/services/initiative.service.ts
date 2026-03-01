import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LocalStorageService } from './local-storage.service';

@Injectable({ providedIn: 'root' })
export class InitiativeService {
  private readonly CHAR_KEY = 'initiative_char_type';

  private selectedCharacterTypeSubject = new BehaviorSubject<string | null>(null);
  public selectedCharacterType$ = this.selectedCharacterTypeSubject.asObservable();

  // In-memory only — never synced to other clients
  private pendingInitiativeSubject = new BehaviorSubject<number | null>(null);
  public pendingInitiative$ = this.pendingInitiativeSubject.asObservable();

  constructor(private localStorage: LocalStorageService) {
    const saved = this.localStorage.load(this.CHAR_KEY);
    if (saved) {
      this.selectedCharacterTypeSubject.next(saved);
    }
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

  getPendingInitiative(): number | null {
    return this.pendingInitiativeSubject.getValue();
  }

  setPendingInitiative(value: number): void {
    this.pendingInitiativeSubject.next(value);
  }

  /** Called when Next Round is clicked — apply pending and reset for next planning phase. */
  onRoundAdvanced(): void {
    this.pendingInitiativeSubject.next(null);
  }
}
