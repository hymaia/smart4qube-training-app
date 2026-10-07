import { PEER_TTL_MS } from "./tables";
import type { RegistryRequest, RegistryResponse, RegistryStore } from "./types";

const NAME_PATTERN = /^[\p{L}\p{N} _.-]{1,32}$/u;

const json = (status: number, body: unknown): RegistryResponse => ({ status, body });
const notFound = (message: string) => json(404, { error: "not_found", message });
const badRequest = (message: string) => json(400, { error: "bad_request", message });

/**
 * Framework-agnostic registry API. Both the Netlify Function and the local
 * Express server translate their requests into a RegistryRequest and call this.
 */
export async function handleRegistryRequest(
  store: RegistryStore,
  req: RegistryRequest,
  now: Date = new Date(),
): Promise<RegistryResponse> {
  const segments = req.path.replace(/^\/+|\/+$/g, "").split("/").map(decodeURIComponent);
  if (segments[0] !== "api") return notFound("Unknown route");
  const [, resource, code, sub, name] = segments;
  const method = req.method.toUpperCase();

  if (resource === "health" && segments.length === 2 && method === "GET") {
    return json(200, { ok: true, service: "rocket-nouilles-registry", storage: store.kind, time: now.toISOString() });
  }
  if (resource !== "tables") return notFound("Unknown route");

  if (segments.length === 2 && method === "GET") {
    return json(200, { tables: await store.listTables() });
  }

  const table = code ? await store.findTable(code.toUpperCase()) : undefined;
  if (!table) return notFound(`Unknown table "${code}"`);
  if (sub !== "peers") return notFound("Unknown route");

  if (segments.length === 4 && method === "GET") {
    return json(200, { table, peers: await listActivePeers(store, table.code, now) });
  }
  if (segments.length === 4 && method === "POST") {
    const peer = parsePeer(req.body);
    if (typeof peer === "string") return badRequest(peer);
    await store.upsertPeer(table.code, peer, now);
    return json(200, { table, peers: await listActivePeers(store, table.code, now) });
  }
  if (segments.length === 5 && method === "DELETE" && name) {
    const removed = await store.removePeer(table.code, name);
    return json(removed ? 200 : 404, { table, removed });
  }
  return json(405, { error: "method_not_allowed", message: `${method} not supported on ${req.path}` });
}

function listActivePeers(store: RegistryStore, tableCode: string, now: Date) {
  return store.listPeers(tableCode, new Date(now.getTime() - PEER_TTL_MS));
}

function parsePeer(body: unknown): { name: string; url: string } | string {
  if (!body || typeof body !== "object") return "Body must be a JSON object { name, url }";
  const { name, url } = body as Record<string, unknown>;
  if (typeof name !== "string" || !NAME_PATTERN.test(name.trim())) {
    return "name must be 1-32 letters, digits, spaces, dots, dashes or underscores";
  }
  if (typeof url !== "string" || !isHttpUrl(url)) return "url must be an absolute http(s) URL";
  return { name: name.trim(), url: url.replace(/\/+$/, "") };
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
