import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";

/** Tools the agent may use without a prompt. Edits are allowed on purpose: the scope check must be able to fail. */
export const ALLOWED_TOOLS = [
  "Read",
  "Grep",
  "Glob",
  "Skill",
  "Bash(npm run contract:check)",
  "Bash(node *)",
  "Bash(cat *)",
  "Bash(grep *)",
  "Bash(ls *)",
  "Bash(find *)",
  "Bash(git status*)",
  "Bash(git diff*)",
  "Bash(git log*)",
];

export type ClaudeRunOptions = {
  cwd: string;
  prompt: string;
  model: string;
  maxTurns: number;
  maxBudgetUsd: number;
  timeoutSec: number;
  transcriptPath: string;
};

export function claudeArgs(o: ClaudeRunOptions): string[] {
  return [
    "-p", o.prompt,
    "--output-format", "stream-json",
    "--verbose",
    "--model", o.model,
    // TODO (cost guard): bound each run with --max-turns and --max-budget-usd (o.maxTurns, o.maxBudgetUsd).
    // TODO (isolation): load project settings only (--setting-sources project,local) so personal
    //   hooks, plugins and skills do not leak into the eval; do not persist sessions.
    // TODO (permissions): nobody answers prompts in a headless run. Pre-allow ALLOWED_TOOLS,
    //   accept edits (the scope check must be able to fail) and deny everything else
    //   (--permission-mode, --permission-prompts none, --allowedTools ...ALLOWED_TOOLS).
  ];
}

/** Runs one headless Claude Code session; stream-json events are written to `transcriptPath`. */
export function runClaude(o: ClaudeRunOptions): Promise<number | null> {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY; // use the subscription login, like participants do
  return new Promise((resolve, reject) => {
    const child = spawn("claude", claudeArgs(o), { cwd: o.cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    const out = createWriteStream(o.transcriptPath);
    child.stdout.pipe(out);
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    const timer = setTimeout(() => child.kill("SIGTERM"), o.timeoutSec * 1000);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      out.end(() => {
        if (code !== 0 && stderr.trim()) process.stderr.write(`[claude stderr] ${stderr.trim().slice(0, 500)}\n`);
        resolve(code);
      });
    });
  });
}
