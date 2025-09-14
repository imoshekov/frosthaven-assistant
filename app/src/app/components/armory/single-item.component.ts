import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Item, ItemResource } from '../../types/item-types';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-single-item',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './single-item.component.html',
  styleUrls: ['./single-item.component.scss']
})
export class SingleItemComponent {
  @Input() item!: Item;
  @Input() unlockedItemIds!: number[];
  @Output() craftItem = new EventEmitter<Item>();

  constructor() { }

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
    return Object.keys(this.item.resources)
  }

  craft(): void {
    this.craftItem.emit(this.item);
  }
}