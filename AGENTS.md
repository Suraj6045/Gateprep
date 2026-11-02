# Gateprep AI Instructions

This file defines how AI assistants should work in this repository.

Gateprep is a full-stack GATE exam preparation platform with:
- `backend/` — FastAPI, SQLAlchemy, Alembic, PostgreSQL/Supabase
- `frontend/` — React 18, Vite, Tailwind CSS, strict TypeScript/TSX
- root Docker files for local and deployment workflows

Read this file first, then load only the relevant files from `.agents/rules/`, `.agents/workflows/`, and `.agents/skills/` for the task at hand.

This file describes the application repository, not the `.agents/` package itself.
When repository files disagree with these notes, trust the actual code and update this file if the mismatch matters.

## Project Priorities

1. Preserve correctness in test-taking, scoring, auth, and admin flows
2. Do not break cookie-based authentication or CORS behavior
3. Do not expose secrets or weaken security settings
4. Keep UI changes consistent with the existing app unless asked to redesign
5. Prefer small, focused edits over broad refactors

## Stack Summary

### Frontend

- React 18 with Vite
- `frontend/src` is strict TypeScript only. Retained JavaScript is intentionally limited to `vite.config.js`, `postcss.config.js`, `api/proxy.js`, and `api/proxy.test.js` (tooling and the Vercel API proxy, outside the `tsconfig.json` `include`). Do not convert them without updating `tsconfig.json` and the build.
- Tailwind CSS
- SWR for some data fetching
- React Router

### Backend

- FastAPI
- SQLAlchemy 2
- Alembic migrations
- PostgreSQL, commonly via Supabase
- JWT/auth cookie flows
- Cloudinary for question images

## Repository Map

- `frontend/src/pages/` — route-level screens
- `frontend/src/components/` — reusable UI pieces
- `frontend/src/api/` — API wrappers and client setup
- `frontend/src/context/` — auth and theme state
- `frontend/src/utils/` — shared constants/utilities
- `backend/app/` — FastAPI application code
- `backend/tests/` — backend test suite
- `backend/alembic/` — migrations
- `uploads/` — local upload storage

## Common Commands

Run commands from the repository root unless a `cd` is shown.

### Backend

- Install dependencies: `cd backend && pip install -r requirements.txt`
- Run API locally: `cd backend && python -m uvicorn app.main:app --reload --port 8000`
- Run backend tests: `cd backend && pytest`

### Frontend

- Install dependencies: `cd frontend && npm install`
- Run dev server: `cd frontend && npm run dev`
- Build frontend: `cd frontend && npm run build`
- Audit contrast: `cd frontend && npm run audit:contrast`
- Typecheck: `cd frontend && npm run typecheck`

### Full Stack

- Run with Docker: `docker compose up --build`

The frontend `npm run build` runs `tsc --noEmit` before `vite build`; `npm run typecheck` and `npm test` are required checks. There is no frontend lint script.

## How AI Should Work Here

### 1. Choose the right instruction set

Load the smallest relevant set of files from `.agents/`:
- Always useful: `rules/common-coding-style.md`, `rules/common-development-workflow.md`, `rules/ponytail.md`
- Frontend tasks: add `rules/web-coding-style.md`, `rules/web-patterns.md`, `rules/web-testing.md`
- Backend tasks: add `rules/python-coding-style.md`, `rules/python-patterns.md`, `rules/python-testing.md`, `rules/python-security.md`
- Security-sensitive work: add `rules/common-security.md`
- Reviews: use `workflows/code-review.md`
- Planning: use `workflows/plan.md`
- Feature work: use `workflows/feature-dev.md`

Do not load unrelated rule files just because they exist.

### 2. Match the real stack

