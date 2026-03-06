import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LocalStorageService } from './local-storage.service';

@Injectable({ providedIn: 'root' })
export class InitiativeService {
  private readonly CHAR_KEY = 'initiative_char_type';

  private selectedCharacterTypeSubject = new BehaviorSubject<string | null>(null);
  public selectedCharacterType$ = this.selectedCharacterTypeSubject.asObservable();

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
}
