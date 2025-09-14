import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Item, ItemResource } from '../../types/item-types';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataLoaderService } from '../../services/data-loader.service';
import { ItemLoaderService } from '../../services/item-loader-service';

@Component({
  selector: 'app-single-item',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './single-item.component.html',
  styleUrls: ['./single-item.component.scss'],
  host: { '(click)': '$event.stopPropagation()' }
})
export class SingleItemComponent {
  @Input() item!: Item;
  @Input() unlockedItemIds!: number[];
  @Input() toggled!: boolean;
  @Output() craftItem = new EventEmitter<Item>();
  areRequiredItemsToggled = false;

  constructor(public itemLoaderService: ItemLoaderService) { }

  getItemSrc(item: Item): string {
    let name = item.name.toLocaleLowerCase();
    name = name.replaceAll(' ', '-');
    let id = item.id.toString().padStart(3, '00');
    return this.isItemLocked() ? `./images/fh/items/item-back-fh.png` : `./images/items/fh-${id}-${name}.jpeg`;
  }

  isItemLocked(): boolean {
    return this.unlockedItemIds?.indexOf(this.item.id) < 0;
  }

  getItemResources(): string[] {
    return this.item.resources ? Object.keys(this.item.resources) : undefined;
  }

  craft(item?: Item): void {
    this.areRequiredItemsToggled = !this.areRequiredItemsToggled;
    this.craftItem.emit(item || this.item);
  }

  hasRequiredItems(): boolean {
    return this.item.requiredItems && this.item.requiredItems.length > 0;
  }

  getRequiredItems(): Item[] {
    return this.item.requiredItems?.length > 0 ? this.itemLoaderService.getUnlockedItems(this.item.requiredItems) : [];
  }
}