export type Condition = "without" | "with";

/** A literal text replacement applied to the fixture before the agent starts. */
export type Mutation = { file: string; find: string; replace: string };

/** Expected drift for one enum. `files` lists acceptable answers (any one set, compared exactly). */
export type ExpectedDrift = { enum: string; files: string[][]; values: string[] };

export type Expectation =
  | { kind: "contract"; aligned: boolean; drift: ExpectedDrift[] }
  | { kind: "unrelated"; mustMention: string[] };

export type EvalCase = {
  id: string;
  description: string;
  prompt: string;
  /** Should the skill activate when it is available? */
  shouldActivate: boolean;
  /** Append the CONTRACT_VERDICT format request to the prompt. */
  askVerdict: boolean;
  mutations: Mutation[];
  /** Exit code `check-contract.mjs` must return on the mutated fixture (fixture self-check). */
  checkerExit: 0 | 1;
  /** Ground truth; null until you define it (TODO in cases/main.json). */
  expect: Expectation | null;
};

export type ReportedDrift = { enum: string; file: string; missing: string[]; extra: string[] };
export type Verdict = { aligned: boolean; drift: ReportedDrift[] };

export type TranscriptMetrics = {
  skillActivated: boolean;
  scriptInvoked: boolean;
  toolCalls: number;
  toolNames: Record<string, number>;
  numTurns: number;
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  totalTokens: number;
  costUsd: number;
  resultSubtype: string;
  isError: boolean;
  permissionDenials: number;
  finalText: string;
  verdict: Verdict | null;
  verdictLineCount: number;
};

export type ScopeCheck = { ok: boolean; changedFiles: string[]; headMoved: boolean };

/** `formatOk`: exactly one CONTRACT_VERDICT line, last line of the answer (none for unrelated tasks). */
export type Grade = { correct: boolean; formatOk: boolean; reasons: string[] };

export type RunResult = {
  runId: string;
  caseId: string;
  condition: Condition;
  repeat: number;
  model: string;
  skillVersion: string;
  sessionId: string | null;
  exitCode: number | null;
  transcriptPath: string;
  metrics: TranscriptMetrics;
  scope: ScopeCheck;
  grade: Grade;
  /** Activation matched expectation (only meaningful in the WITH condition). */
  activationOk: boolean | null;
  error?: string;
};
