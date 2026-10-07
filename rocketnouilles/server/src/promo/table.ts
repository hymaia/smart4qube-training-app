import type { Menu } from "../../../shared/menu";
import type { OrderLine } from "../../../shared/types";
import { subtotalCents } from "../pricing/cart";

/** One participant's cart, as seen by the promo engine. */
export interface TableCart {
  participant: string;
  status: string;
  lines: OrderLine[];
  promoCodes: string[];
}

/** Aggregated view of every cart at the table, used by group promotions. */
export class TableAggregate {
  private readonly tagsByItem: Map<string, string[]>;

  constructor(
    readonly carts: TableCart[],
    menu: Menu,
  ) {
    this.tagsByItem = new Map(menu.categories.flatMap((c) => c.items.map((i) => [i.id, i.tags] as const)));
  }

  get participantCount(): number {
    return this.carts.filter((c) => c.lines.length > 0).length;
  }

  get subtotalCents(): number {
    return this.carts.reduce((sum, cart) => sum + subtotalCents(cart.lines), 0);
  }

  quantityOf(itemId: string): number {
    return this.allLines().filter((l) => l.itemId === itemId).reduce((sum, l) => sum + l.quantity, 0);
  }

  quantityTagged(tag: string): number {
    return this.allLines()
      .filter((l) => this.tagsByItem.get(l.itemId)?.includes(tag))
      .reduce((sum, l) => sum + l.quantity, 0);
  }

  /** Codes already spent by other participants (paid or confirmed orders). */
  codesUsedBy(otherThan: string): Set<string> {
    return new Set(
      this.carts.filter((c) => c.participant !== otherThan && c.status !== "DRAFT").flatMap((c) => c.promoCodes),
    );
  }

  private allLines(): OrderLine[] {
    return this.carts.flatMap((c) => c.lines);
  }
}
