import { Component } from '@angular/core';
import { GameComponent } from './game-section/game.component';
import { ElementComponent } from './element/element.component';
import { AttackModalComponent } from './attack/attack-modal.component';
import { LogComponent } from './log/log.component';
import { AddMonsterComponent } from './add-monster/add-monster.component';
import { AppContext } from '../../app-context';
import { CommonModule } from '@angular/common';
import { RoundComponent } from './round/round.component';
import { Element, ElementState, ElementType } from '../../types/game-types';
import { SetupComponent } from './setup/setup.component';
import { LegendComponent } from './legend/legend.component';
import { ScenarioMonsterReference } from './monster-reference/scenario-monster-reference.component';

@Component({
  selector: 'app-scenario',
  standalone: true,
  templateUrl: './scenario.component.html',
  styleUrls: ['./scenario.component.scss'],
  imports: [
    CommonModule,
    GameComponent,
    AttackModalComponent,
    AddMonsterComponent,
    LogComponent,
    RoundComponent,
    ElementComponent,
    SetupComponent,
    LegendComponent,
    ScenarioMonsterReference
  ]
})
export class ScenarioComponent {
  elements: Element[] = [
    { type: ElementType.Fire, state: ElementState.None },
    { type: ElementType.Ice, state: ElementState.None },
    { type: ElementType.Earth, state: ElementState.None },
    { type: ElementType.Air, state: ElementState.None },
    { type: ElementType.Light, state: ElementState.None },
    { type: ElementType.Dark, state: ElementState.None }
  ];
  constructor(
    public appContext: AppContext
  ) {
  }
}