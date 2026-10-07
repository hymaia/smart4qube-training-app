import type { Order } from "../../../shared/types";

/** Tells whether a participant's node currently answers (we always answer for ourselves). */
export type Reachability = (participant: string) => boolean;

/**
 * Participants who still have to confirm. Every known participant counts,
 * except one who left without ordering anything (empty cart and offline).
 */
export function closeBlockers(orders: Order[], isReachable: Reachability): string[] {
  return orders
    .filter((o) => o.status !== "CONFIRMED")
    .filter((o) => o.lines.length > 0 || isReachable(o.participant))
    .map((o) => o.participant)
    .sort();
}

/** Null when the table can be closed, otherwise the reason why not. */
export function closeRefusal(orders: Order[], isReachable: Reachability): string | null {
  if (!orders.some((o) => o.status === "CONFIRMED" && o.lines.length > 0)) return "Nobody has confirmed an order yet";
  const blockers = closeBlockers(orders, isReachable);
  if (blockers.length > 0) return `Waiting for ${blockers.join(", ")} to confirm`;
  return null;
}