- Use TypeScript throughout `frontend/src` and keep the compiler strict.
- Use `unknown` with narrowing instead of `any`.
- Never use `@ts-ignore`.
- Avoid `as` casts except `as const`; use generated API types and runtime guards at external boundaries.
- `@ts-expect-error` is allowed only as `// @ts-expect-error TODO(null-safety): <exact case and runtime result>`. CI fails if the total in `frontend/src` exceeds the budget set in `.github/workflows/e2e.yml`. Lower the budget whenever you remove one; never raise it.
- API types: `frontend/src/api/schema.d.ts` is generated from the backend OpenAPI schema and committed. After changing a backend route, response model, or request model, run `cd frontend && npm run gen:api` and commit the result; CI fails if it is stale. Routes without a response model use hand-typed shapes in `frontend/src/types/api.ts` marked `// TODO(response_model)`; replace them by adding a backend response model.
- Keep behavior changes and refactors in separate PRs.
- Prefer existing patterns in the touched area over generic framework advice
- Do not introduce a new state management or form library without a clear need
- Treat listed agents/workflows as guidance unless the active AI harness actually provides them as callable tools

### 3. Understand before editing

Before substantial changes:
- inspect the relevant page, component, API module, or backend route
- trace where the data comes from and where it is persisted
- check whether backend tests already cover the area
- check `README.md` when environment or deployment behavior matters

### 4. Keep changes scoped

- Avoid unrelated refactors
- Do not rename files or move modules unless required
- Preserve current API shapes unless the task explicitly includes backend/frontend coordination
- If a task touches both frontend and backend, call that out clearly

## Validation Expectations

Validation should match the part of the project being changed.

### Frontend

Available commands:
- `cd frontend && npm run build`
- `cd frontend && npm run audit:contrast`
- `cd frontend && npm run typecheck`
- `cd frontend && npm test`

Notes:
- `npm run build` runs `tsc --noEmit` before `vite build`
- `npm run typecheck` and `npm test` are required frontend checks
- There is no frontend lint script
- For UI changes, build verification is the default minimum check

### Backend

Typical commands:
- `cd backend && pytest`

If migrations, dependency wiring, or app startup are affected, also verify the relevant startup path when practical:
- `cd backend && python -m uvicorn app.main:app --reload --port 8000`

### Docker / Full Stack

When changes affect integration boundaries, use:
- `docker compose up --build`

Only do this when the task justifies the heavier validation cost.

## Testing Policy

Testing is required, but the repo currently has uneven tooling across frontend and backend.

- For backend logic changes, add or update automated tests when feasible
- For bug fixes, prefer reproducing the bug with a test first
- For frontend changes, verify with build and add tests only if the area already has test coverage or the task specifically asks for it
- Do not claim coverage percentages unless you actually measured them

TDD is preferred for non-trivial backend work, but do not block simple safe fixes on rigid ceremony.

## Security Rules

- Never commit real secrets, tokens, API keys, or `.env` values
- Treat any existing local `.env` file as private user state
- Preserve auth cookie behavior unless the task explicitly changes authentication
- Be careful with:
  - `DATABASE_URL`
  - `SECRET_KEY`
  - Cloudinary credentials
  - CORS settings
  - `AUTH_COOKIE_SECURE`
  - `AUTH_COOKIE_SAMESITE`
- Validate backend inputs at API boundaries
- Do not weaken authorization checks for admin routes
- Avoid leaking sensitive backend errors to the client

## Frontend Guidance

- Follow existing page/component structure before introducing abstractions
- Keep accessibility in mind for forms, dialogs, buttons, and keyboard-driven test flows
- Be careful around exam UX features such as timers, fullscreen behavior, tab detection, calculator use, bookmarks, and submission flows
- Prefer incremental styling changes over wholesale redesigns unless asked

## Backend Guidance

- Preserve scoring and attempt integrity
- Be cautious with first-attempt-only leaderboard logic
- Keep database access patterns explicit and readable
- When changing schemas, ensure Alembic implications are considered

## Review Checklist

Before considering work complete, confirm:
- the change matches the user request
- no unrelated files were modified without reason
- secrets were not introduced
- the relevant build/tests were run when practical
- auth, scoring, timing, or admin behavior was not accidentally regressed
- docs were updated only when the task required it

## Source of Truth

If this file conflicts with the actual repository state, trust the repository state:
- `README.md`
- package manifests
- backend requirements and tests
- existing code patterns in the touched area

Update this file when the project stack, scripts, or workflow expectations change.