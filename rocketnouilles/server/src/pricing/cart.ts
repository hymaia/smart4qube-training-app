import type { Menu } from "../../../shared/menu";
import type { OrderLine } from "../../../shared/types";
import { findItem } from "../menu/loader";

export interface LineRequest {
  itemId: string;
  quantity: number;
  options?: Record<string, string>;
}

export const MAX_QUANTITY_PER_LINE = 20;

export class CartError extends Error {}

export function lineTotalCents(line: OrderLine): number {
  return line.unitPriceCents * line.quantity;
}

export function subtotalCents(lines: OrderLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotalCents(line), 0);
}

/**
 * Validates requested lines against the menu and snapshots name and price.
 * Lines for the same dish with the same options are merged.
 */
export function buildLines(menu: Menu, requests: LineRequest[]): OrderLine[] {
  const merged = new Map<string, OrderLine>();
  for (const request of requests) {
    const line = buildLine(menu, request);
    const key = `${line.itemId}|${JSON.stringify(line.options)}`;
    const existing = merged.get(key);
    if (existing) existing.quantity = Math.min(existing.quantity + line.quantity, MAX_QUANTITY_PER_LINE);
    else merged.set(key, { ...line, lineId: `l${merged.size + 1}` });
  }
  return [...merged.values()];
}

function buildLine(menu: Menu, request: LineRequest): OrderLine {
  const item = findItem(menu, request.itemId);
  if (!item) throw new CartError(`Unknown dish "${request.itemId}"`);
  if (!Number.isInteger(request.quantity) || request.quantity < 1 || request.quantity > MAX_QUANTITY_PER_LINE) {
    throw new CartError(`Quantity for "${item.name}" must be between 1 and ${MAX_QUANTITY_PER_LINE}`);
  }

  const options: Record<string, string> = {};
  for (const option of item.options ?? []) {
    const chosen = request.options?.[option.id] ?? option.choices[0];
    if (!option.choices.includes(chosen)) {
      throw new CartError(`"${chosen}" is not a valid ${option.name} for "${item.name}"`);
    }
    options[option.id] = chosen;
  }

  return {
    lineId: "",
    itemId: item.id,
    name: item.name,
    unitPriceCents: item.priceCents,
    quantity: request.quantity,
    options,
  };
}
