import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { GlobalTelInputDirective } from "../../directives/global-tel-input.directive";
import { ItemLoaderService } from "../../services/item-loader-service";
import { Item, ItemResource, ItemSlot } from "../../types/item-types";
import { DbService } from "../../services/db.service";
import { SingleItemComponent } from "./single-item.component";
import { NotificationService } from "../../services/notification.service";

@Component({
    selector: 'app-armory',
    standalone: true,
    imports: [CommonModule, FormsModule, GlobalTelInputDirective, SingleItemComponent],
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
    selectedItem: Item | null = null;
    // Track expanded/collapsed state per slot (collapsed by default)
    expanded: Record<string, boolean> = {};

    toggleCategory(slot: string): void {
        this.expanded[slot] = !this.expanded[slot];
    }

    isExpanded(slot: string): boolean {
        return !!this.expanded[slot];
    }

    constructor(private itemLoaderService: ItemLoaderService, private db: DbService, private notificationService: NotificationService) {
    }

    async ngOnInit() {
        await this.loadUnlockedItems();
    }

    getSlotItems(itemSlot: string): Item[] {
        return this[itemSlot];
    }

    private async loadUnlockedItems(): Promise<void> {
        const craftableItemRows = await this.db.getUnlockedItems();
        this.unlockedItemIds = craftableItemRows.map(item => item.id);
        this.loadItems()
    }

    craftItem(item: Item) {
        this.selectedItem = item;
        this.printRequirements(item);
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

    private printRequirements(item: Item) {
        console.log('[armory] requirements for', item.id);

        const byId = (id: number) => (this.all ?? []).find(i => i.id === id);
        const getDeps = (it: any): number[] => {
            const raw =
                it?.requiredItems ??
                it?.requires ??
                it?.components ??
                it?.dependsOn ??
                [];
            return Array.isArray(raw) ? raw.filter((x: any) => typeof x === 'number') : [];
        };

        const visited = new Set<number>();
        const deps = new Set<number>();         // dedupe printed deps
        const locked = new Set<number>();       // track locked for messaging
        const total: Partial<ItemResource> = {};

        const addResources = (res?: ItemResource) => {
            if (!res) return;

            // Sum resource counts
            for (const k of Object.keys(res) as (keyof ItemResource)[]) {
            const v = Number(res[k] ?? 0);
            if (v > 0) total[k] = (total[k] ?? 0) + v;
            }
        };

        const collect = (id: number) => {
            if (visited.has(id)) return;
            visited.add(id);

            const it = byId(id);
            if (!it) {
                deps.add(id);
                locked.add(id);
                return; // locked deps do not contribute materials
            }

            // merge resources with cost (if > 0) and pass to addResources
            const combined: ItemResource = { ...(it.resources ?? {}) } as ItemResource;
            if (typeof it.cost === 'number' && it.cost > 0) {
                combined.gold = (combined.gold ?? 0) + it.cost;
            }
            addResources(combined);

            const childIds = getDeps(it);
            for (const cid of childIds) {
                deps.add(cid);
                collect(cid);
            }
        };

        collect(item.id);

        // 1) Push totals into your inputs bound via [(ngModel)]="inventory[type]"
        for (const key of this.RESOURCE_KEYS as (keyof ItemResource)[]) {
            this.inventory[key] = Number(total[key] ?? 0);
        }

        // 2) Console output
        const nameOf = (id: number) => byId(id)?.name ?? `${id}`;
        console.log('--- REQUIREMENTS ---');
        console.log(`Item: ${nameOf(item.id)}`);

        let anyMat = false;
        console.log('Materials (incl. dependencies):');
        for (const key of this.RESOURCE_KEYS as (keyof ItemResource)[]) {
            const v = this.inventory[key] ?? 0;
            if (v > 0) {
                anyMat = true;
                console.log(`  - ${key}: ${v}`);
            }
        }
        if (!anyMat) console.log('  (none)');

        if (deps.size > 0) {
            console.log('Dependent items:');
            for (const id of deps) {
                const status = locked.has(id) ? '[LOCKED]' : '[Unlocked]';
                console.log(`  - ${nameOf(id)} (id: ${id}) ${status}`);
            }
        } else {
            console.log('Dependent items: none');
        }
        console.log('--------------------');

        // 3) Notify if any locked dependency exists
        if (locked.size > 0) {
            const lockedList = Array.from(locked)
                .map(id => `${nameOf(id)}`)
                .join(', ');
            const rootName = nameOf(item.id);
            const msg = `Cannot craft "${rootName}" — ${lockedList} locked.`;
            this.notificationService.emitErrorMessage(msg);
        }
        else {
            this.notificationService.emitInfoMessage('required materials loaded');
        }
    }
}
