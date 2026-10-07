# Exercises

Starter files for the advanced exercises. The instructions are on the slides.

| Folder | Exercise | Contents |
|---|---|---|
| [`110-agent-sdk-reviewer/`](110-agent-sdk-reviewer/) | Exercise 1 — Agent SDK Code Reviewer | TypeScript starter (`src/reviewer.ts`) and validation tests |
| [`120-contract-checker-skill-eval/`](120-contract-checker-skill-eval/) | Exercise 2 — Contract Checker Skill Eval (reused in Exercise 4a) | Eval harness starter and cases |
| [`140-checkpoint-loop-invoice/`](140-checkpoint-loop-invoice/) | Exercise 4b — Checkpoint Loop: Invoices | `PROGRESS.md`, `agents/` (implementer, reviewer), `loop-prompt.md` |
| [`060-rocketnouilles-kb-retrieval/`](060-rocketnouilles-kb-retrieval/) | Exercise 5 — RocketNouilles Knowledge Base Retrieval | `knowledge-base/`: the documents to index with QMD |

The two code folders are standalone npm packages (not in the root workspaces): run `npm install` inside
each one. Their `node_modules/` and `results/` are gitignored.
