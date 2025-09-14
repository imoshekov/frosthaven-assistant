import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Item, ItemResource } from '../../types/item-types';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-single-potion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './single-potion.component.html',
  styleUrls: ['./single-potion.component.scss']
})
export class SinglePotionComponent {
  @Input() potion!: Item;
  @Input() unlockedPotionIds!: number[];
  @Output() brewPotion = new EventEmitter<ItemResource>();

  constructor() { }

  getPotionSrc(potion: Item): string {
    let name = potion.name.toLocaleLowerCase();
    name = name.replaceAll(' ', '-');
    let id = potion.id < 100 ? '0' + potion.id : potion.id;
    return this.isPotionLocked() ? `./images/fh/items/item-back-fh.png` : `./images/potions/fh-${id}-${name}.jpeg`;
  }

  isPotionLocked(): boolean {
    return this.unlockedPotionIds?.indexOf(this.potion.id) < 0;
  }

  getPotionResources(): string[] {
    return Object.keys(this.potion.resources)
  }

  brew(): void {
    this.brewPotion.emit(this.potion.resources);
  }
}