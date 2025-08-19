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

  private isCreatureElite(creature: Creature): boolean {
    return creature.type === 'elite' || creature.player4 === 'elite' || creature.isElite === true;
  }

  private findMonsterStats(creature: Creature, searchCriteria: string = creature.name): MonsterStat | undefined {
    const monster = this.dataFile.monsters.find(m => m.name === searchCriteria);
    if (!monster) return undefined;

    const isElite = this.isCreatureElite(creature);

    return monster.stats.find(stat =>
      (isElite ? stat.type === 'elite' : true) && stat.level === creature.level
    );
  }

  async loadScenario() {
    const creatures = await this.storageService.loadFile(this.scenarioId, this.scenarioLevel)
      .catch(error => this.notificationService.emitErrorMessage(`Failed to load scenario: ${error.message}`));

    if (!creatures) return;

    creatures.forEach(creature => {
      creature.level = this.scenarioLevel;
      creature.isElite = this.isCreatureElite(creature);

      const monsterStats = this.findMonsterStats(creature);

      const newCreature: Creature = {
        ...creature,
        hp: this.stringUtils.parseInt(monsterStats?.health ?? 0),
        attack: this.stringUtils.parseInt(monsterStats?.attack ?? 0),
        movement: this.stringUtils.parseInt(monsterStats?.movement ?? 0),
        initiative: 0,
        armor: this.stringUtils.parseInt(monsterStats?.actions?.find(x => x.type === 'shield')?.value ?? 0),
        retaliate: this.stringUtils.parseInt(monsterStats?.actions?.find(x => x.type === 'retaliate')?.value ?? 0),
        aggressive: true
      };

      this.appContext.addCreature(this.creatureFactory.createCreature(newCreature));
    });

    this.notificationService.emitInfoMessage(`Loaded scenario ${this.scenarioId} at level ${this.scenarioLevel}.`);
  }

  loadSection(): void {
    const section = this.dataLoader.getData().sections.find(s => s.index === this.sectionId);
    if (!section || !section.rooms[0]?.monster) return;

    const monsters = this.dataLoader.getData().monsters;
    const sectionCreatures: Creature[] = section.rooms[0].monster;

    sectionCreatures.forEach(creature => {
      const monsterData = monsters.find(m => m.name === creature.name);
      if (!monsterData) return;

      creature.level = this.scenarioLevel;
      creature.isElite = this.isCreatureElite(creature);

      const selectedStats = this.findMonsterStats(creature);

      const newCreature: Creature = {
        type: creature.name,
        level: this.scenarioLevel,
        hp: this.stringUtils.parseInt(selectedStats?.health ?? 0),
        attack: this.stringUtils.parseInt(selectedStats?.attack ?? 0),
        movement: Math.max(
          Number(monsterData?.baseStat?.movement ?? 0),
          Number(selectedStats?.movement ?? 0)
        ),
        armor: this.stringUtils.parseInt(selectedStats?.actions?.find(x => x.type === 'shield')?.value ?? 0),
        retaliate: this.stringUtils.parseInt(selectedStats?.actions?.find(x => x.type === 'retaliate')?.value ?? 0),
        isElite: creature.isElite,
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
