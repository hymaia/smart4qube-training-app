import { describe, expect, it } from "vitest";
import { buildLines, type LineRequest } from "../server/src/pricing/cart";
import { priceOrder } from "../server/src/promo/engine";
import type { TableCart } from "../server/src/promo/table";
import { fixtureMenu } from "./helpers";

const menu = fixtureMenu();
const LUNCH = new Date("2026-10-07T12:30:00+02:00");

function price(codes: string[], requests: LineRequest[], otherCarts: TableCart[] = [], now = LUNCH) {
  return priceOrder({ participant: "Alice", lines: buildLines(menu, requests), codes, otherCarts, menu, now });
}

const SOUP_AND_NEMS: LineRequest[] = [
  { itemId: "lamen-boeuf", quantity: 1 },
  { itemId: "nems-porc", quantity: 1 },
];

describe("promo codes", () => {
  it("BIENVENUE10 takes 10% off", () => {
    const pricing = price(["BIENVENUE10"], SOUP_AND_NEMS);
    expect(pricing.discounts).toEqual([{ code: "BIENVENUE10", label: "Welcome −10%", amountCents: 190 }]);
    expect(pricing.totalCents).toBe(1710);
  });

  it("ANNIV halves the bill of the birthday person", () => {
    expect(price(["ANNIV"], SOUP_AND_NEMS).totalCents).toBe(950);
  });

  it("FIDELITE takes 3 € off", () => {
    expect(price(["FIDELITE"], SOUP_AND_NEMS).totalCents).toBe(1600);
  });

  it("NOUILLES5 takes 5 € off orders of 25 € or more", () => {
    const pricing = price(["NOUILLES5"], [{ itemId: "lamen-boeuf", quantity: 2 }, { itemId: "the-jasmin", quantity: 1 }]);
    expect(pricing.subtotalCents).toBe(2700);
    expect(pricing.totalCents).toBe(2200);
  });

  it("NOUILLES5 is refused below 25 €", () => {
    const pricing = price(["NOUILLES5"], SOUP_AND_NEMS);
    expect(pricing.totalCents).toBe(1900);
    expect(pricing.rejectedCodes).toEqual([{ code: "NOUILLES5", reason: "Requires an order of at least 25 €" }]);
  });

  it("RAVIOLIOFFERT offers your portion of raviolis", () => {
    const pricing = price(["RAVIOLIOFFERT"], [{ itemId: "raviolis-grilles", quantity: 1 }, { itemId: "lamen-boeuf", quantity: 1 }]);
    expect(pricing.discounts[0].amountCents).toBe(660);
    expect(pricing.totalCents).toBe(1200);
  });

  it("RAVIOLIOFFERT needs raviolis in the cart", () => {
    expect(price(["RAVIOLIOFFERT"], SOUP_AND_NEMS).rejectedCodes[0].reason).toMatch(/Add the offered dish/);
  });

  it("codes are trimmed and case-insensitive", () => {
    expect(price(["  bienvenue10 "], SOUP_AND_NEMS).totalCents).toBe(1710);
  });

  it("unknown codes are reported, not applied", () => {
    const pricing = price(["FREEFOOD"], SOUP_AND_NEMS);
    expect(pricing.rejectedCodes).toEqual([{ code: "FREEFOOD", reason: "Unknown code" }]);
    expect(pricing.totalCents).toBe(1900);
  });

  it("HAPPYHOUR is refused outside happy hour", () => {
    const morning = new Date("2026-01-15T10:00:00+01:00");
    expect(price(["HAPPYHOUR"], SOUP_AND_NEMS, [], morning).rejectedCodes[0].reason).toMatch(/Only valid from 15:00/);
  });
});

describe("stacking rules", () => {
  it("SLURP20 cannot be combined with HAPPYHOUR", () => {
    const pricing = price(["SLURP20", "HAPPYHOUR"], SOUP_AND_NEMS);
    expect(pricing.rejectedCodes).toEqual([{ code: "HAPPYHOUR", reason: "Cannot be combined with SLURP20" }]);
  });

  it("only one fixed-amount code per order", () => {
    const pricing = price(["FIDELITE", "NOUILLES5"], [{ itemId: "lamen-boeuf", quantity: 3 }]);
    expect(pricing.rejectedCodes[0]).toEqual({ code: "NOUILLES5", reason: "Only one fixed-amount code per order (FIDELITE already applied)" });
    expect(pricing.totalCents).toBe(3600 - 300);
  });

  it("at most 4 codes per order", () => {
    const pricing = price(["BIENVENUE10", "FIDELITE", "RAVIOLIOFFERT", "SLURP20", "ANNIV"], SOUP_AND_NEMS);
    expect(pricing.rejectedCodes.map((r) => r.code)).toContain("ANNIV");
    expect(pricing.rejectedCodes.find((r) => r.code === "ANNIV")?.reason).toBe("At most 4 codes per order");
  });

  it("ANNIV can only be used once per table", () => {
    const bob: TableCart = { participant: "Bob", status: "PAID", lines: [], promoCodes: ["ANNIV"] };
    expect(price(["ANNIV"], SOUP_AND_NEMS, [bob]).rejectedCodes[0].reason).toBe("Already used by someone at your table");
  });

  it("no big table bonus below 8 bowls", () => {
    const bob: TableCart = { participant: "Bob", status: "DRAFT", lines: buildLines(menu, [{ itemId: "lamen-legumes", quantity: 3 }]), promoCodes: [] };
    const pricing = price([], [{ itemId: "lamen-boeuf", quantity: 2 }], [bob]);
    expect(pricing.discounts).toEqual([]);
    expect(pricing.totalCents).toBe(2400);
  });
});
