import express from "express";
import { isMain } from "../shared/is-main";
import type { Server } from "node:http";
import { handleRegistryRequest } from "./src/handlers";
import { MemoryRegistryStore } from "./src/memory-store";
import type { RegistryStore } from "./src/types";

/** Express twin of the Netlify Function, backed by memory. Used offline and in tests. */
export function createLocalRegistryApp(store: RegistryStore = new MemoryRegistryStore()) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    res.set("access-control-allow-origin", "*");
    res.set("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
    res.set("access-control-allow-headers", "content-type");
    if (req.method === "OPTIONS") return void res.sendStatus(204);
    next();
  });
  app.use("/api", async (req, res) => {
    const result = await handleRegistryRequest(store, { method: req.method, path: req.originalUrl.split("?")[0], body: req.body });
    res.status(result.status).json(result.body);
  });
  return app;
}

export function startLocalRegistry(port: number): Promise<Server> {
  return new Promise((resolve) => {
    const server = createLocalRegistryApp().listen(port, () => resolve(server));
  });
}

if (isMain(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4800);
  await startLocalRegistry(port);
  console.log(`[registry] local in-memory registry on http://localhost:${port}/api/health`);
}
