import { Component } from '@angular/core';
import { NotificationService } from '../services/notification.service';
import { LocalStorageService } from '../services/local-storage.service';
import { Creature } from '../types/game-types';
import { AppContext } from '../app-context';
import { DataLoaderService } from '../services/data-loader.service';
import { DataFile, MonsterStat } from '../types/data-file-types';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StringUtils } from '../services/string-utils.service';

@Component({
  selector: 'app-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class SetupComponent {

  showLoadScenario = false;
  showJoinSession = false;
  scenarioLevel: number = 1;
  scenarioId: number = 14;
  sessionId: number = 1;
  dataFile: DataFile;

  constructor(
    private notificationService: NotificationService,
    private storageService: LocalStorageService,
    private appContext: AppContext,
    private dataLoader: DataLoaderService,
    private stringUtils: StringUtils
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
    // Call the storage service to load the scenario
    const creatures = await this.storageService.loadFile(this.scenarioId, this.scenarioLevel).catch(error => {
      this.notificationService.emitErrorMessage(`Failed to load scenario: ${error.message}`);
    });
    if (!creatures) return;

    creatures.forEach(creature => {
      const monsterStats = this.findMonsterStats(creature);
      this.appContext.addCreature({
        hp: this.stringUtils.parseInt(monsterStats?.health ?? 0),
        attack: this.stringUtils.parseInt(monsterStats?.attack ?? 0),
        movement: this.stringUtils.parseInt(monsterStats?.movement ?? 0),
        initiative: 0,
        armor: this.stringUtils.parseInt(monsterStats?.actions?.find(x => x.type === 'shield')?.value ?? 0),
        retaliate: this.stringUtils.parseInt(monsterStats?.actions?.find(x => x.type === 'retaliate')?.value ?? 0),
        ...creature
      });
    });

    this.notificationService.emitInfoMessage(`Loaded scenario ${this.scenarioId} at level ${this.scenarioLevel}.`);
  }

  startSession(): void {

  }
  
  joinSession(): void {
    // TODO join session
  }

  private findMonsterStats(creature: Creature): MonsterStat | undefined {
    const monster = this.dataFile.monsters.find(monster => monster.name === creature.type);
    if (!monster) {
      return undefined;
    }

    // It is == on purpose to allow for string comparison
    return creature.isElite
      ? monster.stats.find(x => x.type === 'elite' && x.level == creature.level)
      : monster.stats.find(x => x.level == creature.level)
  }
}
