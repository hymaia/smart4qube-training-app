// Skill eval harness: runs headless Claude Code on fixed cases, WITHOUT vs WITH the
// issue-contract-checker skill, each run in its own git worktree, in parallel.
//
//   node src/run-eval.ts [--repo <Smart4Qube root>] [--repeats 2] [--model haiku] [--dry-run]
import { access, mkdir, mkdtemp, readFile, realpath, rmdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { runClaude } from "./claude.ts";
import { evaluateGate } from "./gate.ts";
import { grade } from "./grade.ts";
import { summarize, toMarkdown } from "./report.ts";
import { collectMetrics, sessionIdOf } from "./transcript.ts";
import type { Condition, EvalCase, RunResult } from "./types.ts";
import { checkScope, git, leftoverWorktrees, prepareWorktree, removeWorktree } from "./worktree.ts";

/** Rough per-run cost used for the spend estimate printed before anything runs. Measured on the reference runs. */
const ESTIMATED_COST_PER_RUN: Record<string, number> = { haiku: 0.05, sonnet: 0.15, opus: 0.35 };

export const VERDICT_INSTRUCTIONS = `

When you are done, end your reply with exactly one line of this form (single line, valid JSON):
CONTRACT_VERDICT: {"aligned": <true|false>, "drift": [{"enum": "<IssueType|IssueSeverity|IssueStatus>", "file": "<repo-relative path>", "missing": ["<value in contracts/openapi.yaml but not in that file>"], "extra": ["<value in that file but not in contracts/openapi.yaml>"]}]}
Use "drift": [] when everything is aligned. Report one entry per enum and file that differs.`;

const { values: args } = parseArgs({
  options: {
    repo: { type: "string" },
    ref: { type: "string", default: "HEAD" },
    cases: { type: "string", multiple: true },
    only: { type: "string" },
    conditions: { type: "string", default: "without,with" },
    repeats: { type: "string", default: "2" },
    model: { type: "string", default: "haiku" },
    "max-turns": { type: "string", default: "15" },
    "max-budget-usd": { type: "string", default: "0.50" },
    "max-total-usd": { type: "string", default: "5" },
    concurrency: { type: "string", default: "4" },
    "timeout-sec": { type: "string", default: "600" },
    "skill-md": { type: "string" },
    "skill-version": { type: "string", default: "v1" },
    out: { type: "string", default: "results" },
    "dry-run": { type: "boolean", default: false },
    "keep-worktrees": { type: "boolean", default: false },
    "gate-max-tool-calls": { type: "string" },
  },
});

// `npm --prefix <harness> run ...` changes the cwd: resolve user paths against where npm was invoked.
const base = process.env.INIT_CWD ?? process.cwd();
const fromBase = (p: string) => path.resolve(base, p);

async function main() {
  const repo = args.repo ? fromBase(args.repo) : await defaultRepo();
  const casesFiles = args.cases?.length
    ? args.cases.map(fromBase)
    : [path.join(import.meta.dirname, "..", "cases", "main.json")];
  let cases: EvalCase[] = [];
  for (const file of casesFiles) cases.push(...(JSON.parse(await readFile(file, "utf8")) as EvalCase[]));
  if (args.only) {
    const only = new Set(args.only.split(","));
    cases = cases.filter((c) => only.has(c.id));
  }
  const conditions = args.conditions.split(",") as Condition[];
  const repeats = Number(args.repeats);
  const concurrency = Number(args.concurrency);
  const model = args.model;
  const ref = await git(repo, "rev-parse", args.ref);

  const plan = cases.flatMap((c) =>
    conditions.flatMap((condition) =>
      Array.from({ length: repeats }, (_, i) => ({ evalCase: c, condition, repeat: i + 1 })),
    ),
  );

  const perRun = ESTIMATED_COST_PER_RUN[model] ?? ESTIMATED_COST_PER_RUN.sonnet;
  const estimate = args["dry-run"] ? 0 : plan.length * perRun;
  console.log(
    `${plan.length} runs (${cases.length} cases x ${conditions.length} conditions x ${repeats} repeats), ` +
      `model=${model}, concurrency=${concurrency}, max-turns=${args["max-turns"]}`,
  );
  console.log(
    `Estimated spend: ~$${estimate.toFixed(2)} (~$${perRun}/run); hard cap per run $${args["max-budget-usd"]}, ` +
      `worst case $${(plan.length * Number(args["max-budget-usd"])).toFixed(2)}`,
  );
  if (estimate > Number(args["max-total-usd"])) {
    throw new Error(`estimate above --max-total-usd ${args["max-total-usd"]}; lower --repeats or raise the limit`);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.resolve(fromBase(args.out), `${stamp}-${model}-${args["skill-version"]}`);
  await mkdir(path.join(outDir, "transcripts"), { recursive: true });
  const wtRoot = await realpath(await mkdtemp(path.join(os.tmpdir(), "s4q-skill-eval-")));

  const active = new Set<string>();
  const cleanup = async () => {
    if (args["keep-worktrees"]) return;
    for (const dir of [...active]) {
      await removeWorktree(repo, dir).catch(() => undefined);
      active.delete(dir);
    }
  };
  process.on("SIGINT", () => {
    console.error("\nInterrupted: removing worktrees...");
    void cleanup().then(() => process.exit(130));
  });

  const results: RunResult[] = [];
  let next = 0;
  const worker = async () => {
    while (next < plan.length) {
      const { evalCase, condition, repeat } = plan[next++];
      const runId = `${evalCase.id}__${condition}__r${repeat}`;
      const dir = path.join(wtRoot, runId);
      const transcriptPath = path.join(outDir, "transcripts", `${runId}.jsonl`);
      let result: RunResult;
      try {
        active.add(dir);
        const wt = await prepareWorktree({
          repo, ref, dir, evalCase, condition,
          skillMd: condition === "with" && args["skill-md"] ? fromBase(args["skill-md"]) : undefined,
        });
        let exitCode: number | null = 0;
        if (args["dry-run"]) {
          await writeFile(transcriptPath, "");
          console.log(`[dry-run] ${runId}: fixture ok\n${indent(wt.checkerOutput)}`);
        } else {
          const prompt = evalCase.prompt + (evalCase.askVerdict ? VERDICT_INSTRUCTIONS : "");
          exitCode = await runClaude({
            cwd: dir, prompt, model, transcriptPath,
            maxTurns: Number(args["max-turns"]),
            maxBudgetUsd: Number(args["max-budget-usd"]),
            timeoutSec: Number(args["timeout-sec"]),
          });
        }
        const jsonl = await readFile(transcriptPath, "utf8");
        const metrics = collectMetrics(jsonl);
        const scope = await checkScope(dir, wt.head);
        result = {
          runId, caseId: evalCase.id, condition, repeat, model,
          skillVersion: condition === "with" ? args["skill-version"] : "none",
          sessionId: sessionIdOf(jsonl), exitCode, transcriptPath: path.relative(outDir, transcriptPath),
          metrics, scope, grade: grade(evalCase, metrics),
          activationOk: condition === "with" ? metrics.skillActivated === evalCase.shouldActivate : null,
        };
      } catch (error) {
        result = failedRun(runId, evalCase, condition, repeat, model, transcriptPath, outDir, error);
      } finally {
        if (!args["keep-worktrees"]) {
          await removeWorktree(repo, dir).catch((e) => console.error(`cleanup ${dir}: ${e}`));
          active.delete(dir);
        }
      }
      results.push(result);
      if (!args["dry-run"]) {
        const m = result.metrics;
        console.log(
          `${result.grade.correct ? "PASS" : "FAIL"} ${runId}  skill=${m.skillActivated} script=${m.scriptInvoked} ` +
            `scope=${result.scope.ok} tools=${m.toolCalls} turns=${m.numTurns} $${m.costUsd.toFixed(4)}` +
            (result.grade.reasons.length ? `  (${result.grade.reasons.join("; ")})` : "") +
            (result.error ? `  ERROR ${result.error}` : ""),
        );
      }
    }
  };
  // TODO (parallelism): start `concurrency` workers at once (they share `next`) instead of one.
  await worker();

  await git(repo, "worktree", "prune");
  const leftovers = await leftoverWorktrees(repo, wtRoot);
  if (leftovers.length === 0) await rmdir(wtRoot).catch(() => undefined);
  results.sort((a, b) => a.runId.localeCompare(b.runId));
  const summary = summarize(results, {
    date: new Date().toISOString(),
    repoRef: ref,
    model,
    skillVersion: args["skill-version"],
    skillMd: args["skill-md"] ?? "committed SKILL.md",
    cases: casesFiles.map((f) => path.basename(f)),
    conditions,
    repeats,
    maxTurns: Number(args["max-turns"]),
    claudeVersion: await claudeVersion(),
    dryRun: args["dry-run"],
    leftoverWorktrees: leftovers.length,
  });
  await writeFile(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
  await writeFile(path.join(outDir, "summary.md"), toMarkdown(summary));
  console.log("\n" + toMarkdown(summary));
  console.log(`Results: ${outDir}`);
  console.log(`Leftover eval worktrees: ${leftovers.length}${leftovers.length ? ` ${leftovers.join(", ")}` : ""}`);

  if (args["gate-max-tool-calls"]) {
    const gate = evaluateGate(summary, Number(args["gate-max-tool-calls"]));
    console.log("\n" + gate.lines.join("\n"));
    process.exitCode = gate.pass ? 0 : 1;
  }
}

function failedRun(
  runId: string, evalCase: EvalCase, condition: Condition, repeat: number, model: string,
  transcriptPath: string, outDir: string, error: unknown,
): RunResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    runId, caseId: evalCase.id, condition, repeat, model, skillVersion: "unknown", sessionId: null, exitCode: null,
    transcriptPath: path.relative(outDir, transcriptPath),
    metrics: collectMetrics(""),
    scope: { ok: false, changedFiles: [], headMoved: false },
    grade: { correct: false, formatOk: false, reasons: ["run failed"] },
    activationOk: null,
    error: message,
  };
}

/** Default --repo: the Smart4Qube repo that contains this harness (exercises/120-contract-checker-skill-eval/src/). */
async function defaultRepo(): Promise<string> {
  const root = path.resolve(import.meta.dirname, "..", "..", "..");
  try {
    await access(path.join(root, "contracts", "openapi.yaml"));
    return root;
  } catch {
    throw new Error("--repo <path to your Smart4Qube checkout> is required when the harness is not inside it");
  }
}

const indent = (s: string) => s.trim().split("\n").map((l) => `    ${l}`).join("\n");

async function claudeVersion(): Promise<string> {
  const { execFile } = await import("node:child_process");
  return new Promise((resolve) => execFile("claude", ["--version"], (_e, out) => resolve(String(out).trim())));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
