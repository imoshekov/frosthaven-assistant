import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AppContext } from '../../../app-context';
import { Creature } from '../../../types/game-types';
import { GlobalTelInputDirective } from '../../../directives/global-tel-input.directive';


enum BuffTypes {
  armor = "armor",
  retaliate = "retaliate",
  roundArmor = "roundArmor",
  roundRetaliate = "roundRetaliate",
  hp = "hp",
}
interface Buffs {
  type: BuffTypes,
  value: number;
}

@Component({
  selector: 'app-buffs',
  standalone: true,
  imports: [CommonModule, GlobalTelInputDirective],
  templateUrl: './buffs.component.html',
  styleUrl: './buffs.component.scss'
})
export class BuffsComponent {
  @Input() creature!: Creature;
  private buffs: Buffs[] = [];

  constructor(public appContext: AppContext) { }

  storeBuff(stat: string, value: number) {
    this.buffs.push({
      type: stat as BuffTypes,
      value: value
    })
  }

  publishBuffs() {
    const hpBuff = this.buffs.find(b => b.type === BuffTypes.hp);
    const otherBuffs = this.buffs.filter(b => b.type !== BuffTypes.hp);

    // Apply other buffs (armor, retaliate) to all creatures of the same type
    otherBuffs.forEach(buff => {
      this.appContext.updateCreatureBaseStat(this.creature.id!, buff.type, buff.value, true);
    });

    // Apply HP only to creatures matching type AND elite status (the group)
    if (hpBuff) {
      const groupCreatures = this.appContext.getCreatures().filter(c =>
        c.type === this.creature.type && c.isElite === this.creature.isElite
      );
      groupCreatures.forEach(c => {
        this.appContext.updateCreatureMultipleStats(c.id!, { hp: hpBuff.value, maxHp: hpBuff.value });
      });
    }
  }
}
