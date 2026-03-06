import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AppContext } from '../../../app-context';
import { Creature } from '../../../types/game-types';
import { InitiativeService } from '../../../services/initiative.service';
import { GlobalTelInputDirective } from '../../../directives/global-tel-input.directive';

@Component({
  selector: 'app-initiative-bubble',
  templateUrl: './initiative-bubble.component.html',
  styleUrls: ['./initiative-bubble.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, GlobalTelInputDirective]
})
export class InitiativeBubbleComponent implements OnInit, OnDestroy {
  isOpen = false;
  selectedCharacterType: string | null = null;
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
  }

  get characters(): Creature[] {
    return this.appContext.getCreatures().filter(c => !c.aggressive);
  }

  get selectedCharacterName(): string {
    if (!this.selectedCharacterType) return '';
    const char = this.characters.find(c => c.type === this.selectedCharacterType);
    return char?.name || this.selectedCharacterType;
  }

  get submittedInitiative(): number | null {
    if (!this.selectedCharacterType) return null;
    const char = this.appContext.getCreatures().find(
      c => c.type === this.selectedCharacterType && !c.aggressive
    );
    return char?.hiddenInitiative > 0 ? char.hiddenInitiative : null;
  }

  selectCharacter(type: string): void {
    this.initiativeService.selectCharacter(type);
    this.refreshInitiativeInput();
  }

  submitInitiative(): void {
    const val = parseInt(this.initiativeInput, 10);
    const isValid = !isNaN(val) && val >= 0 && val <= 99 && this.selectedCharacterType;
    if (!isValid) return;

    const character = this.appContext.getCreatures()
      .find(c => !c.aggressive && c.type === this.selectedCharacterType);
    if (character?.id) {
      this.appContext.updateCreatureMultipleStats(character.id, { hiddenInitiative: val });
    }

    this.initiativeInput = '';
    this.isOpen = false;
  }

  clearCharacterSelection(): void {
    this.initiativeService.selectCharacter(null);
    this.initiativeInput = '';
  }

  toggleOpen(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.refreshInitiativeInput();
    }
  }

  close(): void {
    this.isOpen = false;
  }

  private refreshInitiativeInput(): void {
    if (!this.selectedCharacterType) {
      this.initiativeInput = '';
      return;
    }
    const char = this.appContext.getCreatures().find(
      c => c.type === this.selectedCharacterType && !c.aggressive
    );
    this.initiativeInput = String(char.hiddenInitiative ?? '');
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
}
