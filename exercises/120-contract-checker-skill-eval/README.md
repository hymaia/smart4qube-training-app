# Contract checker skill eval — starter

Exercise 2 (Contract Checker Skill Eval). The instructions are on the slides.

Eval harness for `.claude/skills/issue-contract-checker/` in this Smart4Qube repo.
It runs headless Claude Code on fixed cases, WITHOUT vs WITH the skill, one git worktree per run.
Every run starts from the repo's committed `HEAD`, without the `exercises/` folder.

From the Smart4Qube root:

```bash
cd exercises/120-contract-checker-skill-eval
npm install
npm run check                                   # typecheck
npm run skill-eval -- --dry-run --repeats 1     # fixtures only, no agent
npm run skill-eval -- --repeats 1               # real runs
```

Results are written to `results/` in this folder (gitignored).

## Layout

| File | Status |
| --- | --- |
| `cases/main.json` | prompts and fixture mutations given; **TODO** ground truth (`expect: null`) for the drift cases |
| `cases/hard.json` | harder cases with ground truth, for the bonus and Exercise 4a |
| `src/worktree.ts` | worktree creation and fixture commit given; **TODO** self-check, conditions, scope check, removal |
| `src/claude.ts` | spawns `claude -p ... --output-format stream-json --verbose`; **TODO** cost guards, isolation, permissions |
| `src/transcript.ts` | stream-json parsing and verdict extraction given; **TODO** tool calls, activation, checker run, usage |
| `src/grade.ts` | **TODO** independent grading |
| `src/run-eval.ts` | CLI, spend estimate, reports; **TODO** parallel workers |
| `src/report.ts`, `src/compare.ts`, `src/gate.ts` | given: tables, side-by-side comparison, pass/fail gate (used in Exercise 4a) |

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `--repo` | this repo (`../..`) | Smart4Qube checkout (committed `HEAD` is used) |
| `--cases` | `cases/main.json` | case file, repeatable |
| `--only` | all | comma-separated case ids |
| `--conditions` | `without,with` | |
| `--repeats` | `2` | runs per case and condition |
| `--model` | `haiku` | model of the evaluated agent |
| `--max-turns` / `--max-budget-usd` | `15` / `0.50` | per-run guards |
| `--max-total-usd` | `5` | refuse to start above this estimate |
| `--concurrency` | `4` | parallel runs |
| `--out` | `results` | results directory, relative to where you run npm |
| `--skill-md` | committed | SKILL.md injected in the WITH condition |
| `--skill-version` | `v1` | label in the results |
| `--dry-run` | off | prepare and self-check fixtures without calling Claude |
| `--keep-worktrees` | off | keep run worktrees for debugging (remove them afterwards) |
| `--gate-max-tool-calls` | off | print the Exercise 4a gate and exit 1 on failure |

`unset ANTHROPIC_API_KEY` first: runs use your Claude Code login.
