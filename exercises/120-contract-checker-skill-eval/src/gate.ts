// Pass/fail gate over the WITH condition of an eval summary (used by the /goal exercise).
//
//   node src/gate.ts results/<run>/summary.json [--max-mean-tool-calls 2.5]
// or directly at the end of an eval:  run-eval.ts ... --gate-max-tool-calls 2.5
import { readFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import type { Summary } from "./report.ts";

export function evaluateGate(summary: Summary, maxMeanToolCalls: number): { pass: boolean; lines: string[] } {
  const runs = summary.runs.filter((r) => r.condition === "with");
  const ids = (rs: Summary["runs"]) => rs.map((r) => r.runId).join(", ");
  const meanTools = runs.reduce((a, r) => a + r.metrics.toolCalls, 0) / Math.max(runs.length, 1);
  const checks: Array<[string, boolean, string]> = [
    ["WITH runs present", runs.length > 0, `${runs.length} runs`],
    ["no run errors", runs.every((r) => !r.error && !r.metrics.isError), ids(runs.filter((r) => r.error || r.metrics.isError))],
    ["100% correct verdicts", runs.every((r) => r.grade.correct), ids(runs.filter((r) => !r.grade.correct))],
    ["activation as expected (contract cases: yes, unrelated: no)", runs.every((r) => r.activationOk === true), ids(runs.filter((r) => r.activationOk !== true))],
    ["100% verdict format", runs.every((r) => r.grade.formatOk), ids(runs.filter((r) => !r.grade.formatOk))],
    ["100% scope respected", runs.every((r) => r.scope.ok), ids(runs.filter((r) => !r.scope.ok))],
    [`mean tool calls <= ${maxMeanToolCalls}`, meanTools <= maxMeanToolCalls, `mean ${meanTools.toFixed(2)}`],
  ];
  const lines = checks.map(([name, ok, detail]) => `${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  const pass = checks.every(([, ok]) => ok);
  lines.push(pass ? "GATE PASS" : "GATE FAIL");
  return { pass, lines };
}

const isMain = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  const { values: args, positionals } = parseArgs({
    allowPositionals: true,
    options: { "max-mean-tool-calls": { type: "string", default: "2.5" } },
  });
  const summary = JSON.parse(await readFile(positionals[0], "utf8")) as Summary;
  const { pass, lines } = evaluateGate(summary, Number(args["max-mean-tool-calls"]));
  console.log(lines.join("\n"));
  process.exit(pass ? 0 : 1);
}
