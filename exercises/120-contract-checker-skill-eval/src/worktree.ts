import { execFile } from "node:child_process";
import { copyFile, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { Condition, EvalCase, ScopeCheck } from "./types.ts";

const exec = promisify(execFile);

export const SKILL_DIR = ".claude/skills/issue-contract-checker";
const CHECKER = `${SKILL_DIR}/scripts/check-contract.mjs`;

export async function git(cwd: string, ...args: string[]): Promise<string> {
  return (await gitRaw(cwd, ...args)).trim();
}

export async function gitRaw(cwd: string, ...args: string[]): Promise<string> {
  const { stdout } = await exec("git", ["-C", cwd, ...args], { maxBuffer: 16 * 1024 * 1024 });
  return stdout;
}

/** Serialises git operations that touch the shared repository (worktree add/remove, commits). */
let queue: Promise<unknown> = Promise.resolve();
export function serial<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}

export type PreparedWorktree = { dir: string; head: string; checkerOutput: string };

/**
 * Creates an isolated, detached worktree for one run and commits the fixture state in it,
 * so that `git status` after the run shows only what the agent changed.
 */
export async function prepareWorktree(opts: {
  repo: string;
  ref: string;
  dir: string;
  evalCase: EvalCase;
  condition: Condition;
  skillMd?: string;
}): Promise<PreparedWorktree> {
  const { repo, ref, dir, evalCase, condition, skillMd } = opts;
  return serial(async () => {
    await git(repo, "worktree", "add", "--detach", dir, ref);
    // The exercise folders (this harness, its cases) are not part of the fixture: the agent must not see them.
    await rm(path.join(dir, "exercises"), { recursive: true, force: true });

    for (const m of evalCase.mutations) {
      const file = path.join(dir, m.file);
      const source = await readFile(file, "utf8");
      if (!source.includes(m.find)) throw new Error(`case ${evalCase.id}: "${m.find}" not found in ${m.file}`);
      await writeFile(file, source.split(m.find).join(m.replace), "utf8");
    }

    // TODO (fixture self-check): run the deterministic checker on the mutated fixture
    // (runChecker below) and throw when its exit code differs from evalCase.checkerExit.
    const checker = { exitCode: evalCase.checkerExit, output: "TODO: fixture self-check not implemented" };

    // TODO (conditions): WITHOUT = the skill directory (SKILL.md and its script) is not available
    // in this worktree. WITH + skillMd = replace the committed SKILL.md by the given file.
    void condition;
    void skillMd;
    void copyFile;

    await git(dir, "add", "-A");
    await git(
      dir,
      "-c", "user.name=skill-eval",
      "-c", "user.email=skill-eval@localhost",
      "commit", "-q", "--no-verify", "--allow-empty",
      "-m", `skill-eval fixture: ${evalCase.id} (${condition})`,
    );
    return { dir, head: await git(dir, "rev-parse", "HEAD"), checkerOutput: checker.output };
  });
}

/** Runs the skill's checker script against `root`. Exit codes: 0 aligned, 1 drift, 2 read error. */
export async function runChecker(root: string): Promise<{ exitCode: number; output: string }> {
  try {
    const { stdout } = await exec("node", [path.join(root, CHECKER), "--root", root]);
    return { exitCode: 0, output: stdout };
  } catch (error) {
    const e = error as { code?: number; stdout?: string; stderr?: string };
    return { exitCode: typeof e.code === "number" ? e.code : 2, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

/**
 * Scope check: nothing modified, created or committed by the agent.
 *
 * TODO: list changed and untracked files with `git status --porcelain --untracked-files=all`
 * (use gitRaw: trimming eats the first status column) and detect a moved HEAD.
 */
export async function checkScope(dir: string, head: string): Promise<ScopeCheck> {
  void dir;
  void head;
  return { ok: true, changedFiles: [], headMoved: false };
}

/** TODO: remove the run's worktree (`git worktree remove --force`), falling back to rm + `git worktree prune`. */
export async function removeWorktree(repo: string, dir: string): Promise<void> {
  void repo;
  void dir;
}

/** Worktrees of `repo` still registered under `root` (should be empty after a run). */
export async function leftoverWorktrees(repo: string, root: string): Promise<string[]> {
  const list = await git(repo, "worktree", "list", "--porcelain");
  return list
    .split("\n")
    .filter((l) => l.startsWith("worktree "))
    .map((l) => l.slice("worktree ".length))
    .filter((p) => p.startsWith(root));
}
