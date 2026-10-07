# Architecture

```
 laptop A                     laptop B                      Netlify
┌──────────────────┐  HTTP   ┌──────────────────┐        ┌──────────────────────────┐
│ node (Express)   │◀──────▶│ node (Express)   │──────▶ │ registry (Functions)     │
│  web UI (React)  │  peer   │  web UI          │ join/  │  Netlify Database        │
│  /api /peer      │  sync   │  /api /peer      │ list   │  (Postgres)              │
│  NoodlePay /psp  │         │  NoodlePay /psp  │        └──────────────────────────┘
│  data/*.json     │         │  data/*.json     │
└──────────────────┘         └──────────────────┘
```

There is no central server for orders: every node owns its participant's order and replicates everybody
else's. The registry only answers "who is at table RAMEN and at which URL?".

## Components

| Folder | Role |
|---|---|
| `server/` | The peer node: UI API (`/api`), peer protocol (`/peer`), group sheet (`/sheet`), static UI and menu photos. |
| `web/` | React + Vite UI, built into `dist/web` and served by the node. Polls `/api/state` every 2 s. |
| `registry/` | Peer discovery. Netlify Function `netlify/functions/api.ts` + Netlify Database (migrations in `netlify/database/migrations`). `local-server.ts` is the same API in memory. Both call `src/handlers.ts`. |
| `psp/` | NoodlePay, the mock payment provider. Standalone (`npm run psp`) or embedded in every node. |
| `shared/` | Types, menu schema (zod) and money formatting used by server and UI. |
| `public/menu/` | The real Happy Nouilles menu (`menu.json`) and photos. |
| `scripts/` | `dev.ts`, `e2e.ts`. |
| `test/` | Unit tests and a small fixture menu. |

## Inside a node (`server/src/`)

| Module | Responsibility |
|---|---|
| `cli.ts`, `config.ts`, `node.ts` | Parse flags/env, wire everything, start/stop. |
| `app.ts`, `routes/` | Express app; `api-routes.ts` (UI), `peer-routes.ts` (other nodes). |
| `state/node-store.ts` | The node's whole state in one JSON file, atomic writes. |
| `orders/order-service.ts` | Lifecycle of *our* order: DRAFT → PAID → CONFIRMED, versioning, payment. |
| `pricing/cart.ts` | Validates lines against the menu, subtotal. |
| `promo/` | Promo codes: catalog, stacking rules, eligibility, discount calculators, table aggregation, engine. |
| `protocol/` | Peer sync: merge rules, close preconditions, peer HTTP client, sync loop, message schemas. |
| `infra/` | HTTP helper with timeouts, registry client, NoodlePay client. |
| `sheet/` | Group sheet data (kitchen tally, allergens, totals) and print-friendly HTML. |
| `menu/loader.ts` | Loads and validates `menu.json`. |

## Money

Amounts are integer cents (`priceCents`, `amountCents`) and formatted with `shared/money.ts` (`fr-FR`, €).
Pricing of an order happens on its owner's node; the price is frozen in the order when it is paid.
