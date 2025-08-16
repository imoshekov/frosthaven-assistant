import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppContext } from '../app-context'; // 
import { Creature } from '../types/game-types';
import { StringUtils } from '../services/StringUtils';
import { DataLoaderService } from '../services/data-loader.service';


@Component({
  selector: 'app-monster',
  templateUrl: './monster.component.html',
  styleUrls: ['./monster.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class MonsterComponent {
  @Output() monsterEvent = new EventEmitter<string>();

  constructor(
    private appContext: AppContext,
    private stringUtils: StringUtils
  ) { }

  addMonster() {
    const type = "algox-guard";
    const isElite = false;
    const level = 1;
    const standeeNo = 5;
    const data = new DataLoaderService().getData();

    const monsterData = data.monsters.find(monster => monster.name === type);
    const selectedMonster = isElite
      ? monsterData?.stats.find(x => x.type === 'elite' && x.level === level)
      : monsterData?.stats[level];

    const creature: Creature = {
      id: this.appContext.generateCreatureId(),
      name: `${type} - ${standeeNo}`,
      type: "algox-guard",
      standee: standeeNo,
      hp: this.stringUtils.parseInt(selectedMonster?.health ?? 0),
      attack: this.stringUtils.parseInt(Number(selectedMonster?.attack)),
      movement: Math.max(Number(monsterData?.baseStat?.movement ?? 0), Number(selectedMonster?.movement ?? 0)),
      initiative: 0,
      armor: this.stringUtils.parseInt(Number(selectedMonster?.actions?.find(x => x.type === 'shield')?.value)),
      retaliate: this.stringUtils.parseInt(Number(selectedMonster?.actions?.find(x => x.type === 'retaliate')?.value)),
      aggressive: true,
      isElite: isElite,
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
