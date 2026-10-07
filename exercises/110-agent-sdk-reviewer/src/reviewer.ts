/**
 * Smart4Qube agent reviewer (starter).
 *
 * Reviews RocketNouilles code with the Claude Agent SDK and posts line-anchored
 * findings to the Smart4Qube API. Complete every TODO (search for "TODO").
 *
 *   npm run review -- [--repo <path>] [--scope <dir>|.] [--model <id>] [--max-turns <n>] [--budget <usd>]
 *
 * Env: SMART4QUBE_API_URL (default http://localhost:3001), ROCKETNOUILLES_DIR.
 * Progress goes to stderr; the final JSON summary goes to stdout.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import {
  createSdkMcpServer,
  query,
  tool,
  type Options,
  type SDKResultMessage,
} from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Rule catalog (provided). Smart4Qube rule keys must match ^S\d+$.
// ---------------------------------------------------------------------------

export const RULES = {
  S100: { name: 'money-arithmetic', description: 'Wrong money math: cents/euros mix-up, float rounding, negative or > 100 % discounts, totals that do not add up.' },
  S200: { name: 'input-validation', description: 'Untrusted input (codes, quantities, amounts, ids) accepted without bounds or type checks.' },
  S300: { name: 'concurrency-consistency', description: 'Order of operations, double application, stale state, last-writer-wins or idempotency problems.' },
  S400: { name: 'security', description: 'Exploitable behaviour: payouts via negative amounts, privilege or ownership bypass, injection.' },
  S500: { name: 'error-handling', description: 'Swallowed errors, wrong fallbacks, missing failure paths.' },
} as const;
export type RuleId = keyof typeof RULES;
const RULE_IDS = Object.keys(RULES) as [RuleId, ...RuleId[]];

export const PROJECT_ID = 'rocketnouilles';
export const SERVER_NAME = 'smart4qube';
// In-process MCP tools are exposed to the model as mcp__<server>__<tool>.
export const POST_FINDING = `mcp__${SERVER_NAME}__post_finding`;
export const LIST_FINDINGS = `mcp__${SERVER_NAME}__list_findings`;
const READ_ONLY_TOOLS = ['Read', 'Grep', 'Glob'] as const;

// ---------------------------------------------------------------------------
// Smart4Qube API client (provided) — see contracts/openapi.yaml in Smart4Qube.
// ---------------------------------------------------------------------------

export interface Issue {
  id: string;
  filePath: string;
  line: number;
  type: string;
  severity: string | null;
  rule: string | null;
  message: string;
}

const apiUrl = () => (process.env.SMART4QUBE_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');

export async function fetchIssues(file?: string): Promise<Issue[]> {
  const qs = file ? `?file=${encodeURIComponent(file)}` : '';
  const res = await fetch(`${apiUrl()}/issues/${PROJECT_ID}${qs}`);
  if (!res.ok) throw new Error(`GET /issues/${PROJECT_ID} failed: HTTP ${res.status} ${await res.text()}`);
  return (await res.json()) as Issue[];
}

export async function createIssue(body: Record<string, unknown>): Promise<Issue> {
  const res = await fetch(`${apiUrl()}/issues/${PROJECT_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status !== 201) throw new Error(`POST /issues/${PROJECT_ID} failed: HTTP ${res.status} ${await res.text()}`);
  return (await res.json()) as Issue;
}

// Duplicate detection (provided): same file + same rule + line within +/- 3.
export const DUPLICATE_LINE_WINDOW = 3;
export function findDuplicate(existing: Issue[], f: { filePath: string; line: number; rule: string }): Issue | undefined {
  return existing.find(
    (i) => i.filePath === f.filePath && i.rule === f.rule && Math.abs(i.line - f.line) <= DUPLICATE_LINE_WINDOW,
  );
}

// ---------------------------------------------------------------------------
// Finding validation, called by post_finding before anything is posted.
// ---------------------------------------------------------------------------

export interface FindingInput {
  filePath: string;
  line: number;
  snippet: string;
  rule: string;
}

/**
 * TODO 2 — check a finding against the real file. Return null when it is valid, otherwise a
 * precise error message: post_finding returns it to the model, which should be able to fix its call
 * ("line 120 is outside engine.ts, which has 63 lines"; "the snippet appears on line 27").
 *  - filePath relative POSIX (no leading "/", no ".."), and the file exists under repoRoot
 *  - 1 <= line <= number of lines in the file
 *  - rule in RULES
 *  - snippet present on that line (if not, say on which line(s) it appears)
 * Helpers you may need are already imported: existsSync, readFileSync, statSync, path.
 */
export function validateFinding(repoRoot: string, f: FindingInput): string | null {
  void [repoRoot, f, existsSync, readFileSync, statSync];
  return null;
}

// ---------------------------------------------------------------------------
// Agent wiring
// ---------------------------------------------------------------------------

export interface RunStats {
  posted: Array<Pick<Issue, 'id' | 'filePath' | 'line' | 'rule' | 'severity' | 'type'>>;
  skippedDuplicates: Array<{ filePath: string; line: number; rule: string; existingId: string }>;
  rejected: Array<{ filePath: string; line: number; rule: string; reason: string }>;
}

