import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AppContext } from '../app-context';
import { Creature } from '../types/game-types';

/**
 * Speaks the name of the single hero holding up the round.
 *
 * Active only when every hero but one has submitted a hidden initiative. Once
 * that state has held for NAG_DELAY_MS the stalling player's name is spoken,
 * and repeated every NAG_DELAY_MS until they submit. Desktop only — phones and
 * tablets are typically the players' own devices, and nagging yourself is noise.
 */
@Injectable({ providedIn: 'root' })
export class InitiativeNagService implements OnDestroy {
  private static readonly NAG_DELAY_MS = 15000;

  private sub?: Subscription;
  private timer?: ReturnType<typeof setInterval>;
  /** Creature id currently being waited on, so we only restart the clock when it changes. */
  private pendingId: string | null = null;

  constructor(private appContext: AppContext) { }

  /** Call once from the root component. No-op on non-desktop clients. */
  init(): void {
    if (this.sub || !this.isDesktop() || !this.canSpeak()) return;
    this.sub = this.appContext.creatures$.subscribe(creatures => this.evaluate(creatures));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.stop();
  }

  private evaluate(creatures: Creature[]): void {
    const stalling = this.findLoneStaller(creatures);

    if (!stalling) {
      this.stop();
      return;
    }

    // Same player still stalling: leave the running timer alone so the 15s
    // window measures from when they became the last one, not from the most
    // recent unrelated creature update (hp, conditions, etc.).
    if (stalling.id === this.pendingId) return;

    this.stop();
    this.pendingId = stalling.id ?? null;
    this.timer = setInterval(() => this.speakFor(stalling.id), InitiativeNagService.NAG_DELAY_MS);
  }

  /**
   * The one hero everyone is waiting on, or null when zero or several are
   * pending — a single name is only meaningful when exactly one is left.
   */
  private findLoneStaller(creatures: Creature[]): Creature | null {
    const heroes = creatures.filter(c => !c.aggressive);
    if (heroes.length < 2) return null;

    const pending = heroes.filter(c => !(c.hiddenInitiative > 0) && !(c.initiative > 0));
    return pending.length === 1 ? pending[0] : null;
  }

  /**
   * Re-read the creature at speak time: the subscription may not have fired
   * between the player submitting and this tick, and we never want to call out
   * someone who is already done.
   */
  private speakFor(creatureId: string | undefined): void {
    // findCreature throws when the hero was removed while the timer was running.
    const current = this.appContext.getCreatures().find(c => c.id === creatureId);
    if (!current || current.hiddenInitiative > 0 || current.initiative > 0) {
      this.stop();
      return;
    }

    this.speak(`${this.spokenName(current)}, we are waiting on your initiative.`);
  }

  /**
   * Phonetic spelling when the character has one, otherwise the plain name.
   * Names that a speech engine mangles (transliterated or non-English ones)
   * can set `namePronunciation` to spell out how they should sound.
   */
  private spokenName(creature: Creature): string {
    return creature.namePronunciation?.trim()
      || creature.name?.trim()
      || creature.type
      || 'Someone';
  }

  private speak(text: string): void {
    if (!this.canSpeak()) return;

    const synth = window.speechSynthesis;
    // Drop any queued nag so a slow voice can't stack up utterances.
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    synth.speak(utterance);
  }

  private stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.pendingId = null;
  }

  private canSpeak(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  /**
   * Desktop means a device with a fine pointer and no touch primary input.
   * Covers phones and tablets (including iPads reporting a desktop UA) without
   * relying on user-agent sniffing.
   */
  private isDesktop(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(pointer: fine) and (hover: hover)').matches;
  }
}
