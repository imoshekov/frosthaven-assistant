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
  dataFile: DataFile;

  constructor(
    private notificationService: NotificationService,
    private storageService: LocalStorageService,
    private appContext: AppContext,
    private dataLoader: DataLoaderService,
    private stringUtils: StringUtils,
    private creatureFactory: CreatureFactoryService
  ) {
    this.dataFile = this.dataLoader.getData();
    this.scenarioLevel = appContext.defaultLevel
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

  loadSection(): void {
    const sectionCreatures: Creature[] = this.dataLoader.getData().sections.find(section => section.index === this.sectionId)?.rooms[0].monster;
    const monsters = this.dataLoader.getData().monsters;

    sectionCreatures.forEach(creature => {
      const monsterData = monsters.find(monster => monster.name === creature.name);

      const isElite = creature.type === 'elite' || creature?.player4 === 'elite';

      const selectedMonster = isElite
        ? monsterData?.stats.find(x => x.type === 'elite' && x.level === this.scenarioLevel)
        : monsterData?.stats[this.scenarioLevel];
      const newCreature: Creature = {
        type: creature.name,
        level: this.scenarioLevel,
        hp: this.stringUtils.parseInt(selectedMonster?.health ?? 0),
        attack: this.stringUtils.parseInt(selectedMonster?.attack ?? 0),
        movement: Math.max(Number(monsterData?.baseStat?.movement ?? 0), Number(selectedMonster?.movement ?? 0)),
        armor: this.stringUtils.parseInt(selectedMonster?.actions?.find(x => x.type === 'shield')?.value ?? 0),
        retaliate: this.stringUtils.parseInt(selectedMonster?.actions?.find(x => x.type === 'retaliate')?.value ?? 0),
        isElite: isElite,
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

  private findMonsterStats(creature: Creature, searchCriteria: string = creature.type): MonsterStat | undefined {
    const monster = this.dataFile.monsters.find(monster => monster.name === searchCriteria);
    if (!monster) {
      return undefined;
    }

    // It is == on purpose to allow for string comparison
    return creature.isElite
      ? monster.stats.find(x => x.type === 'elite' && x.level == creature.level)
      : monster.stats.find(x => x.level == creature.level)
  }
}
