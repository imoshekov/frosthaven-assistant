import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppContext } from '../app-context';
import { Creature } from '../types/game-types';
import { StringUtils } from '../services/string-utils.service';
import { DataLoaderService } from '../services/data-loader.service';
import { Monster } from '../types/data-file-types';
import { NotificationService } from '../services/notification.service';
import { GlobalTelInputDirective } from '../directives/global-tel-input.directive';
import { CreatureFactoryService } from '../services/creature-factory.service';


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
    private stringUtils: StringUtils,
    private dataLoader: DataLoaderService,
    private notificationService: NotificationService,
    private creatureFactory: CreatureFactoryService
  ) {
    this.monsters = this.dataLoader.getData().monsters;
  }

  // --- Autocomplete Methods ---
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
    const monsterData = this.monsters.find(monster => monster.name === this.type);
    if (!monsterData) {
      this.notificationService.emitErrorMessage(`Unable to find monster type ${this.type}`);
      return;
    }

    const selectedMonster = this.isElite
      ? monsterData?.stats.find(x => x.type === 'elite' && x.level === this.level)
      : monsterData?.stats[this.level];

    const creature: Creature = {
      name: `${this.type} ${this.standee}`,
      type: this.type,
      standee: this.standee,
      level: this.level,
      hp: this.stringUtils.parseInt(selectedMonster?.health ?? 0),
      attack: this.stringUtils.parseInt(selectedMonster?.attack ?? 0),
      movement: Math.max(Number(monsterData?.baseStat?.movement ?? 0), Number(selectedMonster?.movement ?? 0)),
      armor: this.stringUtils.parseInt(selectedMonster?.actions?.find(x => x.type === 'shield')?.value ?? 0),
      retaliate: this.stringUtils.parseInt(selectedMonster?.actions?.find(x => x.type === 'retaliate')?.value ?? 0),
      isElite: this.isElite,
    };

   
    this.appContext.addCreature(this.creatureFactory.createCreature(creature));
    this.monsterEvent.emit('monster-added');
    console.log(this.appContext.getCreatures());
  }
}
