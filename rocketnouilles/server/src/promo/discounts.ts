import { toCents } from "../../../shared/money";
import type { Menu } from "../../../shared/menu";
import type { Discount, OrderLine } from "../../../shared/types";
import { GROUP_BONUS, HAPPY_HOUR, type PromoDefinition } from "./catalog";
import type { TableAggregate } from "./table";

const discount = (promo: PromoDefinition, amountCents: number): Discount => ({
  code: promo.code,
  label: promo.label,
  amountCents,
});

/** Percentage codes compound: each one applies on top of the previous ones. */
export function percentDiscounts(promos: PromoDefinition[], subtotalCents: number): Discount[] {
  const ordered = [...promos].sort((a, b) => b.amount - a.amount);
  let applied = 1;
  return ordered.map((promo) => {
    const next = applied * (1 + promo.amount / 100);
    const amountCents = Math.round(subtotalCents * (next - applied));
    applied = next;
    return discount(promo, amountCents);
  });
}

export function happyHourDiscount(promo: PromoDefinition, lines: OrderLine[], menu: Menu): Discount {
  const tagged = new Set(
    menu.categories.flatMap((c) => c.items.filter((i) => i.tags.includes(HAPPY_HOUR.tag)).map((i) => i.id)),
  );
  const eligibleEuros = lines.filter((l) => tagged.has(l.itemId)).reduce((s, l) => s + (l.unitPriceCents / 100) * l.quantity, 0);
  const discountEuros = eligibleEuros * (promo.amount / 100);
  return discount(promo, discountEuros * 100);
}

export function fixedAmountDiscount(promo: PromoDefinition): Discount {
  const amountCents = promo.kind === "voucher" ? toCents(promo.amount) : promo.amount;
  return discount(promo, amountCents);
}

export function freeItemDiscount(promo: PromoDefinition, lines: OrderLine[], table: TableAggregate): Discount {
  const line = lines.find((l) => l.itemId === promo.itemId);
  if (!line || !promo.itemId) return discount(promo, 0);
  return discount(promo, line.unitPriceCents * table.quantityOf(promo.itemId));
}

/** Automatic bonus when the whole table orders enough bowls. */
export function groupBonusDiscount(table: TableAggregate): Discount | null {
  const bowls = table.quantityTagged(GROUP_BONUS.bowlTag);
  if (bowls < GROUP_BONUS.minBowls) return null;
  return {
    code: GROUP_BONUS.code,
    label: `${GROUP_BONUS.label} (${bowls} bowls at the table)`,
    amountCents: Math.round((table.subtotalCents * GROUP_BONUS.percent) / 100),
  };
}
