import type { Server } from "node:http";
import { join } from "node:path";
import { createNodeApp } from "./app";
import type { NodeConfig } from "./config";
import type { NodeContext } from "./context";
import { PspClient } from "./infra/psp-client";
import { RegistryClient } from "./infra/registry-client";
import { loadMenu } from "./menu/loader";
import { OrderService } from "./orders/order-service";
import { PeerSync } from "./protocol/peer-sync";
import { NodeStore } from "./state/node-store";

export interface RunningNode {
  url: string;
  context: NodeContext;
  stop(): Promise<void>;
}

/** Wires a peer node together and starts serving. */
export async function startNode(config: NodeConfig): Promise<RunningNode> {
  const menu = await loadMenu(join(config.menuDir, "menu.json"));
  const registry = config.registryUrl ? new RegistryClient(config.registryUrl) : null;
  const tableInfo = await resolveTable(registry, config.table);

  const me = { name: config.name, url: config.publicUrl };
  const store = await NodeStore.open(join(config.dataDir, `${config.table}-${safeFileName(config.name)}.json`), {
    table: tableInfo,
    me,
    orders: {},
    closure: null,
    knownPeers: {},
  });

  const clock = () => new Date();
  const sync = new PeerSync(store, registry);
  const psp = new PspClient(config.pspUrl ?? `http://localhost:${config.port}/psp`);
  const orders = new OrderService(store, menu, psp, (order) => void sync.broadcastOrder(order), clock);
  const context: NodeContext = { store, menu, orders, sync, clock };

  const app = createNodeApp(context, { menuDir: config.menuDir, webDir: config.webDir }, { embeddedPsp: !config.pspUrl });
  const server = await listen(app, config.port);
  await orders.init();
  await sync.start();

  return {
    url: config.publicUrl,
    context,
    async stop() {
      await sync.stop();
      await new Promise((resolve) => server.close(resolve));
      server.closeAllConnections();
    },
  };
}

async function resolveTable(registry: RegistryClient | null, code: string) {
  if (!registry) return { code, name: code };
  let tables;
  try {
    tables = await registry.listTables();
  } catch (error) {
    console.warn(`[node] registry unreachable (${(error as Error).message}); continuing without table name`);
    return { code, name: code };
  }
  const table = tables.find((t) => t.code === code);
  if (!table) throw new Error(`Unknown table "${code}". Available: ${tables.map((t) => t.code).join(", ")}`);
  return table;
}

function listen(app: ReturnType<typeof createNodeApp>, port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => resolve(server));
    server.on("error", reject);
  });
}

function safeFileName(name: string): string {
  return name.replace(/[^\p{L}\p{N}_-]+/gu, "_");
}
