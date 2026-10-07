import { NetlifyDbRegistryStore } from "../../src/db-store";
import { handleRegistryRequest } from "../../src/handlers";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  "access-control-allow-headers": "content-type",
};

let store: NetlifyDbRegistryStore | undefined;

export default async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });

  let body: unknown;
  if (req.method === "POST") {
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "bad_request", message: "Invalid JSON body" }, { status: 400, headers: CORS_HEADERS });
    }
  }

  try {
    store ??= new NetlifyDbRegistryStore();
    const result = await handleRegistryRequest(store, { method: req.method, path: new URL(req.url).pathname, body });
    return Response.json(result.body, { status: result.status, headers: CORS_HEADERS });
  } catch (error) {
    console.error("registry error", error);
    return Response.json({ error: "internal", message: "Registry storage unavailable" }, { status: 500, headers: CORS_HEADERS });
  }
};

export const config = { path: "/api/*" };
