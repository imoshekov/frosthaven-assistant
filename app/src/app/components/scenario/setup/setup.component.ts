import { Component } from '@angular/core';
import { NotificationService } from '../../../services/notification.service';
import { LocalStorageService } from '../../../services/local-storage.service';
import { Creature} from '../../../types/game-types';
import { AppContext } from '../../../app-context';
import { DataLoaderService } from '../../../services/data-loader.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GlobalTelInputDirective } from '../../../directives/global-tel-input.directive';
import { CreatureFactoryService } from '../../../services/creature-factory.service';
import { WebSocketRole, WebSocketService } from '../../../services/web-socket.service';
import { DbService } from '../../../services/db.service';
import { XpService } from '../../../services/xp.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation.dialog.component';


@Component({
  selector: 'app-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, GlobalTelInputDirective, ConfirmationDialogComponent]
})
export class SetupComponent {
  scenarioLevel: number = 1;
  scenarioId!: number;
  sectionId!: number;
  sessionId: number = 1;
  bonusXp: number = 0;

  // Confirmation dialog state
  showEndGameConfirmation: boolean = false;
  endGameConfirmationMessage: string = '';

  constructor(
    private notificationService: NotificationService,
    private storageService: LocalStorageService,
    public appContext: AppContext,
    private dataLoader: DataLoaderService,
    private creatureFactory: CreatureFactoryService,
    private webSocketService: WebSocketService,
    private db: DbService,
    private xpService: XpService
  ) {
    this.appContext.defaultLevel$.subscribe(val => {
      this.scenarioLevel = val;
    });
    this.appContext.scenarioId$.subscribe(val => {
      if (val != null) {
        this.scenarioId = val;
      }
    });
    this.webSocketService.sessionId$.subscribe(id => {
      if (id != null) {
        this.sessionId = id;
      }
    });
  }

  startNewGame() {
    this.storageService.resetGame();
  }

  async loadScenario() {
    const room1Creatures = await this.storageService.loadFile(this.scenarioId, this.scenarioLevel)
      .catch(error => this.notificationService.emitErrorMessage(`Failed to load scenario: ${error.message}`));

    this.appContext.setScenarioId(this.scenarioId);
    if (!room1Creatures) return;

    room1Creatures.forEach(creature => {
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
    const section = this.dataLoader.getData().sections.find(
      s => s.index === sectionIdFormatted
    );
    if (!section || !section.rooms || section.rooms.length === 0) {
      this.notificationService.emitErrorMessage(
        `Section ${this.sectionId} contains no monsters`
      );
      return;
    }

    // Collect monsters from ALL rooms
    const sectionCreatures: Creature[] = section.rooms
      .flatMap(room => room.monster ?? [])
      .filter(m => m); // remove null/undefined if any

    if (sectionCreatures.length === 0) {
      this.notificationService.emitErrorMessage(
        `${this.sectionId} has no monsters for mission ${this.scenarioId}`
      );
      return;
    }


    sectionCreatures.forEach(creature => {
      const newCreature: Creature = {
        type: creature.name,
        level: this.scenarioLevel,
        isElite: creature?.type === 'elite' || creature?.player4 === 'elite',
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

  async endGame(): Promise<void> {
    const scenarioRef = await this.db.getScenarioReference(this.scenarioLevel);
    const bonusXp =
      Number(scenarioRef?.bonus_experience ?? 0) +
      Number(this.bonusXp ?? 0);

    this.endGameConfirmationMessage = `Award ${bonusXp} bonus XP to all characters?`;
    this.showEndGameConfirmation = true;
  }

  async onEndGameConfirmed(): Promise<void> {
    this.showEndGameConfirmation = false;

    const scenarioRef = await this.db.getScenarioReference(this.scenarioLevel);
    const bonusXp =
      Number(scenarioRef?.bonus_experience ?? 0) +
      Number(this.bonusXp ?? 0);

    const characters = this.appContext.getCreatures().filter(c => !c.aggressive);

    for (const c of characters) {
      const live = this.appContext.findCreature(c.id);

      const newTotalXp = (live.totalXp ?? 0) + bonusXp;
      const newLevel = this.xpService.levelFromXp(newTotalXp);

      // UI updates
      this.appContext.updateCreatureBaseStat(live.id!, 'totalXp', newTotalXp, true);
      this.appContext.updateCreatureBaseStat(live.id!, 'level', newLevel, true);
      this.appContext.updateCreatureBaseStat(
        live.id!,
        'sessionExperience',
        (live.sessionExperience ?? 0) + bonusXp,
        true
      );

      try {
        await this.db.updateCharacterProgress(live.type, newLevel, newTotalXp);
      } catch {
        this.notificationService.emitErrorMessage(`Failed to persist XP for ${live.type}`);
      }
    }
  }

  onEndGameCancelled(): void {
    this.showEndGameConfirmation = false;
  }
}