import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** True when the module at `moduleUrl` is the script Node was started with. */
export function isMain(moduleUrl: string): boolean {
  return Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(moduleUrl);
}
