import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppContext } from '../../../app-context';
import { DbService } from '../../../services/db.service';
import { DamageHistoryRow } from '../../../types/db-types';

@Component({
  selector: 'app-damage-stats-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './damage-stats-modal.component.html',
  styleUrl: './damage-stats-modal.component.scss'
})
export class DamageStatsModalComponent implements OnChanges {
  @Input() isVisible: boolean = false;
  @Output() closed = new EventEmitter<void>();

  view: 'session' | 'alltime' = 'session';
  allTimeStats: Array<{ name: string; type: string; damage: number; kills: number }> = [];
  isLoadingAllTime: boolean = false;
  allTimeError: string | null = null;

  constructor(public appContext: AppContext, private db: DbService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible'] && changes['isVisible'].currentValue === true) {
      this.view = 'session';
      this.allTimeStats = [];
      this.allTimeError = null;
    }
  }

  onViewChange(): void {
    if (this.view === 'alltime' && this.allTimeStats.length === 0 && !this.isLoadingAllTime) {
      this.loadAllTimeStats();
    }
  }

  private async loadAllTimeStats(): Promise<void> {
    this.isLoadingAllTime = true;
    this.allTimeError = null;
    try {
      const rows: DamageHistoryRow[] = await this.db.getDamageHistory();
      const aggregated = new Map<string, { name: string; type: string; damage: number; kills: number }>();
      for (const row of rows) {
        const existing = aggregated.get(row.character_type);
        if (existing) {
          existing.damage += row.damage;
          existing.kills += row.kills;
        } else {
          aggregated.set(row.character_type, {
            name: row.character_name,
            type: row.character_type,
            damage: row.damage,
            kills: row.kills,
          });
        }
      }
      this.allTimeStats = Array.from(aggregated.values()).sort((a, b) => b.damage - a.damage);
    } catch {
      this.allTimeError = 'Failed to load all-time stats';
    } finally {
      this.isLoadingAllTime = false;
    }
  }

  getDisplayStats(): Array<{ name: string; type: string; damage: number; kills: number }> {
    return this.view === 'alltime' ? this.allTimeStats : this.getSessionStats();
  }

  getSessionStats(): Array<{ name: string; type: string; damage: number; kills: number }> {
    const damageTracker = this.appContext.getDamageTracker();
    const killTracker = this.appContext.getKillTracker();
    const allTypes = new Set([...Object.keys(damageTracker), ...Object.keys(killTracker)]);
    return Array.from(allTypes).map(type => {
      const character = this.appContext.getCreatures().find(c => c.type === type);
      return {
        name: character?.name || this.formatCharacterName(type),
        type,
        damage: damageTracker[type] || 0,
        kills: killTracker[type] || 0,
      };
    }).sort((a, b) => b.damage - a.damage);
  }

  formatCharacterName(type: string): string {
    return type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  close(): void {
    this.closed.emit();
  }
}
