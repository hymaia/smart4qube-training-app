import { randomUUID } from "node:crypto";
import type { Menu } from "../../../shared/menu";
import type { CardInput, Order, Pricing } from "../../../shared/types";
import type { PspClient } from "../infra/psp-client";
import { buildLines, type LineRequest } from "../pricing/cart";
import { priceOrder } from "../promo/engine";
import { normalizeCode } from "../promo/catalog";
import type { NodeStore } from "../state/node-store";

export class OrderStateError extends Error {}

export type PaymentOutcome = { ok: true; order: Order } | { ok: false; code: string; message: string };

/** Lifecycle of the order owned by this node: DRAFT -> PAID -> CONFIRMED. */
export class OrderService {
  private paying = false;

  constructor(
    private readonly store: NodeStore,
    private readonly menu: Menu,
    private readonly psp: PspClient,
    private readonly onChange: (order: Order) => void,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  /** Creates our order on first start; refreshes our advertised URL afterwards. */
  async init(): Promise<void> {
    const { me, table } = this.store.state;
    const existing = this.store.state.orders[me.name];
    if (existing && existing.nodeUrl === me.url) return;
    const base: Order = existing ?? {
      orderId: `${table.code}:${me.name}`,
      table: table.code,
      participant: me.name,
      nodeUrl: me.url,
      version: 0,
      status: "DRAFT",
      lines: [],
      promoCodes: [],
      pricing: { subtotalCents: 0, discounts: [], discountCents: 0, totalCents: 0, rejectedCodes: [] },
      payment: null,
      updatedAt: this.clock().toISOString(),
    };
    await this.commit({ ...base, nodeUrl: me.url });
  }

  get myOrder(): Order {
    return this.store.state.orders[this.store.state.me.name];
  }

  /** Live price of our draft, taking the rest of the table into account. */
  quote(order: Order = this.myOrder): Pricing {
    const others = Object.values(this.store.state.orders).filter((o) => o.participant !== order.participant);
    return priceOrder({
      participant: order.participant,
      lines: order.lines,
      codes: order.promoCodes,
      otherCarts: others.map((o) => ({
        participant: o.participant,
        status: o.status,
        lines: o.lines,
        promoCodes: o.pricing.discounts.map((d) => d.code),
      })),
      menu: this.menu,
      now: this.clock(),
    });
  }

  async setLines(requests: LineRequest[]): Promise<Order> {
    const draft = this.editableDraft();
    return this.commitPriced({ ...draft, lines: buildLines(this.menu, requests) });
  }

  async setPromoCodes(codes: string[]): Promise<Order> {
    const draft = this.editableDraft();
    const promoCodes = [...new Set(codes.map(normalizeCode).filter(Boolean))];
    return this.commitPriced({ ...draft, promoCodes });
  }

  async pay(card: CardInput, idempotencyKey: string = randomUUID()): Promise<PaymentOutcome> {
    const draft = this.editableDraft();
    if (draft.lines.length === 0) throw new OrderStateError("Your cart is empty");
    this.paying = true;
    try {
      const pricing = this.quote(draft);
      const result = await this.psp.charge({
        amountCents: pricing.totalCents,
        currency: "EUR",
        description: `RocketNouilles ${draft.orderId}`,
        idempotencyKey,
        card,
      });
      if (!result.ok) return result;
      const { charge } = result;
      const order = await this.commit({
        ...draft,
        pricing,
        status: "PAID",
        payment: {
          chargeId: charge.id,
          type: charge.type,
          amountCents: charge.amountCents,
          cardLast4: charge.cardLast4,
          paidAt: this.clock().toISOString(),
        },
      });
      return { ok: true, order };
    } finally {
      this.paying = false;
    }
  }

  /** PAID -> CONFIRMED. An empty DRAFT can be confirmed too: "nothing for me". */
  async confirm(): Promise<Order> {
    this.assertTableOpen();
    const order = this.myOrder;
    if (order.status === "CONFIRMED") return order;
    if (order.status === "DRAFT" && order.lines.length > 0) {
      throw new OrderStateError("Pay for your order before confirming it");
    }
    return this.commit({ ...order, status: "CONFIRMED" });
  }

  private editableDraft(): Order {
    this.assertTableOpen();
    if (this.paying) throw new OrderStateError("A payment is in progress");
    const order = this.myOrder;
    if (order.status !== "DRAFT") throw new OrderStateError(`Your order is ${order.status} and can no longer change`);
    return order;
  }

  private assertTableOpen(): void {
    if (this.store.state.closure) throw new OrderStateError("The table is closed");
  }

  private commitPriced(order: Order): Promise<Order> {
    return this.commit({ ...order, pricing: this.quote(order) });
  }

  private async commit(order: Order): Promise<Order> {
    const next: Order = { ...order, version: order.version + 1, updatedAt: this.clock().toISOString() };
    this.store.state.orders[next.participant] = next;
    await this.store.save();
    this.onChange(next);
    return next;
  }
}
