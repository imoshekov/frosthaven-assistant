import { Injectable } from '@angular/core';
import { LEVEL_XP, MAX_LEVEL, XP_CAP } from '../types/game-types';

@Injectable({ providedIn: 'root' })
export class XpService {
  levelFromXp(xp: number): number {
    const clamped = Math.min(XP_CAP, Math.max(0, xp));
    let level = 1;
    for (let i = 1; i < LEVEL_XP.length; i++) {
      if (clamped >= LEVEL_XP[i]) level = i + 1;
    }
    return Math.min(MAX_LEVEL, level);
  }

  progressToNextLevelPercent(totalXp: number): number {
    const xp = Math.max(0, Math.min(XP_CAP, totalXp));
    const level = this.levelFromXp(xp);

    if (level >= MAX_LEVEL) return 100;

    const start = LEVEL_XP[level - 1];
    const end = LEVEL_XP[level];
    return Math.max(0, Math.min(100, ((xp - start) / (end - start)) * 100));
  }

  xpToNextLevel(totalXp: number): number {
    const xp = Math.max(0, Math.min(XP_CAP, totalXp));
    const level = this.levelFromXp(xp);

    if (level >= MAX_LEVEL) return 0;

    const end = LEVEL_XP[level]; // threshold for next level
    return Math.max(0, end - xp);
  }
}