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


@Component({
  selector: 'app-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, GlobalTelInputDirective]
})
export class SetupComponent {

  showLoadScenario = false;
  showLoadSection = false;
  showJoinSession = false;
  scenarioLevel: number = 1;
  scenarioId: number = 14;
  sectionId: number = 1;
  sessionId: number = 1;

  constructor(
    private notificationService: NotificationService,
    private storageService: LocalStorageService,
    private appContext: AppContext,
    private dataLoader: DataLoaderService,
    private creatureFactory: CreatureFactoryService
  ) {
    this.scenarioLevel = appContext.defaultLevel
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
    const section = this.dataLoader.getData().sections.find(s => s.index === this.sectionId);
    if (!section || !section.rooms[0]?.monster) {
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

    this.notificationService.emitInfoMessage(`Loaded section ${this.sectionId} at level ${this.scenarioLevel}.`);
  }

  startSession(): void {

  }

  joinSession(): void {
    // TODO join session
  }
}
