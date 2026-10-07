# Peer protocol

All messages are JSON over HTTP. Every call between nodes has a short timeout (2.5 s); an unreachable peer is
marked **offline** and retried on the next cycle. Nothing blocks on a peer being down.

## Discovery: the registry

Base URL: `https://rocket-nouilles-registry.netlify.app` (or `registry:local` on `:4800`). CORS is open, no auth.

| Request | Response |
|---|---|
| `GET /api/health` | `{ ok, service, storage, time }` |
| `GET /api/tables` | `{ tables: [{ code, name }] }` — `RAMEN`, `UDON`, `SOBA` |
| `POST /api/tables/:code/peers` `{ name, url }` | join **and** heartbeat (upsert). Returns `{ table, peers }` |
| `GET /api/tables/:code/peers` | `{ table, peers: [{ name, url, joinedAt, lastSeenAt }] }` — seen in the last 2 minutes |
| `DELETE /api/tables/:code/peers/:name` | leave. `{ table, removed }` |

A node heartbeats every 10 s and leaves on shutdown (Ctrl+C). Peers it has heard of are remembered in its state
file, so a node can still reach them if the registry is down.

## Orders

Each participant's node is the **only writer** of that participant's order:

```json
{ "orderId": "RAMEN:Alice", "table": "RAMEN", "participant": "Alice", "nodeUrl": "http://192.168.1.12:4001",
  "version": 7, "status": "DRAFT|PAID|CONFIRMED", "lines": [...], "promoCodes": [...],
  "pricing": { "subtotalCents", "discounts", "discountCents", "totalCents", "rejectedCodes" },
  "payment": { "chargeId", "type", "amountCents", "cardLast4", "paidAt" } | null, "updatedAt": "..." }
```

**Consistency rule — versioned last-writer-wins per owner.** The owner increments `version` on every change.
A node receiving an order keeps it only if `version` is strictly higher than the copy it has
(`server/src/protocol/merge.ts`). Equal or lower versions are ignored, so duplicates and out-of-order
deliveries are harmless and every node converges on the owner's latest version.

### Lifecycle

```
DRAFT ──pay (NoodlePay succeeded)──▶ PAID ──participant confirms (dialog)──▶ CONFIRMED
  │
  └── empty cart: "confirm without ordering" ──▶ CONFIRMED (nothing on the sheet)
```

- Lines and promo codes can change only in DRAFT. A declined payment leaves the order in DRAFT.
- The total is computed by the owner's node when paying and frozen in `pricing` / `payment`.

### Push and pull

| Call | When | Body / response |
|---|---|---|
| `POST /peer/orders` | the owner pushes its order to every known peer after each change | `{ table, from: { name, url }, orders: [Order] }` → `{ outcomes }` |
| `GET /peer/state?table=&name=&url=` | every node pulls every peer every 4 s | → `{ table, from, orders: [Order...], closure }` |

Pull returns **all** orders the peer knows, not just its own: a late joiner, or a node coming back after a
crash, catches up even with participants who are currently offline. The query string tells the pulled node
who is asking, so discovery also works without waiting for the registry.

Messages for another table are rejected with `409 wrong_table`; malformed messages with `400`.

## Closing the table

A node accepts `POST /api/table/close` (from its own UI) only when:

1. at least one order with dishes is `CONFIRMED`, and
2. every known participant is `CONFIRMED` — except a participant whose cart is empty **and** whose node is
   offline (someone who left without ordering).

It then records `closure = { closedAt, closedBy }` and broadcasts `POST /peer/close`
`{ table, from, closure, orders }`. Receivers merge the orders, store the closure and refuse any further change.
If two nodes close concurrently, everyone keeps the **earliest** `closedAt` (ties: smallest name).
A peer that was offline during the close gets it on its next pull (closure is part of `/peer/state`), and the
closer re-sends it to any peer whose snapshot has no closure.

## Group sheet

`GET /sheet` renders the confirmed orders (sorted by participant), the kitchen tally (quantity per dish and
options, in menu order, with the Chinese dish name), totals and allergens. It depends only on the replicated
orders, the closure and the menu, so all nodes of a closed table serve **byte-identical** sheets. Before the
close it is marked *Preview*.
