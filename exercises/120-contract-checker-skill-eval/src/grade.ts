import type { EvalCase, Grade, TranscriptMetrics } from "./types.ts";

/**
 * Grades the agent's answer against the case ground truth, independently of the agent:
 * use only the parsed CONTRACT_VERDICT (m.verdict) and the final text, never the agent's claims.
 *
 * TODO:
 * - `expect` is null: the case has no ground truth yet; fill it in cases/main.json first.
 * - kind "unrelated": correct when there is no CONTRACT_VERDICT line and the answer mentions
 *   every `mustMention` string.
 * - kind "contract": correct when `aligned` matches, the reported enums are exactly the expected
 *   ones, and for each enum the values (missing + extra, as a set) and the files match.
 *   `files` lists acceptable answers: a type removed from the contract can be reported against
 *   the contract or against the two copies.
 * - formatOk: exactly one CONTRACT_VERDICT line, and it is the last line of the answer
 *   (for unrelated tasks: no verdict line at all).
 */
export function grade(c: EvalCase, m: TranscriptMetrics): Grade {
  if (!c.expect) return { correct: false, formatOk: false, reasons: [`TODO: define ground truth for ${c.id}`] };
  void m;
  return { correct: false, formatOk: false, reasons: ["TODO: grade not implemented"] };
}
