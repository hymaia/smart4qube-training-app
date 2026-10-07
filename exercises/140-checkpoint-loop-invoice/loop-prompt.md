# Loop prompt (paste into a Claude Code session started in `rocketnouilles/`)

You are the ORCHESTRATOR of a checkpoint loop. You do not write feature code yourself: you plan, delegate to the
`implementer` and `reviewer` subagents (`.claude/agents/`), run the checks yourself, and keep `PROGRESS.md` up to
date after EVERY step. `PROGRESS.md` is the loop's memory: someone must be able to resume the loop from it alone.

## Feature brief

Invoices for RocketNouilles (read `CLAUDE.md` and `docs/ARCHITECTURE.md` first):

- A participant downloads a **PDF invoice for their own order** from their node's UI, once the order is `PAID` or
  `CONFIRMED`.
- Once the table is **closed**, anyone at the table downloads **one group invoice PDF** for the whole table.
- Each invoice shows: seller name and address from `menu.json` → `restaurant` + SIRET **509 490 355 00013**;
  an invoice number unique and sequential per node, stable on re-download; date; table; participant(s);
  lines with options and quantities; promo discount lines; VAT breakdown and totals HT / TVA / TTC.

Constraints (decided by the human):

- Totals are what the order says (`order.pricing`, frozen at payment). Never recompute promos.
- Menu prices are TTC. VAT is 10 % on everything (no alcohol on the menu); compute the breakdown per rate.
  Money in integer cents: HT + TVA = TTC exactly.
- Do not touch `server/src/promo`: its bugs are out of scope. Report them as non-blocking findings.
- Manual checks and probes on LOCAL nodes only: `DATA_DIR="$(mktemp -d)" npm run dev`, or `npm run node` with
  `--registry http://localhost:4800` (or `--registry none`) and a scratch `--data-dir`. Never the deployed
  registry, never `npm run e2e -- --registry <url>`.

## Phase 1 — Plan, then STOP

1. Read the code you need to plan (read-only).
2. Split the feature into **small checkpoints that can be verified on their own** (typically 4 to 6). For each:
   the outcome, the files likely touched, an **acceptance check** (a test, a command or a probe that proves it),
   and whether it needs a **human gate** (user-visible or risky). Every checkpoint leaves all checks green.
   The plan must cover the individual invoice, the group invoice, the UI buttons and `npm run e2e`.
3. Write the plan in the `Plan` table of `PROGRESS.md`, and your assumptions in `Decisions`.
4. **STOP.** Show me the plan and wait. I answer `approved` or give changes.

## Phase 2 — The loop, one checkpoint at a time

For the first checkpoint that is not `accepted`:

1. **Implement** — Launch a FRESH `implementer` with: the checkpoint, its acceptance check, the constraints,
   the open findings relevant to it, and "implement only this checkpoint". Status `implementing`.
2. **Check** — Run YOURSELF: `npm test`, `npm run typecheck`, `npm run build`, plus `npm run e2e` and the
   checkpoint's acceptance check when relevant. Log the real results. A failing check is a blocking finding (step 4).
3. **Review** — Launch a FRESH `reviewer` with the checkpoint, its acceptance check and the implementer's report.
   Status `in review`. Copy its findings into `Open findings`.
4. **Fix** — Verdict FAIL or a failing check: resume the SAME implementer with the blocking findings verbatim,
   status `fixing`, Rounds + 1, back to step 2 (a fresh reviewer re-reviews). Still failing after **2 fix rounds**:
   status `escalated`, STOP and ask me.
5. **Advance** — Verdict PASS:
   - Human gate on this checkpoint: status `awaiting human`, STOP and tell me what changed (`git diff --stat`),
     the evidence, the non-blocking findings and exactly what to try on a local node. `approved` → `accepted`;
     anything else → my answer becomes blocking findings (step 4).
   - No human gate: `accepted`.
   On `accepted`, commit with message `CPn: <outcome>`.
6. **Record** — Update the Plan status, add a Log row, and write the `Next step` line.

## End — final human gate

When every checkpoint is accepted: run `npm test`, `npm run typecheck`, `npm run build`, `npm run e2e` and
`git diff --stat origin/day-2 -- server/src/promo` (must be empty), log the results, then STOP and ask me for the
final acceptance, with the exact steps to try both invoices in the browser on a local node.

Rules: one checkpoint at a time; never let a subagent start the next one; never mark anything done without
evidence you ran or read yourself.
