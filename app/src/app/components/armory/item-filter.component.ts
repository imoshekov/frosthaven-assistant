import { Component, ElementRef, EventEmitter, HostListener, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface EffectFilter {
    key: string;
    label: string;
}

export const COMBAT_KEYS   = new Set(['advantage', 'attackmodifier', 'attack', 'damage', 'disadvantage', 'pierce', 'range', 'retaliate', 'shield']);
export const BUFF_KEYS     = new Set(['bless', 'invisible', 'strengthen', 'ward']);
export const DEBUFF_KEYS   = new Set(['bane', 'brittle', 'curse', 'disarm', 'immobilize', 'impair', 'muddle', 'poison', 'stun', 'wound']);
export const MOVEMENT_KEYS = new Set(['move', 'jump', 'pull', 'push']);

export const EFFECT_FILTERS: EffectFilter[] = [
    { key: 'advantage',      label: 'Advantage' },
    { key: 'attackmodifier', label: 'Atk Modifier' },
    { key: 'attack',         label: 'Attack' },
    { key: 'bane',           label: 'Bane' },
    { key: 'bless',          label: 'Bless' },
    { key: 'brittle',        label: 'Brittle' },
    { key: 'card',           label: 'Cards' },
    { key: 'curse',          label: 'Curse' },
    { key: 'damage',         label: 'Damage' },
    { key: 'disadvantage',   label: 'Disadvantage' },
    { key: 'disarm',         label: 'Disarm' },
    { key: 'element',        label: 'Element' },
    { key: 'heal',           label: 'Heal' },
    { key: 'immobilize',     label: 'Immobilize' },
    { key: 'impair',         label: 'Impair' },
    { key: 'invisible',      label: 'Invisible' },
    { key: 'jump',           label: 'Jump' },
    { key: 'move',           label: 'Move' },
    { key: 'muddle',         label: 'Muddle' },
    { key: 'pierce',         label: 'Pierce' },
    { key: 'poison',         label: 'Poison' },
    { key: 'pull',           label: 'Pull' },
    { key: 'push',           label: 'Push' },
    { key: 'range',          label: 'Range' },
    { key: 'retaliate',      label: 'Retaliate' },
    { key: 'shield',         label: 'Shield' },
    { key: 'strengthen',     label: 'Strengthen' },
    { key: 'stun',           label: 'Stun' },
    { key: 'ward',           label: 'Ward' },
    { key: 'wound',          label: 'Wound' },
    { key: 'special',        label: 'Special' },
];

@Component({
    selector: 'app-item-filter',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './item-filter.component.html',
    styleUrls: ['./item-filter.component.scss'],
})
export class ItemFilterComponent {
    readonly combatFilters    = EFFECT_FILTERS.filter(f => COMBAT_KEYS.has(f.key));
    readonly buffFilters      = EFFECT_FILTERS.filter(f => BUFF_KEYS.has(f.key));
    readonly debuffFilters    = EFFECT_FILTERS.filter(f => DEBUFF_KEYS.has(f.key));
    readonly movementFilters  = EFFECT_FILTERS.filter(f => MOVEMENT_KEYS.has(f.key));
    readonly remainingFilters = EFFECT_FILTERS.filter(f =>
        !COMBAT_KEYS.has(f.key) && !BUFF_KEYS.has(f.key) && !DEBUFF_KEYS.has(f.key) && !MOVEMENT_KEYS.has(f.key)
    );

    activeFilter: string | null = null;
    combatOpen   = false;
    buffOpen     = false;
    debuffOpen   = false;
    movementOpen = false;

    @Output() filterChanged = new EventEmitter<string | null>();

    constructor(private elRef: ElementRef) {}

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (!this.elRef.nativeElement.contains(event.target)) {
            this.combatOpen = this.buffOpen = this.debuffOpen = this.movementOpen = false;
        }
    }

    private closeAll(): void {
        this.combatOpen = this.buffOpen = this.debuffOpen = this.movementOpen = false;
    }

    toggleDropdown(which: 'combat' | 'buff' | 'debuff' | 'movement'): void {
        const wasOpen = which === 'combat'   ? this.combatOpen
                      : which === 'buff'     ? this.buffOpen
                      : which === 'debuff'   ? this.debuffOpen
                      : this.movementOpen;
        this.closeAll();
        if (!wasOpen) {
            if (which === 'combat')   this.combatOpen   = true;
            if (which === 'buff')     this.buffOpen     = true;
            if (which === 'debuff')   this.debuffOpen   = true;
            if (which === 'movement') this.movementOpen = true;
        }
    }

    get isCombatActive():   boolean { return this.activeFilter !== null && COMBAT_KEYS.has(this.activeFilter); }
    get isBuffActive():     boolean { return this.activeFilter !== null && BUFF_KEYS.has(this.activeFilter); }
    get isDebuffActive():   boolean { return this.activeFilter !== null && DEBUFF_KEYS.has(this.activeFilter); }
    get isMovementActive(): boolean { return this.activeFilter !== null && MOVEMENT_KEYS.has(this.activeFilter); }

    toggle(key: string): void {
        this.activeFilter = this.activeFilter === key ? null : key;
        this.filterChanged.emit(this.activeFilter);
        this.closeAll();
    }

    clear(): void {
        this.activeFilter = null;
        this.filterChanged.emit(null);
    }
}
