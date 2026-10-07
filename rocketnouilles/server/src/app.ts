import express from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createPspApp } from "../../psp/src/app";
import type { NodeContext } from "./context";
import { apiRoutes } from "./routes/api-routes";
import { peerRoutes } from "./routes/peer-routes";
import { renderSheet } from "./sheet/render-sheet";

export interface AppPaths {
  menuDir: string;
  webDir: string;
}

export function createNodeApp(ctx: NodeContext, paths: AppPaths, options: { embeddedPsp: boolean }) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.use("/api", apiRoutes(ctx));
  app.use("/peer", peerRoutes(ctx));
  if (options.embeddedPsp) app.use("/psp", createPspApp());

  app.get("/sheet", (_req, res) => {
    const { state } = ctx.store;
    res.type("html").send(
      renderSheet({ menu: ctx.menu, table: state.table, orders: Object.values(state.orders), closure: state.closure }),
    );
  });

  app.use("/menu", express.static(paths.menuDir, { maxAge: "1h" }));

  if (existsSync(join(paths.webDir, "index.html"))) {
    app.use(express.static(paths.webDir));
  } else {
    app.get("/", (_req, res) => {
      res.type("text").send("The web UI is not built yet. Run `npm run build`, then restart this node.");
    });
  }
  return app;
}
