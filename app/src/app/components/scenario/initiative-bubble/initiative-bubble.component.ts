import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AppContext, LONG_REST_INITIATIVE } from '../../../app-context';
import { Creature } from '../../../types/game-types';
import { InitiativeService, InitiativeSubmission } from '../../../services/initiative.service';
import { CharacterDeckService } from '../../../services/character-deck.service';
import { GlobalTelInputDirective } from '../../../directives/global-tel-input.directive';
import {
  allHeroesSubmitted,
  isInitiativeSubmitted,
  isHero,
} from '../../../types/turn-state.util';

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
  /** characterType → the initiative pair submitted from this client. */
  submissions: Record<string, InitiativeSubmission> = {};

  /** The two cards being played. Turn order always follows the main card's initiative. */
  mainInput: string = '';
  secondaryInput: string = '';

  private unsubscribe$ = new Subject<void>();

  constructor(
    public appContext: AppContext,
    public initiativeService: InitiativeService,
    private deckService: CharacterDeckService
  ) {}

  ngOnInit(): void {
    this.initiativeService.selectedCharacterType$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(type => {
        this.selectedCharacterType = type;
        // Needed to check a typed initiative against the deck below. Covers a
        // character restored from localStorage on load, not just a fresh click —
        // selectCharacter() below covers that path too, and loadDeck dedupes either way.
        if (type) this.deckService.loadDeck(type);
      });
    this.initiativeService.submissions$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(s => { this.submissions = s; });
  }

  get characters(): Creature[] {
    return this.appContext.getCreatures().filter(isHero);
  }

  get selectedCharacterName(): string {
    if (!this.selectedCharacterType) return '';
    const char = this.characters.find(c => c.type === this.selectedCharacterType);
    return char?.name || this.selectedCharacterType;
  }

  private get selectedChar(): Creature | undefined {
    return this.appContext.getCreatures().find(
      c => c.type === this.selectedCharacterType && isHero(c)
    );
  }

  private get isOwnCharacter(): boolean {
    if (!this.selectedCharacterType) return false;
    const submitted = this.submissions[this.selectedCharacterType];
    if (submitted === undefined) return false;
    const hidden = this.selectedChar?.hiddenInitiative ?? 0;
    if (hidden > 0) return hidden === submitted.main;
    return true; // no pending hidden initiative — character is ours to submit for
  }

  /**
   * True once every hero has committed their turn, so no new submissions are taken.
   *
   * Scoped to heroes: this previously also tested `creatures.some(c => c.initiative > 0)`
   * across monsters, so typing a monster's initiative locked hero input — which with
   * two fields would strand a player midway through entering their pair.
   */
  get initiativesLocked(): boolean {
    const creatures = this.appContext.getCreatures();
    if (allHeroesSubmitted(creatures)) return true;
    return creatures.filter(isHero).some(c => c.initiative > 0);
  }

  get initiativeDisplayMode(): 'input' | 'hidden' | 'revealed' {
    if (this.initiativesLocked) return 'revealed';

    const char = this.selectedChar;
    if (!char) return 'input';

    if (this.isOwnCharacter) {
      // Partial entry stays in input mode, which is what keeps this a three-state
      // machine rather than one state per field.
      if (isInitiativeSubmitted(char) && !(char.hiddenInitiative > 0)) return 'revealed';
      return 'input';
    }

    if (char.hiddenInitiative > 0) return 'hidden';
    if (char.initiative > 0) return 'revealed';
    return 'input';
  }

  get revealedInitiative(): number {
    return this.selectedChar?.initiative ?? 0;
  }

  get revealedSecondaryInitiative(): number {
    return this.selectedChar?.secondaryInitiative ?? 0;
  }

  /** True when this client has an active submission for the selected character. */
  get hasSubmitted(): boolean {
    if (!this.selectedCharacterType) return false;
    if (this.submissions[this.selectedCharacterType] === undefined) return false;
    const char = this.selectedChar;
    return !!char && (char.hiddenInitiative > 0 || char.initiative > 0);
  }

  /** True when this client has at least one active submission across all characters. */
  get hasAnySubmission(): boolean {
    return Object.keys(this.submissions).some(type => {
      const char = this.appContext.getCreatures().find(c => c.type === type && isHero(c));
      return !!char && (char.hiddenInitiative > 0 || char.initiative > 0);
    });
  }

  /**
   * The pair shown on the badge for the selected character:
   * - own character with a pending hidden initiative: the numbers (you may see your own)
   * - another player's pending initiative: null, so the badge shows ✓ and leaks nothing
   * - revealed: the numbers, which are public by then
   * - fresh round: null
   */
  get submittedInitiativePair(): { main: number; secondary: number } | null {
    if (!this.selectedCharacterType) return null;
    if (this.submissions[this.selectedCharacterType] === undefined) return null;
    const char = this.selectedChar;
    if (!char) return null;

    if (char.hiddenInitiative > 0) {
      if (!this.isOwnCharacter) return null;
      return { main: char.hiddenInitiative, secondary: char.secondaryHiddenInitiative ?? 0 };
    }
    if (char.initiative > 0) {
      return { main: char.initiative, secondary: char.secondaryInitiative ?? 0 };
    }
    return null;
  }

  selectCharacter(type: string): void {
    this.initiativeService.selectCharacter(type);
    this.refreshInitiativeInputs();
  }

  /** Both values must be present and in range before Submit is offered. */
  get pairComplete(): boolean {
    return this.isValidInitiative(this.mainInput) && this.isValidInitiative(this.secondaryInput);
  }

  /**
   * You cannot play the same card twice, so two equal initiatives are a mistake —
   * unless the class prints both of its initiatives on one card, as Blinkblade does,
   * or the pair is `LONG_REST_INITIATIVE`/`LONG_REST_INITIATIVE` — reopening the
   * bubble after long-resting refills the inputs with that reserved sentinel (see
   * `refreshInitiativeInputs`), which is a deliberate "no card played" pair, not a
   * mistaken duplicate.
   */
  get pairIsDuplicate(): boolean {
    if (!this.pairComplete) return false;
    const main = parseInt(this.mainInput, 10);
    const secondary = parseInt(this.secondaryInput, 10);
    if (main === LONG_REST_INITIATIVE && secondary === LONG_REST_INITIATIVE) return false;
    if (this.selectedCharacterType && this.deckService.hasPackedInitiatives(this.selectedCharacterType)) {
      return false;
    }
    return main === secondary;
  }

  get canSubmit(): boolean {
    return !this.initiativesLocked
      && !!this.selectedCharacterType
      && this.pairComplete
      && !this.pairIsDuplicate;
  }

  private isValidInitiative(raw: string): boolean {
    const value = parseInt(raw, 10);
    return !isNaN(value) && value >= 1 && value <= 99;
  }

  /**
   * True once a fully-typed value doesn't match any card this character could be
   * holding — a likely typo, since the physical deck is fixed and every one of its
   * cards (all 504 across all 17 classes) carries its real printed initiative even
   * where the rest of that card isn't authored yet. Silent while the field is still
   * empty/partial, while no character is selected, or while that class's deck hasn't
   * loaded yet (checked, never assumed, so a slow fetch never flags a false positive).
   */
  private isInitiativeUnknown(raw: string): boolean {
    if (!this.isValidInitiative(raw)) return false;
    const type = this.selectedCharacterType;
    const char = this.selectedChar;
    if (!type || !char) return false;

    const value = parseInt(raw, 10);
    if (value === LONG_REST_INITIATIVE) return false; // the "no card played" sentinel

    if (!this.deckService.getLoadedDeck(type)) return false;
    return this.deckService.resolve(type, char.level ?? 1, value).length === 0;
  }

  get mainInitiativeUnknown(): boolean {
    return this.isInitiativeUnknown(this.mainInput);
  }

  get secondaryInitiativeUnknown(): boolean {
    return this.isInitiativeUnknown(this.secondaryInput);
  }

  submitInitiative(): void {
    if (!this.canSubmit) return;

    const main = parseInt(this.mainInput, 10);
    const secondary = parseInt(this.secondaryInput, 10);

    const character = this.selectedChar;
    if (character?.id) {
      // One patch, so the pair lands in a single emission and a single undo batch.
      this.appContext.updateCreatureMultipleStats(character.id, {
        hiddenInitiative: main,
        secondaryHiddenInitiative: secondary,
      });
      this.initiativeService.setSubmission(this.selectedCharacterType!, main, secondary);
    }

    this.mainInput = '';
    this.secondaryInput = '';
    this.isOpen = false;
  }

  /**
   * Plays no cards this round: submits the same sentinel pair a downed hero gets
   * auto-filled with (see `AppContext.longRest`), so it reveals — and the turn
   * finalizes — alongside everyone else instead of jumping ahead on its own.
   */
  longRest(): void {
    if (this.initiativesLocked || !this.selectedCharacterType) return;

    const character = this.selectedChar;
    if (character?.id) {
      this.appContext.longRest(character.id);
      this.initiativeService.setSubmission(this.selectedCharacterType, LONG_REST_INITIATIVE, LONG_REST_INITIATIVE);
    }

    this.mainInput = '';
    this.secondaryInput = '';
    this.isOpen = false;
  }

  clearCharacterSelection(): void {
    this.initiativeService.selectCharacter(null);
    this.mainInput = '';
    this.secondaryInput = '';
  }

  toggleOpen(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.refreshInitiativeInputs();
    }
  }

  close(): void {
    this.isOpen = false;
  }

  private refreshInitiativeInputs(): void {
    this.mainInput = '';
    this.secondaryInput = '';

    if (!this.selectedCharacterType) return;
    const char = this.selectedChar;
    if (!char) return;

    // Pre-fill only for our own character with a pending hidden initiative.
    if (this.isOwnCharacter && char.hiddenInitiative > 0) {
      this.mainInput = String(char.hiddenInitiative);
      this.secondaryInput = char.secondaryHiddenInitiative > 0
        ? String(char.secondaryHiddenInitiative)
        : '';
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
}
