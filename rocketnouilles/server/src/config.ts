import { networkInterfaces } from "node:os";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

export const DEFAULT_REGISTRY_URL = "https://rocket-nouilles-registry.netlify.app";

export interface NodeConfig {
  name: string;
  table: string;
  port: number;
  publicUrl: string;
  /** null = no registry: peers are only learned from incoming messages. */
  registryUrl: string | null;
  /** null = use the PSP embedded in this node under /psp. */
  pspUrl: string | null;
  dataDir: string;
  menuDir: string;
  webDir: string;
}

const ROOT = resolve(import.meta.dirname, "../..");

/** CLI flags win over environment variables, which win over defaults. */
export function readConfig(argv: string[], env: NodeJS.ProcessEnv): NodeConfig {
  const { values } = parseArgs({
    args: argv,
    options: {
      name: { type: "string" },
      table: { type: "string" },
      port: { type: "string" },
      "public-url": { type: "string" },
      registry: { type: "string" },
      psp: { type: "string" },
      "data-dir": { type: "string" },
    },
  });

  const name = (values.name ?? env.NODE_NAME ?? "").trim();
  const table = (values.table ?? env.TABLE ?? "").trim().toUpperCase();
  if (!name) throw new Error("Missing --name (or NODE_NAME)");
  if (!table) throw new Error("Missing --table (or TABLE), e.g. --table RAMEN");

  const port = Number(values.port ?? env.PORT ?? 4001);
  const registry = values.registry ?? env.REGISTRY_URL ?? DEFAULT_REGISTRY_URL;
  const psp = values.psp ?? env.PSP_URL;
  return {
    name,
    table,
    port,
    publicUrl: trimSlash(values["public-url"] ?? env.PUBLIC_URL ?? `http://${lanAddress()}:${port}`),
    registryUrl: registry === "none" ? null : trimSlash(registry),
    pspUrl: psp ? trimSlash(psp) : null,
    dataDir: resolve(values["data-dir"] ?? env.DATA_DIR ?? resolve(ROOT, "data")),
    menuDir: resolve(ROOT, "public/menu"),
    webDir: resolve(ROOT, "dist/web"),
  };
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/** First non-internal IPv4 address, so laptops on the same Wi-Fi can reach us. */
export function lanAddress(): string {
  for (const addresses of Object.values(networkInterfaces())) {
    const found = addresses?.find((a) => a.family === "IPv4" && !a.internal);
    if (found) return found.address;
  }
  return "localhost";
}
