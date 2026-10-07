import { describe, expect, it } from "vitest";
import { CartError, buildLines, subtotalCents } from "../server/src/pricing/cart";
import { priceOrder } from "../server/src/promo/engine";
import { fixtureMenu } from "./helpers";

const menu = fixtureMenu();

describe("cart pricing (no promo)", () => {
  it("snapshots name and price from the menu", () => {
    const [line] = buildLines(menu, [{ itemId: "nems-porc", quantity: 2 }]);
    expect(line).toMatchObject({ itemId: "nems-porc", name: "Nêms au porc", unitPriceCents: 700, quantity: 2, options: {} });
  });

  it("defaults options to their first choice and keeps chosen ones", () => {
    const lines = buildLines(menu, [
      { itemId: "lamen-boeuf", quantity: 1 },
      { itemId: "lamen-legumes", quantity: 1, options: { spice: "hot" } },
    ]);
    expect(lines.map((l) => l.options)).toEqual([{ spice: "mild" }, { spice: "hot" }]);
  });

  it("merges identical dishes with identical options", () => {
    const lines = buildLines(menu, [
      { itemId: "lamen-boeuf", quantity: 1, options: { spice: "hot" } },
      { itemId: "lamen-boeuf", quantity: 2, options: { spice: "hot" } },
      { itemId: "lamen-boeuf", quantity: 1, options: { spice: "mild" } },
    ]);
    expect(lines.map((l) => [l.options.spice, l.quantity])).toEqual([["hot", 3], ["mild", 1]]);
  });

  it("rejects unknown dishes, invalid options and silly quantities", () => {
    expect(() => buildLines(menu, [{ itemId: "pizza", quantity: 1 }])).toThrow(CartError);
    expect(() => buildLines(menu, [{ itemId: "lamen-boeuf", quantity: 1, options: { spice: "volcano" } }])).toThrow(CartError);
    expect(() => buildLines(menu, [{ itemId: "nems-porc", quantity: 0 }])).toThrow(CartError);
    expect(() => buildLines(menu, [{ itemId: "nems-porc", quantity: 1.5 }])).toThrow(CartError);
    expect(() => buildLines(menu, [{ itemId: "nems-porc", quantity: 21 }])).toThrow(CartError);
  });

  it("computes the subtotal in cents", () => {
    const lines = buildLines(menu, [
      { itemId: "lamen-boeuf", quantity: 2 },
      { itemId: "nems-porc", quantity: 1 },
      { itemId: "the-jasmin", quantity: 3 },
    ]);
    expect(subtotalCents(lines)).toBe(2 * 1200 + 700 + 3 * 300);
  });

  it("charges the subtotal when no code is entered", () => {
    const lines = buildLines(menu, [{ itemId: "lamen-boeuf", quantity: 1 }, { itemId: "nems-porc", quantity: 1 }]);
    const pricing = priceOrder({ participant: "Alice", lines, codes: [], otherCarts: [], menu, now: new Date() });
    expect(pricing).toEqual({ subtotalCents: 1900, discounts: [], discountCents: 0, totalCents: 1900, rejectedCodes: [] });
  });

  it("prices an empty cart at zero", () => {
    const pricing = priceOrder({ participant: "Alice", lines: [], codes: [], otherCarts: [], menu, now: new Date() });
    expect(pricing.totalCents).toBe(0);
  });
});
