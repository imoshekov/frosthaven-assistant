import { Injectable } from "@angular/core";
import { Item, ItemResource } from "../types/item-types";

type NumLike = number | string | null | undefined;

// Only ChatGPT knows what is this
@Injectable({ providedIn: 'root' })
export class AlchemyHelperService {
    HERB_KEYS: (keyof ItemResource)[] = ["arrowvine", "axenut", "corpsecap", "flamefruit", "rockroot", "snowthistle"];;

    selectMaxDistinctCombo(items: Item[], inventory: ItemResource): Item[] {
    const invStart = this.cloneInv(inventory);

    // Heuristic: cheaper first
    const costScore = (it: Item) => {
      const r = it.resources ?? {};
      const concrete = Object.values(r).reduce((s, v) => s + Math.max(0, this.toNum(v)), 0);
      return concrete + this.genericHerbNeed(it);
    };
    const sorted = [...items].sort((a, b) => costScore(a) - costScore(b));

    return this.dfs(0, sorted, invStart, [], []);
  }

  /** Depth-first search that RETURNS the best picked set */
  private dfs(i: number, sorted: Item[], inv: ItemResource, picked: Item[], best: Item[]): Item[] {
    // prune if remaining can't beat current best
    if (picked.length + (sorted.length - i) <= best.length) return best;

    if (i === sorted.length) {
      return picked.length > best.length ? picked : best;
    }

    let bestLocal = best;

    // try take this item
    const item = sorted[i];
    if (this.canAfford(item, inv)) {
      const invNext = this.cloneInv(inv);
      this.pay(item, invNext);
      bestLocal = this.dfs(i + 1, sorted, invNext, [...picked, item], bestLocal);
    }

    // try skip this item
    bestLocal = this.dfs(i + 1, sorted, inv, picked, bestLocal);

    return bestLocal;
  }

  private toNum = (v: NumLike): number => {
    const n = typeof v === "number" ? v : Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  };

  private cloneInv(inv: ItemResource): ItemResource {
    const out: ItemResource = {};
    for (const k in inv) out[k as keyof ItemResource] = this.toNum(inv[k as keyof ItemResource]);
    return out;
  }

  private herbPool(inv: ItemResource): number {
    return this.HERB_KEYS.reduce((s, k) => s + this.toNum(inv[k]), 0);
  }

  private genericHerbNeed(item: Item): number {
    return (item.resourcesAny ?? []).reduce((s, e) => s + this.toNum((e as any).herb_resources), 0);
  }

  /** Check if inventory can pay for this item once (without mutating) */
  private canAfford(item: Item, inv: ItemResource): boolean {
    const req = item.resources ?? {};

    // Non-herb concrete checks
    for (const k in req) {
      const key = k as keyof ItemResource;
      const need = this.toNum(req[key]);
      if (need <= 0) continue;
      const isHerb = this.HERB_KEYS.includes(key);
      if (!isHerb && this.toNum(inv[key]) < need) return false;
    }

    // Herb concrete checks (per type)
    let concreteHerbNeed = 0;
    for (const hk of this.HERB_KEYS) {
      const need = Math.max(0, this.toNum(req[hk]));
      if (need > 0 && this.toNum(inv[hk]) < need) return false;
      concreteHerbNeed += need;
    }

    // Generic herb need vs pool
    const genNeed = this.genericHerbNeed(item);
    if (genNeed > 0) {
      const pool = this.herbPool(inv);
      if (pool < concreteHerbNeed + genNeed) return false;
    }
    return true;
  }

  /** Deduct the cost of one item from inventory (mutates inv) */
  private pay(item: Item, inv: ItemResource): void {
    const req = item.resources ?? {};

    // Deduct concrete non-herbs
    for (const k in req) {
      const key = k as keyof ItemResource;
      const need = Math.max(0, this.toNum(req[key]));
      if (need > 0 && !this.HERB_KEYS.includes(key)) {
        inv[key] = this.toNum(inv[key]) - need;
      }
    }

    // Deduct concrete herbs
    for (const hk of this.HERB_KEYS) {
      const need = Math.max(0, this.toNum(req[hk]));
      if (need > 0) inv[hk] = this.toNum(inv[hk]) - need;
    }

    // Deduct generic herbs from largest stocks first
    let gen = this.genericHerbNeed(item);
    if (gen > 0) {
      const order = [...this.HERB_KEYS].sort((a, b) => this.toNum(inv[b]) - this.toNum(inv[a]));
      for (const hk of order) {
        if (gen <= 0) break;
        const have = this.toNum(inv[hk]);
        if (have <= 0) continue;
        const take = Math.min(have, gen);
        inv[hk] = have - take;
        gen -= take;
      }
    }
  }
}