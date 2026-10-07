# 🚀🍜 RocketNouilles

Peer-to-peer group ordering for **Happy Nouilles** (95 Rue Beaubourg, 75003 Paris).

Each participant runs a small node on their laptop. Nodes of the same table find each other through a
registry, exchange their orders over HTTP, take a (fake) payment, and once everybody has confirmed, anyone
closes the table: every node then shows the same **group sheet** that is printed and taken to the restaurant.

> Payments are simulated by **NoodlePay** (`psp/`). No real money moves. The bill is settled at the restaurant.

## Quickstart (participant)

Requires Node 22.

```bash
npm install
npm run build
npm run node -- --name Alice --table RAMEN
```

Open <http://localhost:4001>. Tables: `RAMEN` (Ramen Rockets), `UDON` (Udon Orbiters), `SOBA` (Soba Satellites).

Then: pick dishes (choose the spice level), add a promo code if you have one, **Checkout** with a test card,
**Confirm** your order, and watch the **Table** tab. When everyone is confirmed, anyone can **Close the table**;
the group sheet is at <http://localhost:4001/sheet>.

Not eating? Use "Confirm without ordering" so you don't block the table.

### Options

| Flag | Env | Default |
|---|---|---|
| `--name` | `NODE_NAME` | required, unique at the table |
| `--table` | `TABLE` | required: `RAMEN`, `UDON` or `SOBA` |
| `--port` | `PORT` | `4001` |
| `--public-url` | `PUBLIC_URL` | `http://<your LAN IP>:<port>` — the URL other laptops use to reach you |
| `--registry` | `REGISTRY_URL` | `https://rocket-nouilles-registry.netlify.app` (`none` to disable) |
| `--psp` | `PSP_URL` | NoodlePay embedded in the node under `/psp` |
| `--data-dir` | `DATA_DIR` | `./data` — state is saved in `data/<TABLE>-<name>.json` |

Restarting a node with the same name and table restores its state from the JSON file.

### Test cards (any future expiry such as `12/30`, any CVC)

| Card | Result |
|---|---|
| `4242 4242 4242 4242` | succeeds |
| `4000 0000 0000 0002` | declined |
| `4000 0000 0000 9995` | insufficient funds |
| `4000 0000 0000 0119` | times out after ~15 s |

See [psp/README.md](psp/README.md).

## Trainer setup

- The registry is deployed on Netlify (`registry/`, site `rocket-nouilles-registry`, Netlify Database). Check it:
  `curl https://rocket-nouilles-registry.netlify.app/api/health`.
- All laptops must be on the same network and allow incoming connections on the node port.
  If auto-detection picks the wrong interface, pass `--public-url http://<ip>:<port>`.
- Each group uses one table code. When a table is closed, open `/sheet` on any node of that table and print it
  (the print stylesheet puts the kitchen tally on the first page).
- Redeploy the registry with `registry/deploy.sh` (Netlify CLI, logged in).

## Offline / local mode

No Internet? Run everything locally:

```bash
npm run registry:local    # in-memory registry on :4800
npm run psp               # NoodlePay on :4900 (optional, nodes embed one)
npm run node -- --name Alice --table RAMEN --port 4001 --registry http://<trainer-ip>:4800
```

`npm run dev` starts a local registry, NoodlePay and Alice@RAMEN on :4001 in one go, and prints the command to
add more nodes. `npm run dev:web` runs the Vite dev server (proxied to the node on `NODE_PORT`, default 4001).

## Scripts

| Script | What it does |
|---|---|
| `npm run build` | typecheck (server + web) and build the UI into `dist/web` |
| `npm test` | unit tests (vitest) |
| `npm run e2e` | starts a local registry, NoodlePay and 5 nodes, and plays a whole table end to end |
| `npm run e2e -- --registry <url>` | same, against a real registry |
| `npm run node` / `psp` / `registry:local` / `dev` | see above |

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — components and code layout
- [docs/PROTOCOL.md](docs/PROTOCOL.md) — how nodes talk to each other and to the registry
- [public/menu/CREDITS.md](public/menu/CREDITS.md) — where the menu and photos come from
