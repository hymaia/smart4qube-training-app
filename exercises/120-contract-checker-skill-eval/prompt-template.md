---
name: eval-skill
description: <one sentence: what this command evaluates and what it prints>
argument-hint: "[conditions=with,without] [repeats=1] [set=main] ..."
disable-model-invocation: true
allowed-tools: <the few tools the eval needs, e.g. Read, Write(<results dir>/**), Bash(bash <results dir>/*)>
---

<!--
Copy this file to .claude/skills/eval-skill/SKILL.md, then replace every comment with real instructions.
It runs as /eval-skill <arguments>; $ARGUMENTS holds the text after the command name.
The agent that runs it writes its own small scripts: your job is the specification, not the code.
-->

# Role

<!-- Who is the main session here? It operates the eval; it never answers contract questions itself
and never judges an answer by reading it. -->

# Inputs

<!-- Parse $ARGUMENTS. List every key with its default: conditions, repeats, which cases, the SKILL.md to
test, the model of the agent under test, per-run caps (--max-turns, --max-budget-usd), a total cost cap,
concurrency, gate thresholds. Say where cases.json is and what its fields mean. -->

# Procedure

<!-- Numbered phases: plan + cost estimate, one worktree per case x condition x repeat, apply the mutation,
self-check the fixture with the checker script, the WITH/WITHOUT difference, the exact `claude -p` command
(stream-json, --verbose, model, caps), how runs go in parallel, scope check, grading, cleanup. -->

# Isolation

<!-- What the agent under test must never see (exercises/, this prompt, the ground truth), where the worktrees
live, which settings load, what is allowed and denied in the runs, and the CLAUDE.md confound. -->

# Metrics

<!-- One precise definition per metric, computed from the transcript, never from the agent's claims:
activation, adherence, verdict correctness vs expected, format, scope, tool calls, turns, tokens, cost. -->

# Output format

<!-- Files to write in exercises/120-contract-checker-skill-eval/results/<run-id>/ (summary.md, summary.json,
transcripts/), the exact table columns WITH vs WITHOUT, and the last line: EVAL_GATE: PASS or EVAL_GATE: FAIL. -->

# Stop conditions

<!-- When to stop and clean up instead of continuing: missing ground truth, a fixture that does not match,
cost cap, runs that all fail. Plus what the session must never do (edit the skill, commit, retry to look good). -->
