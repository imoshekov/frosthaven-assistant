import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardAction, CardSummon } from '../../../types/character-card-types';

/**
 * Icon class per action type. The classes live in `app/src/icons.scss`, which is
 * global, so no per-component background-image plumbing is needed.
 *
 * `condition` and `element` are absent on purpose: they are containers whose icon
 * comes from their *value* (`.icon.wound`, `.icon.elem-ice`), the same trick already
 * used for monster stat-line conditions in creature-group-header.component.html.
 */
const ACTION_ICON_CLASS: Record<string, string> = {
  attack: 'attack',
  // Not authored card data — only the system's own "Default Move 2" tile uses this.
  move: 'move',
  heal: 'heal',
  shield: 'shield',
  retaliate: 'retaliate',
  pierce: 'pierce',
  ignoreArmor: 'ignoreArmor',
  xp: 'xp',
  damage: 'damage',
  sufferDamage: 'damage',
  swing: 'swing',
  teleport: 'teleport',
  fly: 'flying',
};

/** Wrappers that contribute layout only — render their children, draw nothing. */
const LAYOUT_ONLY_TYPES: ReadonlySet<string> = new Set([
  'forceBox', 'boxFhSubActions', 'extra', 'grant', 'trigger', 'box',
]);

/** Types with no numeric value worth printing next to the icon. */
const VALUELESS_TYPES: ReadonlySet<string> = new Set([
  'condition', 'element', 'elementBonus', 'fly', 'summon', 'ignoreArmor',
]);

@Component({
  selector: 'app-card-action',
  standalone: true,
  // Self-import: the template renders nested subActions through this same component.
  imports: [CommonModule, CardActionComponent],
  templateUrl: './card-action.component.html',
  styleUrls: ['./card-action.component.scss'],
})
export class CardActionComponent {
  @Input() actions: CardAction[] = [];
  /** Guards against a malformed cycle in hand-authored data. */
  @Input() depth = 0;

  readonly maxDepth = 8;

  isLayoutOnly(action: CardAction): boolean {
    return LAYOUT_ONLY_TYPES.has(String(action.type));
  }

  isText(action: CardAction): boolean {
    return action.type === 'text';
  }

  /**
   * A conditional bonus: available only while its elements are active, and consuming
   * them if the player takes it. Rendered as an offer, never as a plain effect.
   */
  isElementBonus(action: CardAction): boolean {
    return action.type === 'elementBonus';
  }

  isSummon(action: CardAction): boolean {
    return action.type === 'summon';
  }

  isPersistentTrack(action: CardAction): boolean {
    return action.type === 'persistentTrack';
  }

  /** Element icon classes for an `element` or `elementBonus` action. */
  elementIcons(action: CardAction): string[] {
    return (action.elements ?? []).map(el => `elem-${el}`);
  }

  /** "consume ICE" vs "consume ICE or AIR". */
  consumeLabel(action: CardAction): string {
    const elements = action.elements ?? [];
    if (elements.length <= 1) return 'consume';
    return action.consumeMode === 'any' ? 'consume one of' : 'consume';
  }

  summonOf(action: CardAction): CardSummon | null {
    return action.summon ?? null;
  }

  /** Stat chips for a summon, skipping whatever the card does not print. */
  summonStats(summon: CardSummon): { icon: string; value: string | number }[] {
    const stats: { icon: string; value: string | number }[] = [];
    if (summon.health !== undefined) stats.push({ icon: 'heart', value: summon.health });
    if (summon.attack !== undefined) stats.push({ icon: 'attack', value: summon.attack });
    if (summon.movement !== undefined) stats.push({ icon: 'move', value: summon.movement });
    if (summon.range !== undefined) stats.push({ icon: 'range', value: summon.range });
    return stats;
  }

  /** Resolves a summon's optional image to a servable path. */
  imagePath(image: string): string {
    return `./images/${image}`;
  }

  textOf(action: CardAction): string {
    // Fall back to the raw value so unresolved data is visible rather than blank.
    return action.text ?? String(action.value ?? '');
  }

  /** True when text still holds an unresolved %placeholder%, so it can be flagged. */
  isUnresolved(action: CardAction): boolean {
    return this.isText(action) && this.textOf(action).includes('%');
  }

  iconClassFor(action: CardAction): string | null {
    const type = String(action.type);

    if (type === 'condition') {
      // Condition icons are named after the condition itself.
      return action.value ? String(action.value) : null;
    }
    if (type === 'element') {
      // "ice:air" means either element; icons.scss has .elem-ice-air for that pair.
      const value = String(action.value ?? '').replace(/:/g, '-');
      return value ? `elem-${value}` : null;
    }
    return ACTION_ICON_CLASS[type] ?? null;
  }

  /** The number printed beside the icon, with its sign when the data specifies one. */
  displayValue(action: CardAction): string {
    if (VALUELESS_TYPES.has(String(action.type))) return '';
    if (action.value === undefined || action.value === null || action.value === '') return '';

    const n = Number(action.value);
    if (!Number.isFinite(n)) return String(action.value);

    switch (action.valueType) {
      case 'add':
      case 'plus':
        return `+${n}`;
      case 'subtract':
      case 'minus':
        return `−${n}`;
      default:
        return String(n);
    }
  }

  /**
   * Types with no icon still need to say what they are, or the action would vanish.
   * Covers unknown types from future data.
   */
  fallbackLabel(action: CardAction): string {
    return String(action.type);
  }

  /**
   * The persistent-ability slot track printed on the card. Display only — the app
   * never advances the token, it just shows the slots and their XP.
   */
  slotsOf(action: CardAction): { xp?: number }[] {
    return action.slots ?? [];
  }
}
