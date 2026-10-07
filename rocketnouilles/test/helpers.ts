import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Menu } from "../shared/menu";
import type { Order, OrderLine } from "../shared/types";
import { parseMenu } from "../server/src/menu/loader";

export const FIXTURE_MENU_PATH = resolve(import.meta.dirname, "fixtures/menu.json");

export function fixtureMenu(): Menu {
  return parseMenu(JSON.parse(readFileSync(FIXTURE_MENU_PATH, "utf8")));
}

export function line(itemId: string, unitPriceCents: number, quantity = 1, options: Record<string, string> = {}): OrderLine {
  return { lineId: `${itemId}-${quantity}`, itemId, name: itemId, unitPriceCents, quantity, options };
}

export function order(participant: string, overrides: Partial<Order> = {}): Order {
  return {
    orderId: `RAMEN:${participant}`,
    table: "RAMEN",
    participant,
    nodeUrl: `http://localhost/${participant}`,
    version: 1,
    status: "DRAFT",
    lines: [],
    promoCodes: [],
    pricing: { subtotalCents: 0, discounts: [], discountCents: 0, totalCents: 0, rejectedCodes: [] },
    payment: null,
    updatedAt: "2026-10-07T12:00:00.000Z",
    ...overrides,
  };
}
