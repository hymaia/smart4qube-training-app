import type { Order, TableClosure } from "../../../shared/types";

export type MergeOutcome = "inserted" | "updated" | "stale" | "wrong-table";

/**
 * Versioned last-writer-wins, per order owner: an order replaces the known
 * copy only if its version is strictly higher. Mutates `orders`.
 */
export function mergeOrder(orders: Record<string, Order>, incoming: Order, table: string): MergeOutcome {
  if (incoming.table !== table) return "wrong-table";
  const current = orders[incoming.participant];
  if (current && incoming.version <= current.version) return "stale";
  orders[incoming.participant] = incoming;
  return current ? "updated" : "inserted";
}

export function mergeOrders(orders: Record<string, Order>, incoming: Order[], table: string): MergeOutcome[] {
  return incoming.map((order) => mergeOrder(orders, order, table));
}

/**
 * Two peers may close concurrently. Every node keeps the earliest closure
 * (ties broken by name) so all nodes converge on the same one.
 */
export function pickClosure(current: TableClosure | null, incoming: TableClosure | null): TableClosure | null {
  if (!current) return incoming;
  if (!incoming) return current;
  if (incoming.closedAt !== current.closedAt) return incoming.closedAt < current.closedAt ? incoming : current;
  return incoming.closedBy < current.closedBy ? incoming : current;
}
