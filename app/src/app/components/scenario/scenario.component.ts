import { Component, OnDestroy, OnInit } from '@angular/core';
import { GameComponent } from './game-section/game.component';
import { ElementComponent } from './element/element.component';
import { AttackModalComponent } from './attack/attack-modal.component';
import { LogComponent } from './log/log.component';
import { AddMonsterComponent } from './add-monster/add-monster.component';
import { AppContext } from '../../app-context';
import { CommonModule } from '@angular/common';
import { RoundComponent } from './round/round.component';
import { Element, ELEMENT_HOLD_CYCLE, ELEMENT_HOLD_INDEFINITE, ElementState, ElementType } from '../../types/game-types';
import { SetupComponent } from './setup/setup.component';
import { ScenarioMonsterReference } from './monster-reference/scenario-monster-reference.component';
import { ConnectionStatusComponent } from './connection-status/connection-status.component';
import { LootComponent } from './loot/loot.component';
import { ScenarioGeneralReferenceComponent } from './scenario-general-reference/scenario-general-reference.component';
import { InitiativeBubbleComponent } from './initiative-bubble/initiative-bubble.component';
import { Subscription } from 'rxjs';

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
    ScenarioGeneralReferenceComponent,
    ScenarioMonsterReference,
    ConnectionStatusComponent,
    LootComponent,
    InitiativeBubbleComponent
  ]
})
export class ScenarioComponent implements OnInit, OnDestroy {
  elements: Element[] = [
    { type: ElementType.Fire, state: ElementState.None },
    { type: ElementType.Ice, state: ElementState.None },
    { type: ElementType.Earth, state: ElementState.None },
    { type: ElementType.Air, state: ElementState.None },
    { type: ElementType.Light, state: ElementState.None },
    { type: ElementType.Dark, state: ElementState.None }
  ];

  private holdSub?: Subscription;
  private holdRoundsPerElement: number[] = [];

  constructor(
    public appContext: AppContext
  ) {
  }

  ngOnInit(): void {
    this.holdSub = this.appContext.elements$.subscribe(elements => {
      this.holdRoundsPerElement = elements.map(el => el.holdRounds ?? 0);
    });
  }

  ngOnDestroy(): void {
    this.holdSub?.unsubscribe();
  }

  /** Shared hold value, or null when elements are held for differing durations. */
  get sharedHoldRounds(): number | null {
    const [first, ...rest] = this.holdRoundsPerElement;
    if (first === undefined) return 0;
    return rest.every(value => value === first) ? first : null;
  }

  get isAllHeld(): boolean {
    return this.holdRoundsPerElement.some(value => value !== 0);
  }

  get holdAllLabel(): string {
    const shared = this.sharedHoldRounds;
    if (shared === null) return '*';
    if (shared === ELEMENT_HOLD_INDEFINITE) return '\u221e';
    return shared > 0 ? String(shared) : '';
  }

  get holdAllTooltip(): string {
    const shared = this.sharedHoldRounds;
    if (shared === null) return 'Elements are held for different durations';
    if (shared === ELEMENT_HOLD_INDEFINITE) return 'All elements held until released';
    if (shared > 0) return `All elements held for ${shared} more round${shared === 1 ? '' : 's'}`;
    return 'Hold all elements at their current state';
  }

  cycleHoldAll(): void {
    const shared = this.sharedHoldRounds;
    const currentIndex = shared === null ? -1 : ELEMENT_HOLD_CYCLE.indexOf(shared);
    const next = ELEMENT_HOLD_CYCLE[(currentIndex + 1) % ELEMENT_HOLD_CYCLE.length];

    this.appContext.setElements(
      this.appContext.getElements().map(el => ({ ...el, holdRounds: next }))
    );
  }
}