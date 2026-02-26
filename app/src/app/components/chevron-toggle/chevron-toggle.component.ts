import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chevron-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="chevron"
      [ngClass]="expanded ? 'expanded' : ''"
      (click)="toggle.emit()"
      tabindex="0"
      role="button"
    >
      <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
  `,
  styleUrls: ['./chevron-toggle.component.scss'],
})
export class ChevronToggleComponent {
  /** Whether the chevron is in the "expanded" state. */
  @Input() expanded = false;

  /** Notify parent that the toggle was clicked. */
  @Output() toggle = new EventEmitter<void>();
}
