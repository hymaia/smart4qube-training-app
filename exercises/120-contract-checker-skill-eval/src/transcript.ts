import type { ReportedDrift, TranscriptMetrics, Verdict } from "./types.ts";

export const SKILL_NAME = "issue-contract-checker";
const VERDICT_LINE = /^[`*\s>]*CONTRACT_VERDICT:\s*(\{.*\})[`*\s]*$/gm;

type Json = Record<string, unknown>;

/** One JSON event per line (`claude -p --output-format stream-json --verbose`). */
export function parseStreamJson(jsonl: string): Json[] {
  const events: Json[] = [];
  for (const line of jsonl.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line) as Json);
    } catch {
      // ignore non-JSON noise
    }
  }
  return events;
}

function asRecord(value: unknown): Json | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : undefined;
}

/**
 * All tool_use blocks emitted by the main agent.
 *
 * TODO: open one transcript (results/<run>/transcripts/*.jsonl) and find where tool calls live.
 * Hint: events with `type: "assistant"` carry `message.content[]`; a tool call is a block with
 * `type: "tool_use"`, a `name` ("Skill", "Bash", "Read"...) and an `input` object.
 */
export function toolUses(events: Json[]): Array<{ name: string; input: Json }> {
  void events;
  return [];
}

/** Extracts the last `CONTRACT_VERDICT: {...}` line of the final answer. Provided. */
export function extractVerdict(text: string): { verdict: Verdict | null; count: number } {
  const matches = [...text.matchAll(VERDICT_LINE)];
  const last = matches.at(-1)?.[1];
  if (!last) return { verdict: null, count: 0 };
  try {
    const raw = JSON.parse(last) as Json;
    const drift = Array.isArray(raw.drift) ? raw.drift : [];
    const toStrings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
    return {
      count: matches.length,
      verdict: {
        aligned: raw.aligned === true,
        drift: drift.flatMap((item): ReportedDrift[] => {
          const d = asRecord(item);
          if (!d || typeof d.enum !== "string") return [];
          return [{ enum: d.enum, file: typeof d.file === "string" ? d.file : "", missing: toStrings(d.missing), extra: toStrings(d.extra) }];
        }),
      },
    };
  } catch {
    return { verdict: null, count: matches.length };
  }
}

export function collectMetrics(jsonl: string): TranscriptMetrics {
  const events = parseStreamJson(jsonl);
  const uses = toolUses(events);
  const result = [...events].reverse().find((e) => e.type === "result");

  const toolNames: Record<string, number> = {};
  for (const u of uses) toolNames[u.name] = (toolNames[u.name] ?? 0) + 1;

  // TODO (activation): true when the agent called the Skill tool with input.skill === SKILL_NAME.
  const skillActivated = false;
  // TODO (adherence): true when a Bash call ran the checker (`check-contract.mjs` or `npm run contract:check`).
  const scriptInvoked = false;

  const finalText = typeof result?.result === "string" ? result.result : "";
  const { verdict, count } = extractVerdict(finalText);

  // TODO (efficiency/cost): read `num_turns`, `total_cost_usd` and `usage` (input_tokens, output_tokens,
  // cache_creation_input_tokens, cache_read_input_tokens) from the final `result` event.
  const inputTokens = 0;
  const outputTokens = 0;
  const cacheCreationInputTokens = 0;
  const cacheReadInputTokens = 0;

  return {
    skillActivated,
    scriptInvoked,
    toolCalls: uses.length,
    toolNames,
    numTurns: 0,
    inputTokens,
    outputTokens,
    cacheCreationInputTokens,
    cacheReadInputTokens,
    totalTokens: inputTokens + outputTokens + cacheCreationInputTokens + cacheReadInputTokens,
    costUsd: 0,
    resultSubtype: typeof result?.subtype === "string" ? result.subtype : "missing",
    isError: result ? result.is_error === true : true,
    permissionDenials: Array.isArray(result?.permission_denials) ? result.permission_denials.length : 0,
    finalText,
    verdict,
    verdictLineCount: count,
  };
}

export function sessionIdOf(jsonl: string): string | null {
  const init = parseStreamJson(jsonl).find((e) => e.type === "system" && e.subtype === "init");
  return typeof init?.session_id === "string" ? init.session_id : null;
}
