import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppContext } from '../app-context';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class GameComponent {
  constructor(public appContext: AppContext){ }
  
}
