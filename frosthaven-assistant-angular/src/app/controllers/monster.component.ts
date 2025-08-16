import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppContext } from '../app-context'; // 
import { Creature } from '../types/game-types';
import { StringUtils } from '../services/StringUtils';
import { DataLoaderService } from '../services/data-loader.service';
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-monster',
  templateUrl: './monster.component.html',
  styleUrls: ['./monster.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class MonsterComponent {
  @Output() monsterEvent = new EventEmitter<string>();

  level: number = 1;
  standee: number = 1;
  isElite: boolean = false;

  constructor(
    private appContext: AppContext,
    private stringUtils: StringUtils,
    private dataLoader: DataLoaderService
  ) { }

  addMonster() {
    const type = "algox-guard";
    const monsterData = this.dataLoader.getData().monsters.find(monster => monster.name === type);
    const selectedMonster = this.isElite
      ? monsterData?.stats.find(x => x.type === 'elite' && x.level === this.level)
      : monsterData?.stats[this.level];

    const creature: Creature = {
      id: this.appContext.generateCreatureId(),
      name: `${type} - ${this.standee}`,
      type: "algox-guard",
      standee: this.standee,
      hp: this.stringUtils.parseInt(selectedMonster?.health ?? 0),
      attack: this.stringUtils.parseInt(Number(selectedMonster?.attack)),
      movement: Math.max(Number(monsterData?.baseStat?.movement ?? 0), Number(selectedMonster?.movement ?? 0)),
      initiative: 0,
      armor: this.stringUtils.parseInt(Number(selectedMonster?.actions?.find(x => x.type === 'shield')?.value)),
      retaliate: this.stringUtils.parseInt(Number(selectedMonster?.actions?.find(x => x.type === 'retaliate')?.value)),
      aggressive: true,
      isElite: this.isElite,
      conditions: {
        poison: false,
        wound: false,
        brittle: false,
        ward: false,
        immobilize: false,
        bane: false,
        muddle: false,
        stun: false,
        impair: false,
        disarm: false
      },
      tempStats: {},
      log: []
    };

    this.appContext.addCreature(creature);
    console.log(this.appContext.getCreatures());
    this.monsterEvent.emit('monster-added');
  }
}
