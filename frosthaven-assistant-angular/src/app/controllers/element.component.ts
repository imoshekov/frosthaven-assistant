import { Component, Input } from '@angular/core';
import { Element } from '../types/game-types';

@Component({
  selector: 'app-element',
  templateUrl: './element.component.html',
  styleUrls: ['./element.component.scss']
})
export class ElementComponent {
  @Input() element!: Element;

  // Compute the fill URL based on the current state
 get fillUrl(): string {
  switch (this.element.state) {
    case 'none': return `url(#${this.element.type}-bw)`;
    case 'full': return `url(#${this.element.type}-color)`;
    case 'half': return `url(#${this.element.type}-half)`;
    default: return `url(#${this.element.type}-bw)`;
  }
}

toggleColor(): void {
  switch (this.element.state) {
    case 'none': this.element.state = 'full'; break;
    case 'full': this.element.state = 'half'; break;
    case 'half': this.element.state = 'none'; break;
  }
}
}
