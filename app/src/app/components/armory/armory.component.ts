import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { GlobalTelInputDirective } from "../../directives/global-tel-input.directive";
import { ItemLoaderService } from "../../services/item-loader-service";
import { Item, ItemResource, ItemSlot } from "../../types/item-types";
import { DbService } from "../../services/db.service";
import { SingleItemComponent } from "./single-item.component";
import { NotificationService } from "../../services/notification.service";
import { AppContext } from "../../app-context";
import { AddItemComponent } from "./add-item.component";
import { ItemFilterComponent, EFFECT_FILTERS } from "./item-filter.component";

@Component({
    selector: 'app-armory',
    standalone: true,
    imports: [CommonModule, FormsModule, GlobalTelInputDirective, SingleItemComponent, AddItemComponent, ItemFilterComponent],
    templateUrl: './armory.component.html',
    styleUrls: ['./armory.component.scss']
})
export class ArmoryComponent implements OnInit {
    unlockedItemIds: number[];
    slots: string[] = [...Object.values(ItemSlot), 'potions'];
    inventory: ItemResource = {};
    all: Item[];
    head: Item[];
    body: Item[];
    legs: Item[];
    onehand: Item[];
    twohand: Item[];
    small: Item[];
    potions: Item[];
    RESOURCE_KEYS;
    // Track expanded/collapsed state per slot (collapsed by default)
    expanded: Record<string, boolean> = {};
    inventoryFilterActive = false;

    effectFilter: string | null = null;

    private readonly DIRECT_ACTION_TYPES = new Set(['shield', 'heal', 'move', 'damage', 'push', 'pull', 'jump', 'element', 'pierce', 'range', 'attack', 'retaliate']);

    toggleCategory(slot: string): void {
        this.expanded[slot] = !this.expanded[slot];
    }

    isExpanded(slot: string): boolean {
        return !!this.expanded[slot];
    }

    constructor(private itemLoaderService: ItemLoaderService, private db: DbService, private notificationService: NotificationService, public appContext: AppContext) {
    }

    async ngOnInit() {
        await this.loadUnlockedItems();
    }

    private readonly KNOWN_FILTER_KEYS = new Set(
        EFFECT_FILTERS.filter(f => f.key !== 'special').map(f => f.key)
    );

    getSlotItems(itemSlot: string): Item[] {
        let items: Item[] = this[itemSlot] ?? [];
        if (this.effectFilter) {
            if (this.effectFilter === 'special') {
                items = items.filter(item =>
                    !Array.from(this.KNOWN_FILTER_KEYS).some(key => this.itemMatchesEffect(item, key))
                );
            } else {
                items = items.filter(item => this.itemMatchesEffect(item, this.effectFilter!));
            }
        }
        if (this.inventoryFilterActive) {
            items = items.filter(item => this.itemMatchesMaterials(item));
        }
        return items;
    }

    onInventoryChanged(): void {
        this.inventoryFilterActive = this.hasInventoryFilter();
    }

    hasInventoryFilter(): boolean {
        if (!this.RESOURCE_KEYS) return false;
        return (this.RESOURCE_KEYS as string[]).some(k => Number(this.inventory[k]) > 0);
    }

    clearInventory(): void {
        if (!this.RESOURCE_KEYS) return;
        for (const k of this.RESOURCE_KEYS as string[]) {
            this.inventory[k] = 0;
        }
        this.inventoryFilterActive = false;
    }

