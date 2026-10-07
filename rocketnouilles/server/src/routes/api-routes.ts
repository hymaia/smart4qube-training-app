import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import type { TableView } from "../../../shared/types";
import type { NodeContext } from "../context";
import { OrderStateError } from "../orders/order-service";
import { CartError } from "../pricing/cart";
import { PROMO_CATALOG } from "../promo/catalog";
import { closeBlockers, closeRefusal } from "../protocol/close";

const LinesBody = z.object({
  lines: z.array(z.object({ itemId: z.string(), quantity: z.number(), options: z.record(z.string(), z.string()).optional() })),
});
const PromoBody = z.object({ codes: z.array(z.string()).max(10) });
const PayBody = z.object({
  card: z.object({ number: z.string(), expiry: z.string(), cvc: z.string() }),
  idempotencyKey: z.string().min(8).optional(),
});

type Handler = (req: Request, res: Response) => Promise<void> | void;
const handle = (fn: Handler) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res)).catch(next);

/** API used by the web UI of this node. */
export function apiRoutes(ctx: NodeContext): Router {
  const router = Router();

  router.get("/menu", (_req, res) => void res.json(ctx.menu));

  router.get("/promos", (_req, res) => {
    res.json(PROMO_CATALOG.map(({ code, description }) => ({ code, description })));
  });

  router.get("/state", (_req, res) => void res.json(tableView(ctx)));

  router.put("/order/lines", handle(async (req, res) => {
    const { lines } = LinesBody.parse(req.body);
    res.json(await ctx.orders.setLines(lines));
  }));

  router.put("/order/promo-codes", handle(async (req, res) => {
    const { codes } = PromoBody.parse(req.body);
    res.json(await ctx.orders.setPromoCodes(codes));
  }));

  router.post("/order/pay", handle(async (req, res) => {
    const { card, idempotencyKey } = PayBody.parse(req.body);
    const result = await ctx.orders.pay(card, idempotencyKey);
    if (result.ok) res.json(result.order);
    else res.status(402).json({ error: result.code, message: result.message });
  }));

  router.post("/order/confirm", handle(async (_req, res) => {
    res.json(await ctx.orders.confirm());
  }));

  router.post("/table/close", handle(async (_req, res) => {
    if (ctx.store.state.closure) return void res.json(ctx.store.state.closure);
    const refusal = closeRefusal(Object.values(ctx.store.state.orders), ctx.sync.isReachable);
    if (refusal) return void res.status(409).json({ error: "cannot_close", message: refusal });
    res.json(await ctx.sync.closeTable(ctx.store.state.me.name, ctx.clock()));
  }));

  router.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof z.ZodError) return void res.status(400).json({ error: "bad_request", message: error.message });
    if (error instanceof CartError) return void res.status(400).json({ error: "invalid_cart", message: error.message });
    if (error instanceof OrderStateError) return void res.status(409).json({ error: "invalid_state", message: error.message });
    console.error(error);
    res.status(500).json({ error: "internal", message: "Something went wrong on this node" });
  });

  return router;
}

function tableView(ctx: NodeContext): TableView {
  const { state } = ctx.store;
  const orders = Object.values(state.orders).sort((a, b) => a.participant.localeCompare(b.participant));
  const myOrder = ctx.orders.myOrder;
  const live = myOrder.status === "DRAFT" && !state.closure ? { ...myOrder, pricing: ctx.orders.quote() } : myOrder;
  return {
    table: state.table,
    me: state.me,
    myOrder: live,
    orders: orders.map((o) => (o.participant === live.participant ? live : o)),
    peers: ctx.sync.peerStatuses(),
    registry: ctx.sync.registryStatus(),
    closure: state.closure,
    canClose: !state.closure && closeRefusal(orders, ctx.sync.isReachable) === null,
    closeBlockers: closeBlockers(orders, ctx.sync.isReachable),
  };
}
