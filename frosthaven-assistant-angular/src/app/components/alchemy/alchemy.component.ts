import { Component, OnInit } from '@angular/core';
import { ItemLoaderService } from '../../services/item-loader-service';
import { Item, ItemResource } from '../../types/item-types';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SinglePotionComponent } from './single-potion.component';
import { GlobalTelInputDirective } from '../../directives/global-tel-input.directive';
import { DbService } from '../../services/db.service';

@Component({
  selector: 'app-alchemy',
  standalone: true,
  imports: [CommonModule, FormsModule, SinglePotionComponent, GlobalTelInputDirective],
  templateUrl: './alchemy.component.html',
  styleUrls: ['./alchemy.component.scss']
})
export class AlchemyComponent implements OnInit {
  unlockedPotionIds: number[];
  potions: Item[];
  twoHerbsPotions: Item[] = [];
  threeHerbsPotions: Item[] = [];
  wierdPotions: Item[] = [];
  inventory: ItemResource = {};
  RESOURCE_KEYS;

  constructor(private dataLoader: ItemLoaderService, private db: DbService) {
    this.filterCraftable();
    this.RESOURCE_KEYS = this.dataLoader.HERB_RESOURCE_KEYS;
  }

  async ngOnInit() {
    await this.loadUnlockedPotions();
  }

  splitByHerbsCount() {
    this.twoHerbsPotions = [];
    this.threeHerbsPotions = [];
    this.wierdPotions = [];
    this.potions.forEach(potion => {
      const herbsCount = Object.keys(potion.resources).length;
      if (herbsCount === 2)
        this.twoHerbsPotions.push(potion)
      else if (herbsCount === 3)
        this.threeHerbsPotions.push(potion)
      else
        this.wierdPotions.push(potion);
    });
  }

  filterCraftable() {
    this.potions = this.dataLoader.getPotionsItems().filter(potion => this.canCraft(potion.resources));
    this.splitByHerbsCount();
  }

  clear() {
    this.inventory = {};
    this.filterCraftable()
  }

  brewPotion(resources: ItemResource) {
    for (const key in resources) {
      const resource = resources[key as keyof ItemResource] ?? 0;
      const available = this.inventory[key as keyof ItemResource] ?? 0;

      this.inventory[key as keyof ItemResource] = available - resource;
    }
    this.filterCraftable()
  }

  private async loadUnlockedPotions(): Promise<void> {
    const potions = await this.db.getUnlockedPotions();
    this.unlockedPotionIds = potions.map(item => item.id);
  }

  private canCraft(item: ItemResource): boolean {
    if (this.isInventoryEmpty()) {
      return true;
    }

    for (const key in item) {
      const required = item[key as keyof ItemResource] ?? 0;
      const available = this.inventory[key as keyof ItemResource] ?? 0;

      if (available < required) {
        return false;
      }
    }
    return true;
  }

  private isInventoryEmpty(): boolean {
    for (const key in this.inventory) {
      const available = this.inventory[key as keyof ItemResource] ?? 0;
      if (available != 0) {
        return false;
      }
    }
    return true;
  }
}