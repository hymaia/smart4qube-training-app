import type { Condition, RunResult } from "./types.ts";

export type Row = {
  caseId: string;
  condition: Condition;
  runs: number;
  /** Skill tool called with issue-contract-checker. */
  activationRate: number;
  /** Activation matched the case expectation (WITH only; null for WITHOUT). */
  activationOkRate: number | null;
  /** Checker script (or `npm run contract:check`) run through Bash. */
  scriptRate: number;
  correctRate: number;
  formatRate: number;
  scopeRate: number;
  meanToolCalls: number;
  meanTurns: number;
  meanTokens: number;
  meanCostUsd: number;
  totalCostUsd: number;
  errors: number;
};

export type Summary = {
  meta: Record<string, unknown>;
  rows: Row[];
  totals: Row[];
  totalCostUsd: number;
  runs: RunResult[];
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const rate = (xs: boolean[]) => mean(xs.map((x) => (x ? 1 : 0)));

function row(caseId: string, condition: Condition, runs: RunResult[]): Row {
  return {
    caseId,
    condition,
    runs: runs.length,
    activationRate: rate(runs.map((r) => r.metrics.skillActivated)),
    activationOkRate: runs.some((r) => r.activationOk !== null)
      ? rate(runs.filter((r) => r.activationOk !== null).map((r) => r.activationOk === true))
      : null,
    scriptRate: rate(runs.map((r) => r.metrics.scriptInvoked)),
    correctRate: rate(runs.map((r) => r.grade.correct)),
    formatRate: rate(runs.map((r) => r.grade.formatOk)),
    scopeRate: rate(runs.map((r) => r.scope.ok)),
    meanToolCalls: mean(runs.map((r) => r.metrics.toolCalls)),
    meanTurns: mean(runs.map((r) => r.metrics.numTurns)),
    meanTokens: mean(runs.map((r) => r.metrics.totalTokens)),
    meanCostUsd: mean(runs.map((r) => r.metrics.costUsd)),
    totalCostUsd: runs.reduce((a, r) => a + r.metrics.costUsd, 0),
    errors: runs.filter((r) => r.error || r.metrics.isError).length,
  };
}

export function summarize(runs: RunResult[], meta: Record<string, unknown>): Summary {
  const caseIds = [...new Set(runs.map((r) => r.caseId))];
  const conditions = [...new Set(runs.map((r) => r.condition))];
  const rows = caseIds.flatMap((id) =>
    conditions.flatMap((c) => {
      const subset = runs.filter((r) => r.caseId === id && r.condition === c);
      return subset.length ? [row(id, c, subset)] : [];
    }),
  );
  const totals = conditions.map((c) => row("ALL", c, runs.filter((r) => r.condition === c)));
  return { meta, rows, totals, totalCostUsd: runs.reduce((a, r) => a + r.metrics.costUsd, 0), runs };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const f1 = (x: number) => x.toFixed(1);

export function toMarkdown(s: Summary): string {
  const header =
    "| Case | Condition | Runs | Skill activated | Activation as expected | Checker cmd run | Correct verdict | Format OK | Scope OK | Tool calls | Turns | Tokens | Cost (USD) |\n" +
    "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n";
  const line = (r: Row) =>
    `| ${r.caseId} | ${r.condition.toUpperCase()} | ${r.runs} | ${pct(r.activationRate)} | ` +
    `${r.activationOkRate === null ? "n/a" : pct(r.activationOkRate)} | ${pct(r.scriptRate)} | ` +
    `${pct(r.correctRate)} | ${pct(r.formatRate)} | ${pct(r.scopeRate)} | ${f1(r.meanToolCalls)} | ${f1(r.meanTurns)} | ` +
    `${Math.round(r.meanTokens)} | ${r.meanCostUsd.toFixed(4)} |`;
  const failures = s.runs
    .filter((r) => !r.grade.correct || !r.scope.ok || r.error)
    .map(
      (r) =>
        `- \`${r.runId}\`: ${[
          ...r.grade.reasons,
          ...(r.scope.ok ? [] : [`scope: changed ${r.scope.changedFiles.join(", ") || "HEAD"}`]),
          ...(r.error ? [`error: ${r.error}`] : []),
        ].join("; ")}`,
    );
  const meta = Object.entries(s.meta)
    .map(([k, v]) => `- ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join("\n");
  return [
    "# Skill eval: issue-contract-checker",
    "",
    meta,
    "",
    "## Per case (means over repeats)",
    "",
    header + s.rows.map(line).join("\n"),
    "",
    "## Per condition",
    "",
    header + s.totals.map(line).join("\n"),
    "",
    `Total estimated spend: $${s.totalCostUsd.toFixed(4)} (total_cost_usd from the result events; ` +
      "with a subscription login this is an API-price estimate, not a bill).",
    "",
    "## Failures",
    "",
    failures.length ? failures.join("\n") : "None.",
    "",
  ].join("\n");
}
