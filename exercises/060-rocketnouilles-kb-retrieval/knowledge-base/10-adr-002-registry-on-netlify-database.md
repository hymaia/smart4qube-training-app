---
title: "ADR-002: Peer registry on Netlify Functions and Netlify Database"
owner: Platform squad
updated: 2026-07-03
status: accepted
deciders: Platform squad, Ordering squad
---

# ADR-002: Peer registry on Netlify Functions and Netlify Database

## Context

Nodes need to find the other nodes of their table. Discovery must work on an unknown venue network, needs no
login, and holds very little data: the three tables and, per table, a handful of `{ name, url, lastSeenAt }`
records. Orders never go through the registry (see ADR-001).

## Decision

- The registry is a single Netlify Function (`registry/netlify/functions/api.ts`) on the site
  `rocket-nouilles-registry`, reachable at `https://rocket-nouilles-registry.netlify.app`.
- Storage is **Netlify Database** (managed Postgres, `@netlify/database`). The schema and the seed of the three
  tables live in `registry/netlify/database/migrations/0001_create_registry.sql`: tables `noodle_tables` and
  `peers`, primary key `(table_code, name)`.
- Joining and heartbeating are the same upsert. A peer is listed while its last heartbeat is less than
  **2 minutes** old; nothing has to be cleaned up.
- The API logic lives in `registry/src/handlers.ts` and is shared with `registry/local-server.ts`, an in-memory
  version on port `4800` used for tests, `npm run e2e` and the offline fallback.
- Deployment uses `registry/deploy.sh`, which deploys a self-contained staging copy of `registry/` with the
  Netlify CLI.

## Consequences

- No server to operate on the day; health is one `curl` away (`/api/health` reports `storage: "netlify-database"`).
- SQL gives us the "seen in the last 2 minutes" query and the upsert directly.
- The registry is a dependency for **discovery only**. Nodes that already know each other keep working without
  it, and the local registry is a drop-in replacement.
- The registry has no authentication. It stores only names and LAN URLs, which is acceptable for a training
  event; it must not store anything else.

## Alternatives considered

- **Multicast / mDNS discovery on the LAN.** Often blocked on venue and corporate Wi-Fi; rejected.
- **A key-value blob store.** No query for "peers seen recently" without reading everything; rejected.
- **The trainer's laptop as registry.** Kept as the fallback (`registry:local`), not as the default.
