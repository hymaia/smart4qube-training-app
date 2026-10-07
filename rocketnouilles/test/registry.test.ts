import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createLocalRegistryApp } from "../registry/local-server";
import { handleRegistryRequest } from "../registry/src/handlers";
import { MemoryRegistryStore } from "../registry/src/memory-store";

const T0 = new Date("2026-10-07T12:00:00Z");
const later = (ms: number) => new Date(T0.getTime() + ms);

describe("registry handlers", () => {
  const store = new MemoryRegistryStore();
  const call = (method: string, path: string, body?: unknown, now = T0) => handleRegistryRequest(store, { method, path, body }, now);

  it("reports health", async () => {
    const res = await call("GET", "/api/health");
    expect(res).toMatchObject({ status: 200, body: { ok: true, storage: "memory" } });
  });

  it("lists the three seeded tables", async () => {
    const res = await call("GET", "/api/tables");
    expect((res.body as { tables: { code: string }[] }).tables.map((t) => t.code)).toEqual(["RAMEN", "UDON", "SOBA"]);
  });

  it("joins a table and returns its peers", async () => {
    const res = await call("POST", "/api/tables/RAMEN/peers", { name: "Alice", url: "http://10.0.0.1:4001/" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      table: { code: "RAMEN" },
      peers: [{ name: "Alice", url: "http://10.0.0.1:4001", lastSeenAt: T0.toISOString() }],
    });
  });

  it("heartbeats refresh lastSeenAt but keep joinedAt", async () => {
    await call("POST", "/api/tables/RAMEN/peers", { name: "Alice", url: "http://10.0.0.1:4001" }, later(30_000));
    const res = await call("GET", "/api/tables/ramen/peers", undefined, later(30_000));
    const [alice] = (res.body as { peers: { joinedAt: string; lastSeenAt: string }[] }).peers;
    expect(alice.joinedAt).toBe(T0.toISOString());
    expect(alice.lastSeenAt).toBe(later(30_000).toISOString());
  });

  it("forgets peers that stopped sending heartbeats", async () => {
    const res = await call("GET", "/api/tables/RAMEN/peers", undefined, later(10 * 60_000));
    expect((res.body as { peers: unknown[] }).peers).toEqual([]);
  });

  it("keeps tables separate", async () => {
    await call("POST", "/api/tables/UDON/peers", { name: "Eve", url: "http://10.0.0.5:4001" });
    const res = await call("GET", "/api/tables/RAMEN/peers");
    expect((res.body as { peers: { name: string }[] }).peers.map((p) => p.name)).toEqual(["Alice"]);
  });

  it("leaves a table", async () => {
    expect((await call("DELETE", "/api/tables/RAMEN/peers/Alice")).status).toBe(200);
    expect((await call("DELETE", "/api/tables/RAMEN/peers/Alice")).status).toBe(404);
  });

  it("validates input and routes", async () => {
    expect((await call("GET", "/api/tables/PIZZA/peers")).status).toBe(404);
    expect((await call("POST", "/api/tables/RAMEN/peers", { name: "", url: "http://x" })).status).toBe(400);
    expect((await call("POST", "/api/tables/RAMEN/peers", { name: "Bob", url: "ftp://x" })).status).toBe(400);
    expect((await call("PUT", "/api/tables/RAMEN/peers")).status).toBe(405);
    expect((await call("GET", "/nope")).status).toBe(404);
  });
});

describe("local registry server", () => {
  let base = "";
  let close = () => {};

  beforeAll(async () => {
    const server = createLocalRegistryApp().listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    base = `http://localhost:${(server.address() as AddressInfo).port}`;
    close = () => server.close();
  });
  afterAll(() => close());

  it("serves the same API over HTTP with CORS", async () => {
    const join = await fetch(`${base}/api/tables/SOBA/peers`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Zoé", url: "http://localhost:4009" }),
    });
    expect(join.status).toBe(200);
    expect(join.headers.get("access-control-allow-origin")).toBe("*");
    const list = await (await fetch(`${base}/api/tables/SOBA/peers`)).json();
    expect(list.peers.map((p: { name: string }) => p.name)).toEqual(["Zoé"]);
  });
});
