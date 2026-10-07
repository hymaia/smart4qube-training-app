/**
 * End-to-end run of a whole table, over real HTTP between real processes.
 *
 *   npm run e2e                                   # local registry (in memory)
 *   npm run e2e -- --registry https://rocket-nouilles-registry.netlify.app
 */
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { CARDS, NodeApi } from "./lib/node-api";
import { runTs, waitFor, waitForHttp, type Proc } from "./lib/processes";

const { values } = parseArgs({ args: process.argv.slice(2), options: { registry: { type: "string" } } });
const REGISTRY = values.registry ?? "http://localhost:4810";
const PSP = "http://localhost:4910";
const suffix = values.registry ? `-e2e${Date.now() % 10000}` : "";
const dataDir = await mkdtemp(join(tmpdir(), "rocketnouilles-e2e-"));
const procs = new Map<string, Proc>();

let step = 0;
const ok = (message: string) => console.log(`✔ ${++step}. ${message}`);

function startNode(name: string, table: string, port: number): NodeApi {
  const url = `http://localhost:${port}`;
  const args = ["--name", name, "--table", table, "--port", String(port), "--registry", REGISTRY, "--psp", PSP, "--public-url", url, "--data-dir", dataDir];
  procs.set(name, runTs(name, "server/src/cli.ts", args));
  return new NodeApi(name, url);
}

async function stopNode(name: string) {
  await procs.get(name)?.stop();
  procs.delete(name);
}

