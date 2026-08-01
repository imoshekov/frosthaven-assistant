import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppContext } from '../../../app-context';

@Component({
  selector: 'app-damage-stats-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './damage-stats-modal.component.html',
  styleUrl: './damage-stats-modal.component.scss'
})
export class DamageStatsModalComponent {
  @Input() isVisible: boolean = false;
  @Output() closed = new EventEmitter<void>();

  constructor(public appContext: AppContext) {}

  getDamageStats(): Array<{ name: string; type: string; damage: number; kills: number }> {
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
