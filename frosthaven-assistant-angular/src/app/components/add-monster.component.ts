import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppContext } from '../app-context';
import { Creature } from '../types/game-types';
import { DataLoaderService } from '../services/data-loader.service';
import { Monster } from '../types/data-file-types';
import { GlobalTelInputDirective } from '../directives/global-tel-input.directive';
import { CreatureFactoryService } from '../services/creature-factory.service';
import { NotificationService } from '../services/notification.service';


@Component({
  selector: 'app-add-monster',
  templateUrl: './add-monster.component.html',
  styleUrls: ['./add-monster.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, GlobalTelInputDirective]
})
export class MonsterComponent {
  @Output() monsterEvent = new EventEmitter<string>();
  level: number = 1;
  standee: number = 1;
  isElite: boolean = false;
  type: string = '';

  monsters: Monster[] = [];
  filteredMonsters: Monster[] = [];

  constructor(
    private appContext: AppContext,
    private dataLoader: DataLoaderService,
    private creatureFactory: CreatureFactoryService,
    private notificationService: NotificationService
  ) {
    this.monsters = this.dataLoader.getData().monsters;
    this.level = appContext.defaultLevel;
  }

  onTypeInput() {
    const value = this.type.toLowerCase();
    this.filteredMonsters = this.monsters.filter(monster =>
      monster.name.toLowerCase().includes(value)
    );
  }

  selectMonster(monster: { name: string }) {
    this.type = monster.name;
    this.filteredMonsters = [];
  }

  onFocus() {
    this.filteredMonsters = this.monsters.slice();
  }

  onBlur() {
    setTimeout(() => {
      this.filteredMonsters = [];
    }, 150);
  }

  addMonster() {
    if (!this.type) {
      this.notificationService.emitErrorMessage('Please select a monster type.');
      return;
    }
    const creature: Creature = {
      type: this.type,
      standee: this.standee,
      level: this.level,
      isElite: this.isElite,
      aggressive: true
    };

    this.appContext.addCreature(this.creatureFactory.createCreature(creature));
    this.monsterEvent.emit('monster-added');
    this.appContext.addMonsterToggled = false;
  }

  close() {
    this.appContext.addMonsterToggled = false;
  }
}
