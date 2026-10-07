# PROGRESS.md — Invoices (RocketNouilles)

> Owned by the orchestrator (main session). Subagents read it, never write it.
> Updated after every step: plan, implementer report, checks, reviewer verdict, human gate.

## Goal

The feature brief is in `loop-prompt.md`. Done when: every checkpoint is `accepted`; `npm test`,
`npm run typecheck`, `npm run build`, `npm run e2e` pass; both invoices were tried by the human on a local node;
`git diff --stat origin/day-2 -- server/src/promo` is empty.

Limits: max 2 fix rounds per checkpoint, then escalate to the human.

## Plan

Filled by the orchestrator in Phase 1. Approved by the human: **no**

| # | Outcome | Likely files | Acceptance check | Human gate | Status | Rounds |
|---|---|---|---|---|---|---|
| CP1 | | | | | todo | 0 |

Status: `todo` → `implementing` → `in review` → `fixing` → `awaiting human` → `accepted` (or `escalated`).

## Decisions

Assumptions made by the orchestrator, answers given by the human.

- (none yet)

## Open findings

Blocking:
- (none)

Non-blocking (carried into later briefs when relevant, or out of scope):
- (none)

## Log

| # | Checkpoint | Who | Result / evidence |
|---|---|---|---|

## Next step

Phase 1: explore the code and fill the Plan, then stop for approval.
