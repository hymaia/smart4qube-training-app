import type { Server } from "node:http";
import { isMain } from "../shared/is-main";
import { createPspApp, type PspOptions } from "./src/app";

export function startPsp(port: number, options?: PspOptions): Promise<Server> {
  return new Promise((resolve) => {
    const server = createPspApp(options).listen(port, () => resolve(server));
  });
}

if (isMain(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4900);
  await startPsp(port);
  console.log(`[noodlepay] mock payment provider on http://localhost:${port}`);
}
