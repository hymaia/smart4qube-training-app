# PROGRESS.md — Invoice story (RocketNouilles)

> Owned by the orchestrator (main session). Subagents read it, never write it.
> Update it after every step: implementer report, checks, reviewer verdict, human gate.

## Story

As a participant, I can download a PDF invoice for my own paid order, and once the table is closed,
anyone at the table can download a group invoice for the whole table.

Story acceptance (checked at the end, on the whole story):
- [ ] `npm test`, `npm run typecheck`, `npm run build`, `npm run e2e` pass
- [ ] Individual invoice PDF: valid PDF, totals match the order (checked with `pdftotext`)
- [ ] Group invoice PDF: only after close, totals match the sum of the orders
- [ ] Both downloads work from the UI (checked in a browser)
- [ ] Promo engine untouched (`git diff --stat server/src/promo` is empty)

## Assumptions (decided by the human, not by the agents)

- Prices in `menu.json` are TTC (VAT included).
- One VAT rate: 10 % for food AND for soft drinks served (restaurant sale, on-site/takeaway). No alcohol on the menu.
- The invoice renders whatever the order says (pricing frozen at payment). The promo engine is out of scope.
- <add yours>

## Loop limits

- Max fix rounds per checkpoint: 2 (then escalate to the human)
- Human gate after: CP2, CP3, CP4, CP5 (<adjust>)

## Checkpoints

| # | Outcome | Status | Rounds | Human gate |
|---|---|---|---|---|
| CP1 | Invoice data + per-node numbering | todo | 0 | — |
| CP2 | VAT and totals computation (pure, tested) | todo | 0 | todo |
| CP3 | Individual invoice PDF endpoint | todo | 0 | todo |
| CP4 | "Download my invoice" button in the UI | todo | 0 | todo |
| CP5 | Group invoice after close (API + UI + e2e) | todo | 0 | todo |

Status values: `todo` → `implementing` → `in review` → `fixing` → `awaiting human` → `accepted` (or `escalated`).

## Current checkpoint: CPn

Criteria:
- [ ] ...

Evidence (commands actually run by the orchestrator, with the key result):
- `npm test` → ...

Blocking findings:
- (none)

Non-blocking findings (kept for later / out of scope):
- (none)

## Log

| Step | Checkpoint | Who | Result |
|---|---|---|---|
| 1 | CP1 | implementer | ... |

## Next step

<one line: what the orchestrator does next>
