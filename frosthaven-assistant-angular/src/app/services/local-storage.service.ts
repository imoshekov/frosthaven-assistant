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


  resetGame(): void {
    localStorage.clear();
    location.reload();
  }

  async loadFile(scenarioNumber: number, level: number): Promise<Creature[]> {
    if (!scenarioNumber) {
      throw new Error('Enter a valid scenario number');
    }
    const formattedFileNumber = String(scenarioNumber).padStart(3, '0');
    const baseHref = document.querySelector('base')?.getAttribute('href') || '/';
    const filePath = `${baseHref.replace(/\/$/, '')}/scenarios/${formattedFileNumber}.json`;
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      return this.processScenarioData(data, level);
    } catch (error) {
      console.error('Error loading file:', error);
      throw new Error(`Error loading scenario ${scenarioNumber}. Check the file path and make sure it exists.`);
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