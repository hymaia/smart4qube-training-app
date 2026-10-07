/**
 * Convenience: local registry + NoodlePay + one node (Alice @ RAMEN), all offline.
 * Usage: npm run dev [-- --name Bob --table UDON --port 4002]
 */
import { parseArgs } from "node:util";
import { runTs, waitForHttp, type Proc } from "./lib/processes";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: { name: { type: "string" }, table: { type: "string" }, port: { type: "string" } },
});
const port = values.port ?? "4001";

const procs: Proc[] = [];
procs.push(runTs("registry", "registry/local-server.ts", [], { PORT: "4800" }));
procs.push(runTs("psp", "psp/server.ts", [], { PORT: "4900" }));
await waitForHttp("http://localhost:4800/api/health");
await waitForHttp("http://localhost:4900/health");

procs.push(
  runTs("node", "server/src/cli.ts", [
    "--name", values.name ?? "Alice",
    "--table", values.table ?? "RAMEN",
    "--port", port,
    "--registry", "http://localhost:4800",
    "--psp", "http://localhost:4900",
    "--public-url", `http://localhost:${port}`,
  ]),
);

console.log(`\nRocketNouilles dev: open http://localhost:${port} (Ctrl+C to stop)`);
console.log(`Add peers with: npm run node -- --name Bob --table RAMEN --port 4002 --registry http://localhost:4800 --psp http://localhost:4900 --public-url http://localhost:4002\n`);

const shutdown = async () => {
  await Promise.all(procs.map((p) => p.stop()));
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
