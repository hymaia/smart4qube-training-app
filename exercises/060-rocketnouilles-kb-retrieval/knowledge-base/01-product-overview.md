---
title: RocketNouilles — product overview
owner: Ordering squad
updated: 2026-09-28
status: current
audience: everyone
---

# RocketNouilles — product overview

## What it is

RocketNouilles is our peer-to-peer group ordering tool for **Happy Nouilles**, the noodle restaurant at
**95 Rue Beaubourg, 75003 Paris**. A group sits at one "table", each person orders from their own laptop, pays
with a fake card, and when everybody has confirmed, one person closes the table. Every laptop then shows the
same **group sheet**, which is printed and taken to the restaurant.

There is no central order server. Each participant runs a **node** (a small Express server plus a React UI) on
their own laptop. The node is the only writer of its participant's order and replicates everybody else's order
over HTTP. A small **registry** only answers "who is at table RAMEN, and at which URL?".

Payments go through **NoodlePay**, a mock payment provider. No real money moves in RocketNouilles; the real bill is
settled at the restaurant.

## Tables

Three tables exist, one per group:

| Code | Name |
|---|---|
| `RAMEN` | Ramen Rockets |
| `UDON` | Udon Orbiters |
| `SOBA` | Soba Satellites |

When the registry is reachable, a node started with any other code refuses to start and lists the available codes.

## Components

| Component | Folder | What it does |
|---|---|---|
| Node | `server/` | UI API (`/api`), peer protocol (`/peer`), group sheet (`/sheet`), static UI and menu photos. Default port `4001`. |
| Web UI | `web/` | React + Vite, served by the node; refreshes from `/api/state` every 2 seconds. |
| Registry | `registry/` | Peer discovery. Netlify site `rocket-nouilles-registry` backed by Netlify Database; `registry:local` is the same API in memory on port `4800`. |
| NoodlePay | `psp/` | Mock payment provider. Embedded in every node under `/psp`, or standalone on port `4900`. |
| Menu | `public/menu/` | The Happy Nouilles menu (`menu.json`) and photos. |

## Starting a node

```bash
npm install
npm run build
npm run node -- --name Alice --table RAMEN
```

Then open `http://localhost:4001`. Useful flags: `--port`, `--public-url` (the URL other laptops use to reach you),
`--registry` (`none` disables it), `--psp`, `--data-dir`. A node keeps its whole state in
`data/<TABLE>-<name>.json`; restarting with the same name and table restores it.

## Where to read next

- Peer protocol: how nodes discover each other and replicate orders.
- Table lifecycle and close rules: DRAFT, PAID, CONFIRMED, and when a table can be closed.
- Promotions policy: the intended rules for every promo code.
- NoodlePay integration: test cards, declines, timeouts.
- Operations runbooks: offline peers, sheet mismatches, declined payments, registry outages.
- Ordering-day procedure: from table setup to handing the sheet to the restaurant.
