import type { Menu } from "../../../shared/menu";
import type { Order } from "../../../shared/types";
import { findItem } from "../menu/loader";

export interface TallyEntry {
  itemId: string;
  name: string;
  nameZh: string | null;
  options: string;
  quantity: number;
}

export interface GroupSheetData {
  orders: Order[];
  tally: TallyEntry[];
  /** allergen -> participants whose dishes contain it */
  allergens: { allergen: string; participants: string[] }[];
  subtotalCents: number;
  totalPaidCents: number;
}

export function describeOptions(options: Record<string, string>): string {
  return Object.entries(options)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
}

/** Everything printed on the group sheet, computed from the confirmed orders. */
export function buildGroupSheet(allOrders: Order[], menu: Menu): GroupSheetData {
  const orders = allOrders
    .filter((o) => o.status === "CONFIRMED" && o.lines.length > 0)
    .sort((a, b) => a.participant.localeCompare(b.participant));

  return {
    orders,
    tally: kitchenTally(orders, menu),
    allergens: allergenSummary(orders, menu),
    subtotalCents: orders.reduce((sum, o) => sum + o.pricing.subtotalCents, 0),
    totalPaidCents: orders.reduce((sum, o) => sum + (o.payment?.amountCents ?? 0), 0),
  };
}

/** Quantity per dish + options, in menu order: what the kitchen has to cook. */
export function kitchenTally(orders: Order[], menu: Menu): TallyEntry[] {
  const menuOrder = menu.categories.flatMap((c) => c.items.map((i) => i.id));
  const entries = new Map<string, TallyEntry>();
  for (const line of orders.flatMap((o) => o.lines)) {
    const options = describeOptions(line.options);
    const key = `${line.itemId}|${options}`;
    const entry = entries.get(key) ?? {
      itemId: line.itemId,
      name: line.name,
      nameZh: findItem(menu, line.itemId)?.nameZh ?? null,
      options,
      quantity: 0,
    };
    entry.quantity += line.quantity;
    entries.set(key, entry);
  }
  return [...entries.values()].sort(
    (a, b) => menuOrder.indexOf(a.itemId) - menuOrder.indexOf(b.itemId) || a.options.localeCompare(b.options),
  );
}

export function allergenSummary(orders: Order[], menu: Menu): GroupSheetData["allergens"] {
  const byAllergen = new Map<string, Set<string>>();
  for (const order of orders) {
    for (const line of order.lines) {
      for (const allergen of findItem(menu, line.itemId)?.allergens ?? []) {
        if (!byAllergen.has(allergen)) byAllergen.set(allergen, new Set());
        byAllergen.get(allergen)!.add(order.participant);
      }
    }
  }
  return [...byAllergen.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([allergen, participants]) => ({ allergen, participants: [...participants].sort() }));
}
