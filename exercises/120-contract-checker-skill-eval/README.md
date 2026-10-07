# Contract checker skill eval — starter

Exercise 2 (Contract Checker Skill Eval), reused in Exercise 4a. The instructions are on the slides.

You do not code a harness. You write **one prompt**, `/eval-skill`, that makes Claude Code run the eval of
`.claude/skills/issue-contract-checker/`: headless `claude -p` runs on fixed cases, one git worktree per run,
WITH vs WITHOUT the skill, graded against ground truth you write first.

| File | What to do |
| --- | --- |
| `cases.json` | 5 `main` cases and 5 `hard` cases. Fill every `expected` that is `null` **before the first run** |
| `prompt-template.md` | skeleton of the eval prompt; copy it to `.claude/skills/eval-skill/SKILL.md` and write it |
| `results/` | written by `/eval-skill` (gitignored): `<run-id>/summary.md`, `summary.json`, `transcripts/` |

## Case format

```jsonc
{
  "id": "example-web-severity",       // an example, not one of the cases
  "set": "main",                       // main | hard
  "prompt": "Is the contract in sync?",// what the agent under test receives
  "ask_verdict": true,                 // append verdict_instructions (the CONTRACT_VERDICT line) to the prompt
  "should_activate": true,             // should the skill load for this prompt?
  "mutations": [                       // literal find/replace in the fixture, every occurrence, must match
    { "file": "apps/web/src/domain/entities/Issue.ts", "find": "'CRITICAL'", "replace": "'URGENT'" }
  ],
  "expected": {                        // ground truth: you fill it
    "checker_exit": 1,                 // exit code of check-contract.mjs on the fixture (0 aligned, 1 drift)
    "aligned": false,
    "drift": [
      { "enum": "IssueSeverity",
        "files": [["apps/web/src/domain/entities/Issue.ts"]],  // acceptable file sets (one or more)
        "values": ["CRITICAL", "URGENT"] }                     // missing + extra values, as a set
    ]
  }
}
```

Unrelated cases (`should_activate: false`) expect no verdict line and an answer that mentions `must_mention`.

## Run

```bash
unset ANTHROPIC_API_KEY                 # runs use your Claude Code login
claude                                  # from the repo root
> /eval-skill conditions=with,without repeats=1
```

Headless (CI, scripts): `claude -p "/eval-skill conditions=with,without repeats=1"`. Without anyone to answer
permission prompts, the tools the eval needs must be pre-approved in the `allowed-tools` of your prompt.

Every run starts from the committed `HEAD`, without the `exercises/` folder: uncommitted work is not part
of the fixtures. Afterwards `git worktree list` must show only your own checkouts.
