import { Injectable } from '@angular/core';
import {
  CardHalf,
  CardHalfName,
  CharacterAbilityCard,
  CharacterDeck,
} from '../types/character-card-types';

/** A card whose initiative matches a submitted value. */
export interface CardCandidate {
  card: CharacterAbilityCard;
  /** The 1..99 value that matched — for Blinkblade this is one of its two identities. */
  matchedInitiative: number;
  /** Which Blinkblade identity matched, when applicable. */
  identity?: 'fast' | 'slow';
}

/**
 * Classes that pack two initiatives into one printed value. A set rather than an
 * `if`, so adding a future dual-identity class is a one-line change.
 */
const PACKED_INITIATIVE_CLASSES: ReadonlySet<string> = new Set(['blinkblade']);

/**
 * Loads and queries player ability card decks.
 *
 * Decks are served as JSON assets from `/data/character-decks/<class>.json` and fetched
 * lazily per class, rather than inlined into `data-loader.service.ts` — that service is
 * already 72k lines in the main bundle, and card data needs to stay hand-editable for
 * the majority of Frosthaven card halves that are not yet authored.
 */
@Injectable({ providedIn: 'root' })
export class CharacterDeckService {
  /** In-flight and settled fetches, so a class is requested at most once. */
  private readonly decks = new Map<string, Promise<CharacterDeck | null>>();
  private readonly loaded = new Map<string, CharacterDeck>();
  /** cardId -> card, across every loaded deck. cardId is globally unique. */
  private readonly cardsById = new Map<number, CharacterAbilityCard>();
  private readonly warned = new Set<string>();

  /** Fetches a deck, or returns null when the class has no data file. */
  loadDeck(characterClass: string): Promise<CharacterDeck | null> {
    if (!characterClass) return Promise.resolve(null);

    const existing = this.decks.get(characterClass);
    if (existing) return existing;

    const pending = this.fetchDeck(characterClass).then(deck => {
      // A failed fetch must not be remembered for the rest of the session: a flaky
      // connection on first open would otherwise pin the class to manual entry until
      // a reload. Forgetting the promise lets the next loadDeck() try again. A class
      // with genuinely no data file re-fetches too, but that costs one 404 per open
      // of its panel — cheap next to permanently losing a deck that does exist.
      if (!deck) this.decks.delete(characterClass);
      return deck;
    });
    this.decks.set(characterClass, pending);
    return pending;
  }

  /** Kicks off loads for several classes at once; failures are non-fatal. */
  async preload(characterClasses: string[]): Promise<void> {
    const unique = [...new Set(characterClasses.filter(Boolean))];
    await Promise.all(unique.map(c => this.loadDeck(c)));
  }

  /** Synchronous access for templates. Null until `loadDeck` has resolved. */
  getLoadedDeck(characterClass: string): CharacterDeck | null {
    return this.loaded.get(characterClass) ?? null;
  }

  private async fetchDeck(characterClass: string): Promise<CharacterDeck | null> {
    // Mirrors LocalStorageService.loadFile: resolve against the <base href> so the
    // app works under the /frosthaven-assistant/ path prefix.
    const base = new URL(document.baseURI);
    base.hash = '';
    const url = new URL(`data/character-decks/${characterClass}.json`, base);

    try {
      const response = await fetch(url.href);
      if (!response.ok) {
        this.warnOnce(characterClass, `HTTP ${response.status}`);
        return null;
      }
      const deck = (await response.json()) as CharacterDeck;
      this.loaded.set(characterClass, deck);
      for (const card of deck.cards ?? []) this.cardsById.set(card.cardId, card);
      return deck;
    } catch (error) {
      this.warnOnce(characterClass, String(error));
      return null;
    }
  }

  private warnOnce(characterClass: string, reason: string): void {
    if (this.warned.has(characterClass)) return;
    this.warned.add(characterClass);
    console.warn(`No ability card deck for "${characterClass}" (${reason}); the actions panel will fall back to manual entry.`);
  }

  /**
   * Cards a hero of this level could be holding: level at or below theirs, plus every
   * level-X card. Hand contents are not modelled — the physical cards are the truth.
   */
  cardsForLevel(deck: CharacterDeck | null, heroLevel: number): CharacterAbilityCard[] {
    if (!deck) return [];
    const level = Number.isFinite(heroLevel) ? heroLevel : 1;
    return (deck.cards ?? []).filter(card => card.level === 'X' || Number(card.level) <= level);
  }

  /**
   * Cards matching a submitted initiative.
   *
   * Returns 0 candidates when the value belongs to a card above the hero's level or to
   * no card at all, 1 when it resolves cleanly, and more when the deck genuinely
   * contains an ambiguity — 8 of the 17 Frosthaven decks do, so the caller must offer
   * a chooser rather than assuming a single answer.
   */
  resolve(characterClass: string, heroLevel: number, initiative: number): CardCandidate[] {
    const deck = this.getLoadedDeck(characterClass);
    if (!deck || !(initiative > 0)) return [];

    const candidates: CardCandidate[] = [];
    for (const card of this.cardsForLevel(deck, heroLevel)) {
      for (const match of this.matchesFor(card, characterClass, initiative)) {
        candidates.push(match);
      }
    }

    // Stable ordering so the chooser reads the same on every client.
    return candidates.sort((a, b) => {
      const levelA = a.card.level === 'X' ? 0 : Number(a.card.level);
      const levelB = b.card.level === 'X' ? 0 : Number(b.card.level);
      return levelA - levelB || a.card.cardId - b.card.cardId;
    });
  }

  private matchesFor(card: CharacterAbilityCard, characterClass: string, initiative: number): CardCandidate[] {
    if (PACKED_INITIATIVE_CLASSES.has(characterClass)) {
      const out: CardCandidate[] = [];
      if (card.initiativeFast === initiative) {
        out.push({ card, matchedInitiative: initiative, identity: 'fast' });
      }
      if (card.initiativeSlow === initiative) {
        out.push({ card, matchedInitiative: initiative, identity: 'slow' });
      }
      return out;
    }
    return card.initiative === initiative ? [{ card, matchedInitiative: initiative }] : [];
  }

  cardById(cardId: number | null | undefined): CharacterAbilityCard | null {
    if (typeof cardId !== 'number') return null;
    return this.cardsById.get(cardId) ?? null;
  }

  half(card: CharacterAbilityCard | null, half: CardHalfName): CardHalf | null {
    if (!card) return null;
    return half === 'top' ? card.top : card.bottom;
  }

  /** True when this class prints two initiatives on each card. */
  hasPackedInitiatives(characterClass: string): boolean {
    return PACKED_INITIATIVE_CLASSES.has(characterClass);
  }

  /**
   * Splits a packed initiative into its two identities.
   *
   * Blinkblade prints both its slow and fast initiative on every card, encoded as a
   * single number: 2050 is 20/50, and 232 is 02/32. Values of 99 or less are not
   * packed — verified against all 17 Frosthaven decks, where Blinkblade is the only
   * class above 99 and all 29 of its cards are.
   */
  static decodePackedInitiative(raw: number): { fast: number; slow: number } | null {
    if (!Number.isFinite(raw) || raw <= 99) return null;
    const padded = String(raw).padStart(4, '0');
    return { fast: Number(padded.slice(0, 2)), slow: Number(padded.slice(2, 4)) };
  }
}
