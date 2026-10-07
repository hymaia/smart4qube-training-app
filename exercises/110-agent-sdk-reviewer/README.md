# Agent SDK reviewer — starter

Exercise 1 (Agent SDK Code Reviewer). The instructions are on the slides.

From the Smart4Qube root:

```bash
cd exercises/110-agent-sdk-reviewer
npm install
npm run typecheck
npm test                 # validation tests: 4 of 6 red until you implement validateFinding (TODO 2)
npm run review           # needs `npm run dev:api` running at the Smart4Qube root and a logged-in `claude`
```

Flags: `--repo <path>` (default: the repo's `rocketnouilles/` folder, i.e. `../../rocketnouilles` from here,
or `ROCKETNOUILLES_DIR`), `--scope <dir>|.` (default `server/src/promo`), `--model <id>` (default `sonnet`),
`--max-turns <n>`, `--budget <usd>`. `SMART4QUBE_API_URL` overrides `http://localhost:3001`.

Progress is printed on stderr, the JSON summary on stdout:

```bash
npm run --silent review > summary.json
```