const log = (...args: unknown[]) => console.error('[reviewer]', ...args);
const text = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });
const toolError = (t: string) => ({ ...text(t), isError: true });

export function buildOptions(cfg: { repoRoot: string; model?: string; maxTurns: number; budgetUsd: number }, stats: RunStats): Options {
  // TODO 1 — `list_findings`: optional `filePath` (zod), returns the existing issues
  // (fetchIssues) as compact JSON text. Mark it read-only with annotations.
  const listFindings = tool(
    'list_findings',
    'TODO: describe the tool for the model',
    { filePath: z.string().optional() },
    async () => text('TODO'),
  );

  // TODO 3 — `post_finding`: zod schema with filePath, line, snippet, type
  // (VULNERABILITY | QUALITY_GATE_VIOLATION), severity, rule (z.enum(RULE_IDS)) and message.
  // First validateFinding(cfg.repoRoot, input): on error, push to stats.rejected and return
  // toolError(...) with the reason so the model can retry. Then skip duplicates (findDuplicate on
  // fetchIssues(filePath)) and record them in stats; otherwise createIssue({ ..., status: 'OPEN' })
  // and record it in stats.posted.
  const postFinding = tool(
    'post_finding',
    'TODO: describe the tool for the model',
    { filePath: z.string(), line: z.number().int(), rule: z.enum(RULE_IDS) },
    async () => text('TODO'),
  );
  void toolError;

  const server = createSdkMcpServer({ name: SERVER_NAME, version: '1.0.0', tools: [listFindings, postFinding] });

  // TODO 4 — complete the options:
  //  cwd = repoRoot, model, systemPrompt (use SYSTEM_PROMPT), built-in tools limited to READ_ONLY_TOOLS,
  //  allowedTools (read-only tools + both MCP tools), mcpServers, permissionMode: 'dontAsk',
  //  settingSources: [] (do not load your own settings/CLAUDE.md), maxTurns, maxBudgetUsd.
  //  No hook: read-only access comes from `tools`, `allowedTools` and `permissionMode`.
  void server;
  return {
    cwd: cfg.repoRoot,
  };
}

// TODO 5 — write the reviewer's system prompt: role, read-only, the rule catalog (from RULES),
// method (list_findings first, read every file in scope, justify each defect with a concrete input,
// anchor on the faulty line, copy a snippet, retry once when post_finding returns an error), type/severity guidance, message format.
const SYSTEM_PROMPT = `TODO`;

export function buildPrompt(scope: string): string {
  const target = scope === '.' ? 'the whole repository (server/, shared/, psp/, registry/; skip public/ assets and node_modules)' : `the files under ${scope}/`;
  return `Review ${target} of the RocketNouilles repository and post every confirmed defect to Smart4Qube.`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export interface Summary {
  project: string;
  scope: string;
  model: string | null;
  outcome: string;
  findingsPosted: RunStats['posted'];
  skippedDuplicates: RunStats['skippedDuplicates'];
  rejectedFindings: RunStats['rejected'];
  turns: number | null;
  costUsd: number | null;
  usage: Record<string, number> | null;
  modelUsage: SDKResultMessage['modelUsage'] | null;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      repo: { type: 'string' },
      scope: { type: 'string', default: 'server/src/promo' },
      model: { type: 'string', default: 'sonnet' }, // 'opus' digs deeper, 'haiku' is cheapest
      'max-turns': { type: 'string', default: '60' },
      budget: { type: 'string', default: '3' },
    },
  });
  // Default: <Smart4Qube root>/rocketnouilles, resolved from this file (exercises/110-agent-sdk-reviewer/src/).
  const defaultRepo = path.resolve(import.meta.dirname, '../../../rocketnouilles');
  const repoRoot = path.resolve(values.repo ?? process.env.ROCKETNOUILLES_DIR ?? defaultRepo);
  const scope = values.scope!.replace(/\/+$/, '') || '.';
  if (!existsSync(path.join(repoRoot, scope))) throw new Error(`Scope ${scope} not found under ${repoRoot}`);
  await fetchIssues(); // fail fast if the API is down

  const stats: RunStats = { posted: [], skippedDuplicates: [], rejected: [] };
  const options = buildOptions(
    { repoRoot, model: values.model, maxTurns: Number(values['max-turns']), budgetUsd: Number(values.budget) },
    stats,
  );
  log(`repo=${repoRoot} scope=${scope} api=${apiUrl()} model=${values.model ?? '(default)'}`);

  // TODO 6 — iterate over query({ prompt: buildPrompt(scope), options }):
  //  log each tool_use block of assistant messages to stderr, remember the `init` system
  //  message's model and keep the final `result` message.
  let result: SDKResultMessage | undefined;
  let model: string | null = values.model ?? null;
  void query;

  // TODO 7 — fill the summary from stats and the result message
  // (subtype, num_turns, total_cost_usd, usage, modelUsage).
  const summary: Summary = {
    project: PROJECT_ID,
    scope,
    model,
    outcome: result?.subtype ?? 'no_result',
    findingsPosted: stats.posted,
    skippedDuplicates: stats.skippedDuplicates,
    rejectedFindings: stats.rejected,
    turns: null,
    costUsd: null,
    usage: null,
    modelUsage: null,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (result?.subtype !== 'success') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
