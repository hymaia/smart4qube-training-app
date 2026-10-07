import { Router } from "express";
import type { NodeContext } from "../context";
import { CloseMessageSchema, PushOrdersSchema } from "../protocol/schemas";

/** Node-to-node API. See docs/PROTOCOL.md. */
export function peerRoutes(ctx: NodeContext): Router {
  const router = Router();
  const table = () => ctx.store.state.table.code;

  router.get("/state", (req, res) => {
    const { table: from, name, url } = req.query;
    if (from === table() && typeof name === "string" && typeof url === "string" && /^https?:\/\//.test(url)) {
      ctx.sync.trackPeer(name, url);
    }
    res.json(ctx.sync.snapshot());
  });

  router.post("/orders", (req, res) => {
    const parsed = PushOrdersSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "bad_request", message: parsed.error.message });
    if (parsed.data.table !== table()) {
      return void res.status(409).json({ error: "wrong_table", message: `This node is at table ${table()}` });
    }
    const outcomes = ctx.sync.receiveOrders(parsed.data.from, parsed.data.orders);
    res.json({ outcomes });
  });

  router.post("/close", (req, res) => {
    const parsed = CloseMessageSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "bad_request", message: parsed.error.message });
    if (parsed.data.table !== table()) {
      return void res.status(409).json({ error: "wrong_table", message: `This node is at table ${table()}` });
    }
    const closure = ctx.sync.receiveClose(parsed.data.from, parsed.data.closure, parsed.data.orders);
    res.json({ closure });
  });

  return router;
}
