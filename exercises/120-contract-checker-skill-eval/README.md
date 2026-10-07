# Contract checker skill eval

Exercise 2 (reused in Exercise 4a).

## Goal

Find out whether the `issue-contract-checker` skill actually helps. Don't trust your gut: have Claude measure it.

## Task

Ask Claude Code to evaluate the skill in `.claude/skills/issue-contract-checker/`. Write the prompt yourself.
There is no harness, no case file and no template.

Think about what you want to know, then say it:

- what to compare (the agent with the skill vs without it)
- how to know the right answer (break an enum on purpose, so you know the drift in advance)
- what to measure (is the drift found? how many tool calls and tokens?)
- what the agent under test must not be allowed to see or change

Read the report and decide if the skill is worth keeping.

## Success criteria

- The right answer is known before the agent runs, not taken from the agent's own claims.
- WITH and WITHOUT the skill are compared on the same broken fixture.
- Your repo is left clean: no stray worktrees (`git worktree list`), no edits to the skill.

## Bonus

Check that the skill stays quiet on a question that has nothing to do with enum drift.