    /** Returns true if the item's total required resources are all covered by the current inventory.
     *  Stops recursing at any dep not in the unlocked list (locked by the game). */
    private itemMatchesMaterials(item: Item): boolean {
        const total: Partial<ItemResource> = {};
        // this.all only contains unlocked items — anything not found here is game-locked
        const byId = (id: number) => (this.all ?? []).find(i => i.id === id);
        const visited = new Set<number>();

        const collect = (id: number) => {
            if (visited.has(id)) return;
            visited.add(id);
            const it = byId(id);
            if (!it) return; // locked dep — skip, don't count its resources
            if (it.resources) {
                for (const k of Object.keys(it.resources) as (keyof ItemResource)[]) {
                    const v = Number((it.resources as any)[k] ?? 0);
                    if (v > 0) (total as any)[k] = ((total as any)[k] ?? 0) + v;
                }
            }
            if (typeof (it as any).cost === 'number' && (it as any).cost > 0) {
                (total as any)['gold'] = ((total as any)['gold'] ?? 0) + (it as any).cost;
            }
            const deps: number[] = Array.isArray((it as any).requiredItems) ? (it as any).requiredItems
                : Array.isArray((it as any).requires) ? (it as any).requires
                : Array.isArray((it as any).components) ? (it as any).components : [];
            for (const cid of deps.filter((x: any) => typeof x === 'number')) collect(cid);
        };

        collect(item.id);

        const keys = Object.keys(total) as (keyof ItemResource)[];
        if (keys.length === 0) return false;
        return keys.every(k => Number((this.inventory as any)[k] ?? 0) >= Number((total as any)[k]));
    }

    onFilterChanged(effect: string | null): void {
        this.effectFilter = effect;
    }

    private itemMatchesEffect(item: Item, effect: string): boolean {
        // Check DERIVED_EFFECTS map directly (covers items whose descriptions are in rawdata.js)
        const derivedTags = this.itemLoaderService.getEffectTags(item);
        if (derivedTags.includes(effect)) return true;
        if (effect === 'heal' && derivedTags.includes('regenerate')) return true;

        const matchesEntry = (entry: any): boolean => {
            if (!entry) return false;
            if (this.DIRECT_ACTION_TYPES.has(effect) && entry.type === effect) return true;
            if (effect === 'heal' && entry.type === 'condition' && entry.value === 'regenerate') return true;
            if (!this.DIRECT_ACTION_TYPES.has(effect) && entry.type === 'condition' && entry.value === effect) return true;
            if (entry.subActions && checkList(entry.subActions)) return true;
            return false;
        };

        const checkList = (list: any[]): boolean =>
            !!list?.some(entry => matchesEntry(entry));

        const allEntries = [
            ...(item.actions ?? []),
            ...(Array.isArray(item.actionsBack) ? item.actionsBack : []),
            ...(Array.isArray((item as any).effects) ? (item as any).effects : []),
        ];
        return checkList(allEntries);
    }

    private async loadUnlockedItems(): Promise<void> {
        const craftableItemRows = await this.db.getUnlockedItems();
        this.unlockedItemIds = craftableItemRows.map(item => item.id);
        this.loadItems()
    }

    async onItemAdded() {
        await this.loadUnlockedItems();
    }

    private loadItems(): void {
        this.all = this.itemLoaderService.getUnlockedItems(this.unlockedItemIds);
        this.RESOURCE_KEYS = this.itemLoaderService.ALL_RESOURCE_KEYS;

        const slotEq = (item: Item, slot: ItemSlot) => item?.slot?.toLocaleLowerCase() === slot.toLocaleLowerCase();

        // Helper to filter items by slot
        const filterBySlot = (slot: ItemSlot) => this.all.filter(item => slotEq(item, slot));

        this.head = filterBySlot(ItemSlot.Head);
        this.body = filterBySlot(ItemSlot.Body);
        this.legs = filterBySlot(ItemSlot.Legs);
        this.onehand = filterBySlot(ItemSlot.Onehand);
        this.twohand = filterBySlot(ItemSlot.Twohand);

        const smallItems = filterBySlot(ItemSlot.Small);
        // Potions are small items that require the alchemist building
        this.potions = smallItems.filter(i => this.itemLoaderService.isPotion(i));
        // The rest of small items (non-potions)
        this.small = smallItems.filter(i => !this.itemLoaderService.isPotion(i));

        // Default: expand all categories so user sees items immediately
        for (const s of this.slots) {
            this.expanded[s] = true;
        }
    }

}
