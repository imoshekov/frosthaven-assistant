import { EventEmitter, Injectable } from '@angular/core';
import { Creature } from '../types/game-types';
import { AppContext } from '../app-context';

@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  // Storage keys
  private readonly CHARACTERS = 'characters';
  private readonly GRAVEYARD = 'graveyard';
  private readonly SESSION_ID = 'sessionId';

  constructor(private appContext: AppContext) {}

  load(key: string): any | null {
    const value = localStorage.getItem(key);
    return value !== null ? JSON.parse(value) : null;
  }

  loadCreatures(): Creature[] {
    return this.load(this.CHARACTERS) || [];
  }

  loadGraveyard(): Creature[] {
    return this.load(this.GRAVEYARD) || [];
  }

  loadSessionId(): number {
    const sessionId = this.load(this.SESSION_ID);
    return sessionId !== null ? sessionId : 0;
  }

  set(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  setSessionId(sessionId: number): void {
    this.set(this.SESSION_ID, sessionId.toString());
  }

  clear(key: string): void {
    localStorage.removeItem(key);
  }

  private loadingEventSubject = new EventEmitter<boolean>();
  loadingEvent$ = this.loadingEventSubject.asObservable();

  saveGame(): void {
    this.loadingEventSubject.emit(true);

    const currentCharacterData = JSON.stringify(this.appContext.creatures);
    const graveyardData = JSON.stringify(this.appContext.graveyard);
    this.set(this.CHARACTERS, currentCharacterData);
    this.set(this.GRAVEYARD, graveyardData);

    this.loadingEventSubject.emit(false);
  }

  resetGame(): void {
    localStorage.clear();
    location.reload();
  }

  async loadFile(scenarioNumber: number, level: number, showToast: (msg: string, duration: number) => void, addCharacter: (creature: Creature) => void): Promise<void> {
    if (!scenarioNumber) {
      showToast('Enter a valid scenario number', 3000);
      return;
    }
    const formattedFileNumber = String(scenarioNumber).padStart(3, '0');
    const filePath = `scenarios/${formattedFileNumber}.json`;
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      this.processScenarioData(data, level, addCharacter);
      showToast(`Scenario ${scenarioNumber}, level ${level} loaded`, 2000);
    } catch (error) {
      console.error('Error loading file:', error);
      showToast('Error loading scenario', 3000);
    }
  }

  processScenarioData(data: any, level: number = 1, addCharacter: (creature: Creature) => void): void {
    if (!data.rooms || !data.rooms[0] || !data.rooms[0].monster) return;
    data.rooms[0].monster.forEach((monster: any) => {
      const newCreature: Creature = {
        type: monster.name,
        level: level,
        isElite: monster?.type === 'elite' || monster?.player4 === 'elite',
        aggressive: true,
      };
      addCharacter(newCreature);
    });
  }
}
