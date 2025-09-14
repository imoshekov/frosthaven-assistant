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
    slots = Object.values(ItemSlot);
    inventory: ItemResource = {};
    all: Item[];
    head: Item[];
    body: Item[];
    legs: Item[];
    onehand: Item[];
    twohand: Item[];
    small: Item[];
    RESOURCE_KEYS;

    constructor(private dataLoader: ItemLoaderService, private db: DbService, private notificationService: NotificationService) {
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
        this.printRequirements(item);
    }

    private loadItems(): void {
        this.all = this.dataLoader.getUnlockedItems(this.unlockedItemIds);
        this.RESOURCE_KEYS = this.dataLoader.ALL_RESOURCE_KEYS;
        const slotMap: Record<string, ItemSlot> = {
            head: ItemSlot.Head,
            body: ItemSlot.Body,
            legs: ItemSlot.Legs,
            onehand: ItemSlot.Onehand,
            twohand: ItemSlot.Twohand,
            small: ItemSlot.Small,
        };

        Object.entries(slotMap).forEach(([key, slot]) => {
            this[key] = this.all.filter(item => item?.slot?.toLocaleLowerCase() === slot.toLocaleLowerCase());
        });
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
                // Missing in this.all => treat as locked and list it
                deps.add(id);
                locked.add(id);
                return; // locked deps do not contribute materials
            }

            addResources(it.resources);

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
        // If you're using OnPush, you may need:
        // this.inventory = { ...this.inventory };

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
