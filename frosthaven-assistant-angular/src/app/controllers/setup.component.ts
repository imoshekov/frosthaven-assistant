import { Component } from '@angular/core';
import { NotificationService } from '../services/notification.service';
import { LocalStorageService } from '../services/local-storage.service';
import { Creature } from '../types/game-types';
import { AppContext } from '../app-context';
import { DataLoaderService } from '../services/data-loader.service';
import { DataFile, MonsterStat } from '../types/data-file-types';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class SetupComponent {

  showLoadScenario = false;
  scenarioLevel: number = 1;
  scenarioId: string = '';
  dataFile: DataFile;

  constructor(
    private notificationService: NotificationService,
    private storageService: LocalStorageService,
    private appContext: AppContext,
    private dataLoader: DataLoaderService
  ) {
    this.dataFile = this.dataLoader.getData();
  }

  startNewGame() {
    this.storageService.resetGame();
    this.notificationService.emitInfoMessage('Started a new game');
  }

  /**
   * Loads a scenario based on the scenarioId and scenarioLevel inputs
   */
  async loadScenario() {
    // Validate inputs
    if (!this.scenarioId || this.scenarioId.trim() === '') {
      this.notificationService.emitErrorMessage('Please enter a scenario ID');
      return;
    }

    const scenarioNumber = parseInt(this.scenarioId, 10);
    if (isNaN(scenarioNumber)) {
      this.notificationService.emitErrorMessage('Scenario ID must be a number');
      return;
    }

    // Call the storage service to load the scenario
    await this.storageService.loadFile(
      scenarioNumber,
      this.scenarioLevel,
      (message: string) => this.notificationService.emitInfoMessage(message),
      (creature: Creature) => {
        const monsterStats = this.findMonsterStats(creature);
        this.appContext.creatures.push({
          hp: StringUtils.parseInt(monsterStats?.health ?? 0),
          attack: StringUtils.parseInt(monsterStats?.attack ?? 0),
          movement: StringUtils.parseInt(monsterStats?.movement ?? 0),
          initiative: 0,
          armor: StringUtils.parseInt(monsterStats?.actions?.find(x => x.type === 'shield')?.value ?? 0),
          retaliate: StringUtils.parseInt(monsterStats?.actions?.find(x => x.type === 'retaliate')?.value ?? 0),
          ...creature
        });
      }
    ).catch(error => {
      this.notificationService.emitErrorMessage(`Failed to load scenario: ${error.message}`);
    });

    console.log(this.appContext.creatures);
    this.notificationService.emitInfoMessage(`Loaded scenario ${scenarioNumber} at level ${this.scenarioLevel}.`);
  }

  private findMonsterStats(creature: Creature): MonsterStat | undefined {
    const monster = this.dataFile.monsters.find(monster => monster.name === creature.type);
    if (!monster) {
      return undefined;
    }

    return creature.isElite
            ? monster.stats.find(x => x.type === 'elite' && x.level === creature.level)
            : monster.stats.find(x => x.level === creature.level)
  }
}
