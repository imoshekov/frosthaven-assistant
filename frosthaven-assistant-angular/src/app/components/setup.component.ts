import { Component } from '@angular/core';
import { NotificationService } from '../services/notification.service';
import { LocalStorageService } from '../services/local-storage.service';
import { Creature } from '../types/game-types';
import { AppContext } from '../app-context';
import { DataLoaderService } from '../services/data-loader.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GlobalTelInputDirective } from '../directives/global-tel-input.directive';
import { CreatureFactoryService } from '../services/creature-factory.service';
import { WebSocketRole, WebSocketService } from '../services/web-socket.service';


@Component({
  selector: 'app-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, GlobalTelInputDirective]
})
export class SetupComponent {
  scenarioLevel: number = 1;
  scenarioId: number;
  sectionId: number;
  sessionId: number = 1;

  public clientId: string | null = null;
  
  constructor(
    private notificationService: NotificationService,
    private storageService: LocalStorageService,
    public appContext: AppContext,
    private dataLoader: DataLoaderService,
    private creatureFactory: CreatureFactoryService,
    private webSocketService: WebSocketService
  ) {
    this.appContext.defaultLevel$.subscribe(val => {
      this.scenarioLevel = val;
    });
    this.webSocketService.clientId$.subscribe(id => {
      this.clientId = id;
    });
    this.webSocketService.sessionId$.subscribe(id => {
      if (id != null) {   
        this.sessionId = id;
      }
    });
  }

  startNewGame() {
    this.storageService.resetGame();
    this.notificationService.emitInfoMessage('Started a new game');
  }

  async loadScenario() {
    const creatures = await this.storageService.loadFile(this.scenarioId, this.scenarioLevel)
      .catch(error => this.notificationService.emitErrorMessage(`Failed to load scenario: ${error.message}`));

    if (!creatures) return;

    creatures.forEach(creature => {
      const newCreature: Creature = {
        level: this.scenarioLevel,
        aggressive: true,
        ...creature,
      };

      this.appContext.addCreature(this.creatureFactory.createCreature(newCreature));
    });

    this.notificationService.emitInfoMessage(`Loaded scenario ${this.scenarioId} at level ${this.scenarioLevel}.`);
  }

  loadSection(): void {
    const sectionIdFormatted = this.sectionId.toString().replace('#', '.');
    const section = this.dataLoader.getData().sections.find(s => s.index === sectionIdFormatted);
    if (!section || !section.rooms || section.rooms.length === 0 || !section.rooms[0].monster) {
      this.notificationService.emitErrorMessage(`Section ${this.sectionId} does not exist or has no monsters.`);
      return;
    }

    const sectionCreatures: Creature[] = section.rooms[0].monster;

    sectionCreatures.forEach(creature => {
      const newCreature: Creature = {
        type: creature.name,
        level: this.scenarioLevel,
        aggressive: true
      };

      this.appContext.addCreature(this.creatureFactory.createCreature(newCreature));
    });

    this.notificationService.emitInfoMessage(`Loaded section ${sectionIdFormatted} at level ${this.scenarioLevel}.`);
  }

  startSession(): void {
    this.webSocketService.connect(WebSocketRole.Host);
  }

  joinSession(): void {
    this.webSocketService.connect(WebSocketRole.Client, this.sessionId);
  }
}
