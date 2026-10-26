/**
 * Gacha roll computation — pure, dependency-free.
 *
 * Kept separate from `useGameState` so it can be unit tested without dragging in
 * React or any of the module's extensionless imports (which Node's ESM loader
 * cannot resolve outside the bundler).
 *
 * Two behaviours here exist because of concrete bugs:
 *
 * 1. The result list is returned, not collected inside a state updater. The old
 *    code wrote into a local array from inside `setState` and read it straight
 *    after, which silently produced empty results whenever React deferred the
 *    update.
 * 2. Charging happens only for pulls that actually produce an item, and the
 *    returned `spent` is the single source of truth for the coin deduction.
 *    Previously the subtraction lived after the "does this rarity resolve?"
 *    checks, so a pull that hit an unconfigured rarity was counted but free.
 */

export interface GachaPullResult {
  item: string;
  rarity: string;
  poolType: 'gacha' | 'ichiban';
  color?: string;
}

interface GachaRarity {
  id: string;
  name: string;
  color: string;
  weight: number;
  rarityValue?: number;
}

interface GachaItem {
  rarity: string;
  name: string;
  count?: number;
  initialCount?: number;
  color?: string;
  rarityValue?: number;
}

/** Structural subset of the app's GachaPool; avoids importing app types. */
export interface GachaPoolLike {
  id: string;
  name: string;
  type: 'gacha' | 'ichiban';
  cost: number;
  weights?: Record<string, number>;
  rarities?: GachaRarity[];
  items: GachaItem[];
}

export interface GachaPullOutcome {
  spent: number;
  newPool: GachaPoolLike;
  results: GachaPullResult[];
}

export function computeGachaPull(
  pool: GachaPoolLike,
  amount: number,
  coins: number
): GachaPullOutcome | null {
  if (!pool || amount < 1) return null;
  if (coins < pool.cost * amount) return null;

  const newPool: GachaPoolLike = {
    ...pool,
    items: pool.items.map((i) => ({ ...i })),
  };
  const results: GachaPullResult[] = [];
  let spent = 0;

  for (let pull = 0; pull < amount; pull++) {
    if (newPool.type === 'gacha') {
      const rarities: GachaRarity[] = newPool.rarities || [
        { id: 'SSR', name: 'SSR', color: 'amber', weight: newPool.weights?.SSR || 5 },
        { id: 'SR', name: 'SR', color: 'purple', weight: newPool.weights?.SR || 15 },
        { id: 'R', name: 'R', color: 'blue', weight: newPool.weights?.R || 80 },
      ];
      const totalWeight = rarities.reduce((sum, r) => sum + r.weight, 0);
      if (totalWeight <= 0) break;

      const rand = Math.random() * totalWeight;
      let cursor = 0;
      let picked = rarities[0];
      for (const r of rarities) {
        cursor += r.weight;
        if (rand < cursor) {
          picked = r;
          break;
        }
      }

      // Every entry of this rarity is eligible; a previous find() meant only the
      // first entry per rarity could ever be drawn.
      const entries = newPool.items.filter((i) => i.rarity === picked.id);
      if (entries.length === 0) continue;

      const entry = entries[Math.floor(Math.random() * entries.length)];
      const names = entry.name.split('/').map((s) => s.trim()).filter((s) => s.length > 0);
      if (names.length === 0) continue;

      spent += pool.cost;
      results.push({
        item: names[Math.floor(Math.random() * names.length)],
        rarity: picked.name,
        poolType: pool.type,
        color: picked.color,
      });
    } else {
      const available = newPool.items.filter((i) => (i.count || 0) > 0 && i.rarity !== 'LastOne');
      const totalAvailable = available.reduce((acc, i) => acc + (i.count || 0), 0);
      if (totalAvailable === 0) break;

      const idx = Math.floor(Math.random() * totalAvailable);
      let cursor = 0;
      let entry = available[0];
      for (const it of available) {
        cursor += it.count || 0;
        if (idx < cursor) {
          entry = it;
          break;
        }
      }

      spent += pool.cost;

      newPool.items = newPool.items.map((i) =>
        i.rarity === entry.rarity && i.name === entry.name
          ? { ...i, count: (i.count || 0) - 1 }
          : i
      );

      const subNames = entry.name.split('/').map((s) => s.trim()).filter((s) => s.length > 0);
      const finalName =
        subNames.length > 0 ? subNames[Math.floor(Math.random() * subNames.length)] : entry.name;
      results.push({
        item: finalName,
        rarity: entry.rarity,
        poolType: pool.type,
        color: entry.color,
      });

      // Award the "last one" prize once the box is empty.
      const remaining = newPool.items
        .filter((i) => i.rarity !== 'LastOne')
        .reduce((acc, i) => acc + (i.count || 0), 0);
      if (remaining === 0) {
        const lastOne = newPool.items.find((i) => i.rarity === 'LastOne');
        if (lastOne && (lastOne.count || 0) > 0) {
          const lastNames = lastOne.name.split('/').map((s) => s.trim()).filter((s) => s.length > 0);
          const lastColor = lastOne.color || 'rose';
          if (lastNames.length > 1) {
            lastNames.forEach((sub) =>
              results.push({ item: sub, rarity: 'LastOne', poolType: pool.type, color: lastColor })
            );
          } else {
            results.push({
              item: lastOne.name,
              rarity: 'LastOne',
              poolType: pool.type,
              color: lastColor,
            });
          }
          newPool.items = newPool.items.map((i) =>
            i.rarity === 'LastOne' ? { ...i, count: 0 } : i
          );
        }
      }
    }
  }

  return { spent, newPool, results };
}
