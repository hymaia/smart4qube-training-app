import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";

export const ROOT = resolve(import.meta.dirname, "../..");

export interface Proc {
  label: string;
  child: ChildProcess;
  stop(): Promise<void>;
}

/** Runs a TypeScript entry point with tsx, prefixing its output with a label. */
export function runTs(label: string, script: string, args: string[] = [], env: Record<string, string> = {}): Proc {
  const child = spawn(process.execPath, ["--import", "tsx", resolve(ROOT, script), ...args], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const prefix = (chunk: Buffer) =>
    chunk
      .toString()
      .split("\n")
      .filter(Boolean)
      .forEach((line) => console.log(`  [${label}] ${line}`));
  child.stdout?.on("data", prefix);
  child.stderr?.on("data", prefix);
  return {
    label,
    child,
    stop: () =>
      new Promise((done) => {
        if (child.exitCode !== null) return done();
        child.once("exit", () => done());
        child.kill("SIGTERM");
        setTimeout(() => child.kill("SIGKILL"), 5000).unref();
      }),
  };
}

export async function waitFor<T>(label: string, probe: () => Promise<T | undefined | false>, timeoutMs = 20_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const value = await probe();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? ` (last error: ${String(lastError)})` : ""}`);
}

export async function waitForHttp(url: string, timeoutMs = 20_000): Promise<void> {
  await waitFor(url, async () => (await fetch(url)).ok, timeoutMs);
}
