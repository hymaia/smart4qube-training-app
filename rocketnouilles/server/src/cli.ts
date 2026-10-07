import { readConfig } from "./config";
import { startNode } from "./node";

try {
  const config = readConfig(process.argv.slice(2), process.env);
  const node = await startNode(config);
  const { table, me } = node.context.store.state;
  console.log(`[node] ${me.name} @ ${table.name} (${table.code})`);
  console.log(`[node] UI:       http://localhost:${config.port}`);
  console.log(`[node] peers see me at ${me.url}`);
  console.log(`[node] registry: ${config.registryUrl ?? "none"} · payments: ${config.pspUrl ?? "embedded NoodlePay"}`);

  const shutdown = async () => {
    console.log("[node] leaving the table…");
    await node.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
} catch (error) {
  console.error(`[node] ${(error as Error).message}`);
  process.exit(1);
}
