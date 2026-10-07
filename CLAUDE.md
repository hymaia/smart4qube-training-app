# Smart4Qube

SonarQube-like viewer for line-anchored code review findings (vulnerabilities, quality gate
violations, comments). npm workspaces, Node >= 22.

- `apps/api`: Express 5 implementation of `contracts/openapi.yaml`, in-memory store seeded from `src/seed.ts`.
- `apps/web`: React 19 + Vite viewer; reads issues from the API (proxied `/issues` -> `localhost:3001`).
- `contracts/openapi.yaml`: the API contract and source of truth for the issue model.
- `rocketnouilles/`: a separate, standalone app reviewed by Smart4Qube (project id `rocketnouilles`).
  It has its own tooling; it is not part of the npm workspaces. Do not change it while working on Smart4Qube.

## Commands (run from the repo root)

```bash
npm install
npm run dev:api          # API on http://localhost:3001 (PORT env overrides)
npm run dev:web          # web on http://localhost:5173
npm test                 # API tests then web tests (vitest)
npm run test:api
npm run test:web
npm run build:api        # tsc
npm run build:web        # tsc --noEmit && vite build
npm run contract:check   # issue enum drift check (see below)
npm run issues:list -- <projectId> ["type=COMMENT&status=OPEN"]
npm run issues:add -- <projectId> scripts/examples/vulnerability.json
npm run issues:remove -- <projectId> <issueId>
```

The `issues:*` scripts need a running API; `SMART4QUBE_API_URL` overrides the default URL.

## API rules

- The contract wins. Change `contracts/openapi.yaml` first, then the API, then the web model.
- Known projects live in `KNOWN_PROJECT_IDS` (`apps/api/src/seed.ts`); others return `404 PROJECT_NOT_FOUND`.
- Errors are always `{ code, message, details? }` with a contract error code.
- Request validation lives in `apps/api/src/validation.ts`, storage in `src/store.ts`, routes in `src/app.ts`.
- `createApp()` builds a fresh store per call; tests use a fresh app for every write test.

## Web layers (`apps/web/src`)

`domain` depends on nothing; `application` and `infrastructure` depend only on `domain`;
`presentation` wires them together (hooks/pages import infrastructure singletons).

- `domain/`: entities and repository interfaces. No React, no fetch, no Vite APIs.
- `application/use-cases/`: pure functions over domain entities.
- `infrastructure/`: `api/HttpIssuesRepository.ts` (HTTP) and `fixtures/projects.ts`
  (source files via `import.meta.glob`: `apps/web/fixtures/repos/<id>/` and repo-root `rocketnouilles/`).
- `presentation/`: pages, components, hooks (`useIssues` polls via SWR so external writes show up).

Projects shown in the UI are listed in `PROJECT_NAMES` in `infrastructure/fixtures/projects.ts`.
A project's file paths must match the `filePath` of its issues (repo-relative POSIX, no leading slash).

## Contract checker skill

`.claude/skills/issue-contract-checker/` compares `IssueType`, `IssueSeverity` and `IssueStatus`
across `contracts/openapi.yaml`, `apps/api/src/types.ts` and `apps/web/src/domain/entities/Issue.ts`.
Run `npm run contract:check` before and after touching any issue enum. Exit 0 means aligned only;
it does not prove the API behaves per the contract (that is what `npm run test:api` is for).
