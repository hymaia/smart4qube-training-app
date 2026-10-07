// Side-by-side comparison of several eval summaries (e.g. WITHOUT vs v1 vs v2), one condition each.
//
//   node src/compare.ts v1=results/a/summary.json:with v2=results/b/summary.json:with [--out compare.md]
// Also re-renders a single summary:  node src/compare.ts --render results/a/summary.json
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { summarize, toMarkdown, type Row, type Summary } from "./report.ts";
import type { Condition } from "./types.ts";

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: { out: { type: "string" }, render: { type: "string" } },
});
const base = process.env.INIT_CWD ?? process.cwd();

if (args.render) {
  const file = path.resolve(base, args.render);
  const old = JSON.parse(await readFile(file, "utf8")) as Summary;
  const fresh = summarize(old.runs, old.meta);
  await writeFile(file, JSON.stringify(fresh, null, 2) + "\n");
  await writeFile(file.replace(/\.json$/, ".md"), toMarkdown(fresh));
  console.log(`re-rendered ${file}`);
  process.exit(0);
}

type Column = { label: string; rows: Row[]; total: Row | undefined; cost: number };
const columns: Column[] = [];
for (const spec of positionals) {
  const [label, rest] = spec.split("=");
  const [file, condition = "with"] = rest.split(":");
  const s = JSON.parse(await readFile(path.resolve(base, file), "utf8")) as Summary;
  const fresh = summarize(s.runs.filter((r) => r.condition === (condition as Condition)), s.meta);
  columns.push({ label, rows: fresh.rows, total: fresh.totals[0], cost: fresh.totalCostUsd });
}

const pct = (x: number | null | undefined) => (x === null || x === undefined ? "n/a" : `${Math.round(x * 100)}%`);
const metrics: Array<[string, (r: Row) => string]> = [
  ["correct", (r) => pct(r.correctRate)],
  ["format", (r) => pct(r.formatRate)],
  ["activation ok", (r) => (r.activationOkRate === null ? `act ${pct(r.activationRate)}` : pct(r.activationOkRate))],
  ["scope", (r) => pct(r.scopeRate)],
  ["tools", (r) => r.meanToolCalls.toFixed(1)],
  ["tokens", (r) => String(Math.round(r.meanTokens))],
  ["cost", (r) => `$${r.meanCostUsd.toFixed(4)}`],
];

const caseIds = [...new Set(columns.flatMap((c) => c.rows.map((r) => r.caseId)))];
const lines: string[] = [];
lines.push(`| Case | Metric | ${columns.map((c) => c.label).join(" | ")} |`);
lines.push(`|---|---|${columns.map(() => "---:").join("|")}|`);
for (const id of [...caseIds, "ALL"]) {
  for (const [name, fmt] of metrics) {
    const cells = columns.map((c) => {
      const r = id === "ALL" ? c.total : c.rows.find((x) => x.caseId === id);
      return r ? fmt(r) : "-";
    });
    lines.push(`| ${id === "ALL" ? "**ALL**" : id} | ${name} | ${cells.join(" | ")} |`);
  }
}
lines.push("");
lines.push(`Spend: ${columns.map((c) => `${c.label} $${c.cost.toFixed(4)}`).join(", ")}`);
const md = lines.join("\n") + "\n";
if (args.out) await writeFile(path.resolve(base, args.out), md);
console.log(md);
