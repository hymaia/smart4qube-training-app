# RocketNouilles

Peer-to-peer group ordering app for the restaurant Happy Nouilles. Standalone package: run every command
from this folder (`rocketnouilles/`), not from the Smart4Qube repo root.

## Commands
- `npm install`
- `npm test` — vitest unit tests
- `npm run typecheck` — server + web
- `npm run build` — typecheck, then build the UI into `dist/web`
- `npm run e2e` — local registry + NoodlePay + several nodes, full order flow
- `npm run dev` — local registry, NoodlePay and one node on :4001
- `npm run node -- --name <Name> --table RAMEN|UDON|SOBA [--port 4001] [--registry <url>|none]`

## Layout
- `server/src/` — peer node: `routes/`, `orders/` (DRAFT → PAID → CONFIRMED), `protocol/` (sync, merge, close
  rules), `promo/`, `pricing/`, `sheet/`, `state/` (JSON file per node in `data/`), `infra/`
- `web/` — React + Vite UI
- `shared/` — types, menu schema, money formatting
- `psp/` — NoodlePay mock payment provider
- `registry/` — Netlify Functions + Netlify Database registry (deployed); `local-server.ts` for offline use
- `public/menu/` — real menu (`menu.json`) and photos
- `docs/PROTOCOL.md`, `docs/ARCHITECTURE.md`

## Rules
- Money is in integer cents.
- Run `npm test` and `npm run typecheck` after changes; run `npm run e2e` after protocol or order changes.
- Never deploy the registry (`registry/deploy.sh`, `netlify deploy`) without the trainer.