async function main() {
  if (!values.registry) procs.set("registry", runTs("registry", "registry/local-server.ts", [], { PORT: "4810" }));
  procs.set("psp", runTs("psp", "psp/server.ts", [], { PORT: "4910" }));
  await waitForHttp(`${REGISTRY}/api/health`);
  await waitForHttp(`${PSP}/health`);
  ok(`registry (${REGISTRY}) and NoodlePay are up`);

  const [alice, bob, carol] = [
    startNode(`Alice${suffix}`, "RAMEN", 4111),
    startNode(`Bob${suffix}`, "RAMEN", 4112),
    startNode(`Carol${suffix}`, "RAMEN", 4113),
  ];
  const eve = startNode(`Eve${suffix}`, "UDON", 4115);
  const ramen = [alice, bob, carol];
  for (const node of [...ramen, eve]) await waitForHttp(`${node.url}/api/state`, 30_000);
  for (const node of ramen) {
    await waitFor(`${node.name} to see 2 peers online`, async () => (await node.state()).peers.filter((p) => p.online).length === 2);
  }
  ok("3 RAMEN nodes and 1 UDON node running, RAMEN peers discovered each other");

  // --- Ordering -------------------------------------------------------------
  await alice.setLines([
    { itemId: "lamen-saute-boeuf", quantity: 1, options: { spice: "hot" } },
    { itemId: "nems-porc", quantity: 1 },
  ]);
  const alicePriced = (await alice.setPromoCodes(["bienvenue10"])).body;
  assert.equal(alicePriced.pricing.subtotalCents, 2050);
  assert.equal(alicePriced.pricing.totalCents, 1845);

  await bob.setLines([
    { itemId: "lamen-boeuf-epice", quantity: 1, options: { spice: "medium" } },
    { itemId: "raviolis-grilles", quantity: 1 },
    { itemId: "perles-coco", quantity: 1 },
    { itemId: "coca-cola-33", quantity: 1 },
  ]);
  const bobPriced = (await bob.setPromoCodes(["NOUILLES5"])).body;
  assert.equal(bobPriced.pricing.totalCents, 2590 - 500);

  await carol.setLines([
    { itemId: "tofu-mapo", quantity: 1 },
    { itemId: "riz-parfume", quantity: 2 },
  ]);
  const carolPriced = (await carol.setPromoCodes(["FIDELITE"])).body;
  assert.equal(carolPriced.pricing.totalCents, 1630 - 300);

  await eve.setLines([{ itemId: "bo-bun", quantity: 1 }]);
  ok("everyone filled a cart; BIENVENUE10, NOUILLES5 and FIDELITE priced correctly");

  await waitFor("Alice to see Bob's and Carol's carts", async () => {
    const view = await alice.state();
    return view.orders.filter((o) => o.lines.length > 0).length === 3;
  });
  ok("orders propagated between peers");

  // --- Payment --------------------------------------------------------------
  const declined = await bob.pay(CARDS.declined);
  assert.equal(declined.status, 402);
  assert.equal(declined.body.error, "card_declined");
  assert.equal((await bob.state()).myOrder.status, "DRAFT");
  ok("Bob's declined card is refused (402 card_declined), order stays DRAFT");

  for (const node of ramen) {
    const paid = await node.pay(CARDS.ok);
    assert.equal(paid.status, 200, `${node.name} payment: ${JSON.stringify(paid.body)}`);
    assert.equal(paid.body.status, "PAID");
  }
  assert.equal((await bob.state()).myOrder.payment?.amountCents, 2090);
  ok("all three paid with 4242 4242 4242 4242");

  assert.equal((await alice.setLines([])).status, 409);
  ok("a paid order can no longer be edited (409)");

  await alice.confirm();
  await bob.confirm();
  await waitFor("Alice to see Bob confirmed", async () =>
    (await alice.state()).orders.find((o) => o.participant === bob.name)?.status === "CONFIRMED",
  );
  const early = await alice.close();
  assert.equal(early.status, 409);
  assert.match(early.body.message ?? "", /Carol/);
  ok(`closing before everyone confirmed is rejected: "${early.body.message}"`);

  // --- Late joiner ----------------------------------------------------------
  const dave = startNode(`Dave${suffix}`, "RAMEN", 4114);
  await waitForHttp(`${dave.url}/api/state`, 30_000);
  await waitFor("Dave to catch up with the 3 existing orders", async () => {
    const view = await dave.state();
    return view.orders.filter((o) => o.status !== "DRAFT").length === 3;
  });
  ok("late joiner Dave caught up with everyone's orders");

  // --- Offline peer ---------------------------------------------------------
  await carol.confirm();
  await waitFor("Alice to see Carol confirmed", async () =>
    (await alice.state()).orders.find((o) => o.participant === carol.name)?.status === "CONFIRMED",
  );
  await stopNode(carol.name);
  await waitFor("Alice to mark Carol offline", async () =>
    (await alice.state()).peers.some((p) => p.name === carol.name && !p.online),
  );
  ok("Carol confirmed then went offline; Alice shows her offline");

  const waitingForDave = await alice.close();
  assert.equal(waitingForDave.status, 409);
  assert.match(waitingForDave.body.message ?? "", /Dave/);
  assert.equal((await dave.confirm()).status, 200);
  await waitFor("Alice to see Dave's empty order confirmed", async () => (await alice.state()).canClose);
  ok("Dave (online, empty cart) blocks the close until he confirms he orders nothing");

  const closed = await alice.close();
  assert.equal(closed.status, 200, JSON.stringify(closed.body));
  for (const node of [bob, dave]) {
    await waitFor(`${node.name} to see the table closed`, async () => (await node.state()).closure !== null);
  }
  assert.equal((await bob.setLines([{ itemId: "nems-porc", quantity: 1 }])).status, 409);
  ok("Alice closed the table while Carol was offline; Bob and Dave switched to CLOSED");

  startNode(carol.name, "RAMEN", 4113);
  await waitForHttp(`${carol.url}/api/state`, 30_000);
  await waitFor("Carol to learn about the closure after restart", async () => (await carol.state()).closure !== null);
  ok("Carol came back (state restored from her JSON file) and caught up with the closure");

  // --- Group sheet ----------------------------------------------------------
  const sheets = await Promise.all([alice, bob, carol, dave].map((n) => n.sheet()));
  sheets.forEach((sheet, i) => assert.equal(sheet, sheets[0], `sheet of node #${i} differs`));
  const sheet = sheets[0];
  assert.match(sheet, /Closed on/);
  assert.match(sheet, /Table total paid: <strong>52,65/);
  for (const [qty, dish] of [[1, "Lamen sauté au bœuf"], [2, "Riz parfumé"], [1, "Nêms au porc"], [1, "Coca cola 33cl"]] as const) {
    assert.ok(sheet.includes(`<td class="qty">${qty}×</td><td>${dish}`), `kitchen tally has ${qty}× ${dish}`);
  }
  assert.match(sheet, /For the kitchen — 9 items/);
  assert.match(sheet, /spice: hot/);
  assert.match(sheet, /<strong>peanut<\/strong>|<strong>gluten<\/strong>/);
  ok("the 4 RAMEN nodes render byte-identical sheets: totals 52,65 €, kitchen tally of 9 items, allergens");

  // --- Other table ----------------------------------------------------------
  const eveView = await eve.state();
  assert.equal(eveView.closure, null);
  assert.deepEqual(eveView.orders.map((o) => o.participant), [eve.name]);
  assert.equal(eveView.peers.length, 0);
  assert.match(await eve.sheet(), /Preview/);
  ok("UDON table is unaffected (still open, sees only its own participant)");
}

try {
  await main();
  console.log("\nE2E PASSED");
} catch (error) {
  console.error("\nE2E FAILED:", error);
  process.exitCode = 1;
} finally {
  await Promise.all([...procs.values()].map((p) => p.stop()));
  await rm(dataDir, { recursive: true, force: true });
}
