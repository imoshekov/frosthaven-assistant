import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-monster',
  templateUrl: './monster.component.html',
  styleUrls: ['./monster.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class MonsterComponent {
  @Output() monsterEvent = new EventEmitter<string>();

  addMonster() {
    this.monsterEvent.emit('monster-added');
  }
}
