---
title: Glossary
owner: Ordering squad
updated: 2026-09-28
status: current
audience: everyone
---

# Glossary

**Big table bonus (`GROUP`)** — Automatic promotion: 10 % off each participant's own order when the table orders
8 noodle dishes or more. No code needed.

**Closure** — The record `{ closedAt, closedBy }` created when a table is closed. Once a node has it, the table is
read-only on that node.

**CONFIRMED** — Final status of an order. A paid order is confirmed by its owner in a dialog; an empty order can
be confirmed directly ("Confirm without ordering").

**DRAFT** — Initial status of an order. The only status in which dishes and promo codes can change.

**Group sheet** — The printable page at `/sheet`: confirmed orders, kitchen tally, totals and allergens. Marked
*Preview* until the table is closed.

**Happy Nouilles** — The restaurant: 95 Rue Beaubourg, 75003 Paris.

**Heartbeat** — The registry call a node makes every 10 seconds to stay listed for its table.

**Kitchen tally** — The first part of the printed sheet: quantity per dish and options, in menu order, with the
Chinese dish name.

**Known peers** — Peers a node has heard of, saved in its state file so they stay reachable without the registry.

**LWW (last-writer-wins)** — Our replication rule: an order copy replaces another only if its owner-incremented
`version` is strictly higher. See ADR-001.

**Node** — The RocketNouilles server a participant runs on their laptop, with its UI. One node per participant.

**NoodlePay** — The mock payment provider. Test cards, no real money.

**Owner** — The node of the participant an order belongs to; the only node allowed to change that order.

**PAID** — Status of an order after a successful NoodlePay charge. The price is frozen.

**Peer** — Another node of the same table.

**Pull** — Every 4 seconds a node fetches `/peer/state` from each known peer and merges what it receives.

**Push** — After each change the owner sends its order to every known peer (`POST /peer/orders`).

**Registry** — The discovery service (Netlify Function + Netlify Database) that lists the peers of each table.

**Table** — A group ordering together: `RAMEN` (Ramen Rockets), `UDON` (Udon Orbiters), `SOBA` (Soba Satellites).
