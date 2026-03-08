import { Component, Input } from '@angular/core';
import { Item, ItemResource } from '../../types/item-types';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ItemLoaderService } from '../../services/item-loader-service';

export interface BubbleRequirements {
  resources: { key: string; value: number }[];
  locked: boolean;
}

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

  bubbleOpen = false;

  constructor(public itemLoaderService: ItemLoaderService) {}

  getItemSrc(item: Item): string {
    let name = item.name.toLocaleLowerCase().replaceAll(' ', '-');
    let id = item.id.toString().padStart(3, '00');
    return this.isItemLocked() ? `./images/fh/items/item-back-fh.png` : `./images/items/fh-${id}-${name}.jpeg`;
  }

  isItemLocked(): boolean {
    return this.unlockedItemIds?.indexOf(this.item.id) < 0;
  }

  toggleBubble(): void {
    this.bubbleOpen = !this.bubbleOpen;
  }

  getBubbleRequirements(): BubbleRequirements {
    // Only items in unlockedItemIds exist in our DB — anything else is game-locked
    const byId = (id: number) => this.itemLoaderService.getUnlockedItems(this.unlockedItemIds).find((i: Item) => i.id === id);

    const total: Partial<ItemResource> = {};
    const lockedDepFound = { value: false };
    const visited = new Set<number>();

    const collect = (id: number, isRoot = false) => {
      if (visited.has(id)) return;
      visited.add(id);
      const it = byId(id);
      if (!it) {
        // Not in unlocked list — locked by the game, stop recursing
        if (!isRoot) lockedDepFound.value = true;
        return;
      }
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
      for (const cid of deps.filter((x: any) => typeof x === 'number')) {
        collect(cid);
      }
    };

    collect(this.item.id, true);

    const resources = Object.entries(total)
      .filter(([, v]) => Number(v) > 0)
      .map(([key, value]) => ({ key, value: Number(value) }));

    return { resources, locked: lockedDepFound.value };
  }
}
