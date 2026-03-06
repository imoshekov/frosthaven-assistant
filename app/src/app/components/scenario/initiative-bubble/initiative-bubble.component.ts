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
  submissions: Record<string, number> = {}; /** characterType → submitted hiddenInitiative */
  initiativeInput: string = '';

  private unsubscribe$ = new Subject<void>();

  constructor(
    public appContext: AppContext,
    public initiativeService: InitiativeService
  ) {}

  ngOnInit(): void {
    this.initiativeService.selectedCharacterType$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(type => { this.selectedCharacterType = type; });
    this.initiativeService.submissions$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(s => { this.submissions = s; });
  }

  get characters(): Creature[] {
    return this.appContext.getCreatures().filter(c => !c.aggressive);
  }

  get selectedCharacterName(): string {
    if (!this.selectedCharacterType) return '';
    const char = this.characters.find(c => c.type === this.selectedCharacterType);
    return char?.name || this.selectedCharacterType;
  }

  private get selectedChar(): Creature | undefined {
    return this.appContext.getCreatures().find(
      c => c.type === this.selectedCharacterType && !c.aggressive
    );
  }

  private get isOwnCharacter(): boolean {
    if (!this.selectedCharacterType) return false;
    const submittedVal = this.submissions[this.selectedCharacterType];
    if (submittedVal === undefined) return false;
    const hidden = this.selectedChar?.hiddenInitiative ?? 0;
    if (hidden > 0) return hidden === submittedVal;
    return true; // no pending hidden initiative — character is ours to submit for
  }

  get initiativeDisplayMode(): 'input' | 'hidden' | 'revealed' {
    const char = this.selectedChar;
    if (!char) return 'input';

    if (this.isOwnCharacter) {
      if (char.initiative > 0 && !(char.hiddenInitiative > 0)) return 'revealed';
      return 'input';
    }

    if (char.hiddenInitiative > 0) return 'hidden';
    if (char.initiative > 0) return 'revealed';
    return 'input';
  }

  get revealedInitiative(): number {
    return this.selectedChar?.initiative ?? 0;
  }

  /** Value shown in the "Ready: X" label and the floating button badge for the selected character. */
  get submittedInitiative(): number | null {
    if (!this.selectedCharacterType) return null;
    if (this.submissions[this.selectedCharacterType] === undefined) return null;
    const char = this.appContext.getCreatures().find(
      c => c.type === this.selectedCharacterType && !c.aggressive
    );
    if (!char) return null;
    if (char.hiddenInitiative > 0) return char.hiddenInitiative;
    if (char.initiative > 0) return char.initiative; // revealed
    return null; // round was reset
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
      this.initiativeService.setSubmission(this.selectedCharacterType, val);
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
    const char = this.selectedChar;
    if (!char) {
      this.initiativeInput = '';
      return;
    }
    // Pre-fill only for own character with a pending hidden initiative
    if (this.isOwnCharacter && char.hiddenInitiative > 0) {
      this.initiativeInput = String(char.hiddenInitiative);
    } else {
      this.initiativeInput = '';
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
}
