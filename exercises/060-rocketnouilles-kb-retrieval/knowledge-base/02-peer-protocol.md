---
title: Peer protocol specification
owner: Ordering squad
updated: 2026-09-21
status: current
audience: engineers
source: docs/PROTOCOL.md in the rocketnouilles repository
---

# Peer protocol specification

All messages are JSON over HTTP. Every call between two nodes has a short timeout of **2.5 seconds**. A peer that
does not answer is marked **offline** and retried on the next cycle; nothing ever blocks on a peer being down.

## Discovery through the registry

Base URL `https://rocket-nouilles-registry.netlify.app` (or a local registry on port `4800`). CORS is open, there
is no authentication.

| Request | Response |
|---|---|
| `GET /api/health` | `{ ok, service, storage, time }` |
| `GET /api/tables` | `{ tables: [{ code, name }] }` |
| `POST /api/tables/:code/peers` with `{ name, url }` | join **and** heartbeat (upsert); returns `{ table, peers }` |
| `GET /api/tables/:code/peers` | peers seen during the last **2 minutes** |
| `DELETE /api/tables/:code/peers/:name` | leave; returns `{ table, removed }` |

A node sends a heartbeat every **10 seconds** and leaves the registry on shutdown (Ctrl+C). Participant names are
1 to 32 letters, digits, spaces, dots, dashes or underscores. Every peer a node has heard of is remembered in its
state file (`knownPeers`), so it can still reach them while the registry is down.

## Order document

Each participant's node is the **only writer** of that participant's order. An order carries `orderId`
(`TABLE:Name`), `table`, `participant`, `nodeUrl`, `version`, `status` (`DRAFT`, `PAID`, `CONFIRMED`), `lines`,
`promoCodes`, `pricing` (subtotal, discounts, total, rejected codes) and `payment` (charge id, type, amount, last
four card digits, paid-at time).

## Consistency rule: versioned last-writer-wins per owner

The owner increments `version` on every change. A node receiving an order keeps it only if its `version` is
**strictly higher** than the copy it already has (`server/src/protocol/merge.ts`). Equal or lower versions are
ignored, so duplicate and out-of-order deliveries are harmless, and every node converges on the owner's latest
version. See ADR-001 for why.

## Push and pull

| Call | When | Payload |
|---|---|---|
| `POST /peer/orders` | the owner pushes its order to every known peer after each change | `{ table, from: { name, url }, orders }` → `{ outcomes }` |
| `GET /peer/state?table=&name=&url=` | every node pulls every known peer every **4 seconds** | → `{ table, from, orders, closure }` |

A pull returns **all** the orders the peer knows, not only its own. A late joiner, or a node coming back after a
crash, therefore catches up even with participants who are currently offline. The query string tells the pulled
node who is asking, so discovery also works without waiting for the registry.

Messages for another table are rejected with `409 wrong_table`; malformed messages with `400 bad_request`.

## Close broadcast

Closing is described in the table lifecycle document. On the wire, the closing node sends
`POST /peer/close` with `{ table, from, closure, orders }`. Receivers merge the orders, store the closure and
refuse any further change. The closure is also part of `/peer/state`, so a peer that missed the broadcast gets
it on its next pull, and the closer re-sends it to any peer whose snapshot has no closure.
