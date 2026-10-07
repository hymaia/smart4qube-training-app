# Exercises

Starter files for the advanced exercises. The instructions are on the slides.

| Folder | Exercise | Contents |
|---|---|---|
| [`110-agent-sdk-reviewer/`](110-agent-sdk-reviewer/) | Exercise 1 — Agent SDK Code Reviewer | TypeScript starter (`src/reviewer.ts`) and validation tests |
| [`120-contract-checker-skill-eval/`](120-contract-checker-skill-eval/) | Exercise 2 — Contract Checker Skill Eval (reused in Exercise 4a) | `cases.json` (fill the ground truth) and `prompt-template.md` for the `/eval-skill` prompt; no code |
| [`140-checkpoint-loop-invoice/`](140-checkpoint-loop-invoice/) | Exercise 4b — Checkpoint Loop: Invoices | `loop-prompt.md` (feature brief + plan/loop instructions), `PROGRESS.md` (empty plan, filled by the agent), `agents/` (implementer, reviewer) |
| [`060-rocketnouilles-kb-retrieval/`](060-rocketnouilles-kb-retrieval/) | Exercise 5 — RocketNouilles Knowledge Base Retrieval | `knowledge-base/`: the documents to index with QMD |

`110-agent-sdk-reviewer/` is a standalone npm package (not in the root workspaces): run `npm install` inside it.
`node_modules/` and every `results/` folder are gitignored.
