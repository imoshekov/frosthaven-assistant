import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AppContext } from '../../app-context';
import { Creature } from '../../types/game-types';
import { GlobalTelInputDirective } from '../../directives/global-tel-input.directive';


enum BuffTypes {
  armor = "armor",
  retaliate = "retaliate",
  roundArmor = "roundArmor",
  roundRetaliate = "roundRetaliate",
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
    this.buffs.forEach(buff => {
      this.appContext.updateCreatureBaseStat(this.creature.id!, buff.type, buff.value, true);
    });
  }
}
