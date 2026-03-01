import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AppContext } from '../../../app-context';
import { Creature } from '../../../types/game-types';
import { InitiativeService } from '../../../services/initiative.service';

@Component({
  selector: 'app-initiative-bubble',
  templateUrl: './initiative-bubble.component.html',
  styleUrls: ['./initiative-bubble.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class InitiativeBubbleComponent implements OnInit, OnDestroy {
  isOpen = false;
  selectedCharacterType: string | null = null;
  pendingInitiative: number | null = null;
  initiativeInput: string = '';

  private unsubscribe$ = new Subject<void>();

  constructor(
    public appContext: AppContext,
    public initiativeService: InitiativeService
  ) {}

  ngOnInit(): void {
    this.initiativeService.selectedCharacterType$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(type => {
        this.selectedCharacterType = type;
      });

    this.initiativeService.pendingInitiative$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(value => {
        this.pendingInitiative = value;
        this.initiativeInput = value !== null ? String(value) : '';
      });

  }

  get characters(): Creature[] {
    return this.appContext.getCreatures().filter(c => !c.aggressive);
  }

  selectCharacter(type: string): void {
    this.initiativeService.selectCharacter(type);
  }

  submitInitiative(): void {
    const val = parseInt(this.initiativeInput, 10);
    if (!isNaN(val) && val >= 0 && val <= 99) {
      this.initiativeService.setPendingInitiative(val);
      this.isOpen = false;
    }
  }

  clearCharacterSelection(): void {
    this.initiativeService.selectCharacter(null);
  }

  toggleOpen(): void {
    this.isOpen = !this.isOpen;
  }

  close(): void {
    this.isOpen = false;
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
}
