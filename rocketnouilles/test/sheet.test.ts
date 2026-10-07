import { describe, expect, it } from "vitest";
import { allergenSummary, buildGroupSheet, kitchenTally } from "../server/src/sheet/group-sheet";
import { renderSheet } from "../server/src/sheet/render-sheet";
import { fixtureMenu, line, order } from "./helpers";

const menu = fixtureMenu();
const paid = (amountCents: number) => ({ chargeId: "ch_1", type: "charge" as const, amountCents, cardLast4: "4242", paidAt: "2026-10-07T12:00:00Z" });

const alice = order("Alice", {
  status: "CONFIRMED",
  lines: [line("lamen-boeuf", 1200, 1, { spice: "hot" }), line("nems-porc", 700, 2)],
  pricing: { subtotalCents: 2600, discounts: [], discountCents: 0, totalCents: 2600, rejectedCodes: [] },
  payment: paid(2600),
});
const bob = order("Bob", {
  status: "CONFIRMED",
  lines: [line("lamen-boeuf", 1200, 2, { spice: "hot" }), line("lamen-boeuf", 1200, 1, { spice: "mild" })],
  pricing: { subtotalCents: 3600, discounts: [], discountCents: 0, totalCents: 3600, rejectedCodes: [] },
  payment: paid(3600),
});
const carolDraft = order("Carol", { lines: [line("the-jasmin", 300)] });

describe("group sheet", () => {
  it("tallies dishes per options across participants, in menu order", () => {
    expect(kitchenTally([alice, bob], menu).map((t) => [t.quantity, t.itemId, t.options])).toEqual([
      [2, "nems-porc", ""],
      [3, "lamen-boeuf", "spice: hot"],
      [1, "lamen-boeuf", "spice: mild"],
    ]);
  });

  it("only includes confirmed orders and sums what was paid", () => {
    const sheet = buildGroupSheet([carolDraft, bob, alice], menu);
    expect(sheet.orders.map((o) => o.participant)).toEqual(["Alice", "Bob"]);
    expect(sheet.totalPaidCents).toBe(6200);
  });

  it("lists who is concerned by each allergen", () => {
    expect(allergenSummary([alice, bob], menu)).toEqual([
      { allergen: "gluten", participants: ["Alice", "Bob"] },
      { allergen: "soy", participants: ["Alice", "Bob"] },
    ]);
  });

  it("renders the same HTML whatever the order of the input", () => {
    const table = { code: "RAMEN", name: "Ramen Rockets" };
    const closure = { closedAt: "2026-10-07T12:34:00.000Z", closedBy: "Alice" };
    const a = renderSheet({ menu, table, orders: [alice, bob], closure });
    const b = renderSheet({ menu, table, orders: [bob, alice], closure });
    expect(a).toBe(b);
    expect(a).toMatch(/Closed on Wednesday,? 7 October 2026\D+14:34 by Alice/);
    expect(a).toContain("62,00");
    expect(a).toContain("@media print");
  });

  it("marks an open table as a preview", () => {
    const html = renderSheet({ menu, table: { code: "RAMEN", name: "Ramen Rockets" }, orders: [alice], closure: null });
    expect(html).toContain("Preview");
  });
});
