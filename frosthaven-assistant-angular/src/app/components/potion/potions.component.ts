import { Component, OnInit } from '@angular/core';
import { ItemLoaderService } from '../../services/item-loader-service';
import { Item, ItemResource } from '../../types/item-types';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SinglePotionComponent } from './single-potion.component';

@Component({
  selector: 'app-potions',
  standalone: true,
  imports: [CommonModule, FormsModule, SinglePotionComponent],
  templateUrl: './potions.component.html',
  styleUrls: ['./potions.component.scss']
})
export class PotionsComponent implements OnInit {
  potions: Item[];
  twoHerbsPotions: Item[] = [];
  threeHerbsPotions: Item[] = [];
  wierdPotions: Item[] = [];
  inventory: ItemResource = {};
  RESOURCE_KEYS = ["arrowvine", "axenut", "corpsecap", "flamefruit", "rockroot", "snowthistle"];

  constructor(private dataLoader: ItemLoaderService
  ) {
    this.filterCraftable();
  }
  async ngOnInit() {
    await this.dataLoader.loadUnlockedPotions();
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