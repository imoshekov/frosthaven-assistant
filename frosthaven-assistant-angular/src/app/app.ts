import { Component, signal } from '@angular/core';
import { LocalStorageService } from './services/local-storage.service';
import { WebSocketService } from './services/web-socket.service';
import { CommonModule } from '@angular/common';
import { ToastNotificationComponent } from './components/toast-notification/toast-notification.component';
import { SetupComponent } from './components/setup.component';
import { GameComponent } from './components/game-section/game.component';
import { MonsterComponent as AddMonsterComponent } from './components/add-monster.component';
import { AppContext } from './app-context';
import { FormsModule } from '@angular/forms';
import { Element } from './types/game-types';
import { ElementComponent } from './components/element.component'; 


@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToastNotificationComponent,
    SetupComponent,
    GameComponent,
    AddMonsterComponent,
    ElementComponent,
  ]
})
export class App {
  protected readonly title = signal('frosthaven-assistant-angular');

  isLoading = false;
  lastSavedTimestamp = '';
  joinedSessionId: number = 0;
  serverLastPinged = '';
  elements: Element[] = [
    { type: 'fire', state: 'none' },
    { type: 'ice', state: 'none' },
    { type: 'earth', state: 'none' },
    { type: 'air', state: 'none' },
    { type: 'light', state: 'none' },
    { type: 'dark', state: 'none' }
  ];

  constructor(private storageService: LocalStorageService,
    private webSocketService: WebSocketService,
    private appContext: AppContext
  ) {
    const graveyard = this.storageService.loadGraveyard();
    const creatures = this.storageService.loadCreatures();
    graveyard && this.appContext.setCreatures(creatures);
    creatures && this.appContext.setGraveyard(graveyard);
  }

  ngOnInit() {
    this.storageService.loadingEvent$.subscribe((loading: boolean) => {
      this.isLoading = loading;
      this.lastSavedTimestamp = new Date().toLocaleString();
      this.joinedSessionId = this.webSocketService.sessionId;
      this.serverLastPinged = this.webSocketService.lastPingedTime;
    });
  }


}
