export type PromoKind = "percent" | "fixed" | "voucher" | "free-item" | "happy-hour";

export interface PromoDefinition {
  code: string;
  kind: PromoKind;
  /** Short label shown in the discount breakdown. */
  label: string;
  /** Customer-facing rule, shown in the UI. */
  description: string;
  /** Percent for percent/happy-hour codes, amount for fixed/voucher codes. */
  amount: number;
  minSubtotalCents?: number;
  /** Menu item made free by a free-item code. */
  itemId?: string;
  /** Only one participant per table may use it. */
  oncePerTable?: boolean;
  notCombinableWith?: string[];
}

export const MAX_CODES_PER_ORDER = 4;

/** Kinds that take a fixed amount off; only one of them per order. */
export const FIXED_AMOUNT_KINDS: PromoKind[] = ["fixed", "voucher"];

export const HAPPY_HOUR = { startHour: 15, endHour: 18, tag: "noodles" };

/** Automatic table-wide bonus, no code needed. */
export const GROUP_BONUS = {
  code: "GROUP",
  label: "Big table bonus",
  minBowls: 8,
  bowlTag: "noodles",
  percent: 10,
};

export const PROMO_CATALOG: PromoDefinition[] = [
  {
    code: "BIENVENUE10",
    kind: "percent",
    label: "Welcome −10%",
    description: "10% off your order.",
    amount: 10,
  },
  {
    code: "SLURP20",
    kind: "percent",
    label: "Slurp −20%",
    description: "20% off your order. Not combinable with HAPPYHOUR.",
    amount: 20,
    notCombinableWith: ["HAPPYHOUR"],
  },
  {
    code: "ANNIV",
    kind: "percent",
    label: "Happy birthday −50%",
    description: "Half price for the birthday person. One per table.",
    amount: 50,
    oncePerTable: true,
  },
  {
    code: "HAPPYHOUR",
    kind: "happy-hour",
    label: "Happy hour −15% on noodles",
    description: "15% off noodle dishes, every day from 15:00 to 18:00 (Paris time).",
    amount: 15,
  },
  {
    code: "NOUILLES5",
    kind: "fixed",
    label: "5 € off",
    description: "5 € off when your order is still at least 25 € after your other discounts.",
    amount: 500,
    minSubtotalCents: 2500,
  },
  {
    code: "FIDELITE",
    kind: "fixed",
    label: "Loyalty 3 €",
    description: "3 € off for our regulars.",
    amount: 300,
  },
  {
    code: "MERCI2",
    kind: "voucher",
    label: "Thank-you voucher 2 €",
    description: "The 2 € voucher handed out with your last takeaway bag.",
    amount: 200,
  },
  {
    code: "RAVIOLIOFFERT",
    kind: "free-item",
    label: "Free Raviolis grillés",
    description: "One portion of Raviolis grillés on the house when you order some.",
    amount: 1,
    itemId: "raviolis-grilles",
  },
];

export function findPromo(code: string): PromoDefinition | undefined {
  return PROMO_CATALOG.find((p) => p.code === code);
}

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}
