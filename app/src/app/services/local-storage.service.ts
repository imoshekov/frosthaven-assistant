import { Injectable } from '@angular/core';
import { Creature } from '../types/game-types';

@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  // Storage keys
  private readonly SESSION_ID = 'sessionId';

  constructor() { }

  load(key: string): any | null {
    const value = localStorage.getItem(key);
    return value !== null ? JSON.parse(value) : null;
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


  async resetGame(): Promise<void> {
    localStorage.clear();
    location.reload();

    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(name => caches.delete(name)));
    }

  }

  async loadFile(scenarioNumber: number, level: number): Promise<Creature[]> {
    if (!scenarioNumber) {
      throw new Error('Enter a valid scenario number');
    }

    const formatted = String(scenarioNumber).padStart(3, '0');

    // Use base href from index.html (<base href="/frosthaven-assistant/">)
    const base = new URL(document.baseURI);
    base.hash = ''; // remove #/ so it doesn’t break the path

    // Angular copies scenarios into /scenarios
    const url = new URL(`scenarios/${formatted}.json`, base);

    try {
      const response = await fetch(url.href, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      return this.processScenarioData(data, level);
    } catch (error) {
      console.error('Error loading file:', error);
      throw new Error(`Error loading scenario ${scenarioNumber}. Tried: ${url.pathname}`);
    }
  }



  processScenarioData(data: any, level: number = 1): Creature[] {
    if (!data.rooms || !data.rooms[0] || !data.rooms[0].monster) return [];
    return data.rooms[0].monster.map((monster: any) => {
      return {
        type: monster.name,
        level: level,
        isElite: monster?.type === 'elite' || monster?.player4 === 'elite',
        aggressive: true,
      };
    });
  }
}