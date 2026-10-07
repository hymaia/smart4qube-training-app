import type { Menu } from "../../../shared/menu";
import type { Discount, OrderLine, Pricing } from "../../../shared/types";
import { subtotalCents } from "../pricing/cart";
import { FIXED_AMOUNT_KINDS, type PromoDefinition } from "./catalog";
import {
  fixedAmountDiscount,
  freeItemDiscount,
  groupBonusDiscount,
  happyHourDiscount,
  percentDiscounts,
} from "./discounts";
import { ineligibilityReason } from "./eligibility";
import { resolveStack } from "./stacking";
import { TableAggregate, type TableCart } from "./table";

export interface PricingInput {
  participant: string;
  lines: OrderLine[];
  codes: string[];
  /** Carts of the other participants at the table. */
  otherCarts: TableCart[];
  menu: Menu;
  now: Date;
}

/** Prices one participant's cart: subtotal, promotions, total to charge. */
export function priceOrder(input: PricingInput): Pricing {
  const subtotal = subtotalCents(input.lines);
  const me: TableCart = { participant: input.participant, status: "DRAFT", lines: input.lines, promoCodes: input.codes };
  const others = input.otherCarts.filter((c) => c.participant !== input.participant);
  const table = new TableAggregate([...others, me], input.menu);

  const { accepted, rejected } = resolveStack(input.codes, input.participant, table);
  const applicable: PromoDefinition[] = [];
  for (const promo of accepted) {
    const reason = ineligibilityReason(promo, { lines: input.lines, subtotalCents: subtotal, now: input.now });
    if (reason) rejected.push({ code: promo.code, reason });
    else applicable.push(promo);
  }

  const ofKind = (...kinds: string[]) => applicable.filter((p) => kinds.includes(p.kind));
  const groupBonus = subtotal > 0 ? groupBonusDiscount(table) : null;
  const discounts: Discount[] = [
    ...percentDiscounts(ofKind("percent"), subtotal),
    ...ofKind("happy-hour").map((p) => happyHourDiscount(p, input.lines, input.menu)),
    ...ofKind(...FIXED_AMOUNT_KINDS).map(fixedAmountDiscount),
    ...ofKind("free-item").map((p) => freeItemDiscount(p, input.lines, table)),
    ...(groupBonus ? [groupBonus] : []),
  ].map((d) => ({ ...d, amountCents: Math.min(d.amountCents, subtotal) }));

  const discountCents = discounts.reduce((sum, d) => sum + d.amountCents, 0);
  return {
    subtotalCents: subtotal,
    discounts,
    discountCents,
    totalCents: subtotal - discountCents,
    rejectedCodes: rejected,
  };
}
