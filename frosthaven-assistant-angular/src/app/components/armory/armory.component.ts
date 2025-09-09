import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { GlobalTelInputDirective } from "../../directives/global-tel-input.directive";
import { ItemLoaderService } from "../../services/item-loader-service";
import { Item, ItemResource, ItemSlot } from "../../types/item-types";
import { DbService } from "../../services/db.service";
import { SingleItemComponent } from "./single-item.component";

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
    head: Item[];
    body: Item[];
    legs: Item[];
    onehand: Item[];
    twohand: Item[];
    small: Item[];
    RESOURCE_KEYS;

    constructor(private dataLoader: ItemLoaderService, private db: DbService) {
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

    craftItem(resources: ItemResource) { }

    private loadItems(): void {
        const items = this.dataLoader.getUnlockedItems(this.unlockedItemIds);
        console.log(items);
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
            this[key] = items.filter(item => item?.slot?.toLocaleLowerCase() === slot.toLocaleLowerCase());
        });
    }
}
