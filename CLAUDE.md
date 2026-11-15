# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Frontend for **Track Expenses & Grow**, a personal-finance app. Next.js 16 (App Router, Webpack), React 19, TypeScript, Redux Toolkit, Tailwind CSS v4, Zod. The backend is a separate REST API consumed via `NEXT_PUBLIC_API_BASE_URL` and lives at `/Users/vasanthamuralikrishna/Documents/Personal/repos/Track Expenses & Grow`.

`AGENTS.md` is the long-form operating manual for this repo. Read it for module-by-module behavior. This file captures the load-bearing patterns to avoid breaking.

## Commands

```bash
npm run dev     # next dev --webpack
npm run build   # next build --webpack
npm run start   # next start
npm run lint    # eslint .
```

There is no test runner configured. Don't claim test coverage exists. The project uses `--webpack` (not Turbopack) — preserve that flag when modifying scripts.

`@/*` resolves to `./src/*` (see `tsconfig.json`).

## Architecture

### Layered structure (enforce strictly)

- `src/app/` — routes only. Read params, compose layout, mount a feature component. No business logic, no `fetch()`.
- `src/features/<name>/` — domain code, organized as `components/`, `services/`, `types/`, `schemas/`, optional `state/`. `auth` and `income` are the reference implementations; mirror their shape for new features.
- `src/components/` — cross-feature shell, providers and shared UI primitives (e.g. `dashboard-shell`, `protected-route`, `app-providers`, `auth-bootstrapper`, `ui/pagination`). Interactive primitives build on `@headlessui/react` styled with Tailwind.
- `src/lib/` — `api/http-client.ts`, `store/`, `utils/`. Don't dump feature-specific helpers here.
- `src/config/env.ts` — Zod-validated env. Every new `NEXT_PUBLIC_*` var must be added here AND in `.env.example`.

### Routing & auth

- Public entry: `src/app/page.tsx` renders `AuthScreen`, honors `?next=` for post-login redirect, defaults to `/dashboard/expenses` (the dashboard home; `/dashboard` and the old `/dashboard/overview` redirect there).
- Protected area: `src/app/(app)/dashboard/layout.tsx` wraps every dashboard route in `ProtectedRoute` + `DashboardShell`. Adding a new dashboard page automatically inherits auth — don't re-wrap.
- `ProtectedRoute` states: `idle`/`bootstrapping`/`submitting` → loader; `anonymous` → redirect to `/?next=<path>`; `authenticated` → render. Preserve this contract.

### Session bootstrap (canonical — do not duplicate)

1. `app/layout.tsx` mounts `AppProviders` (Redux Provider).
2. `AuthBootstrapper` runs once on the client. It registers the auth bridge (see below) and reads `track-expenses-grow.refreshToken` from localStorage.
3. If a refresh token exists, dispatches `rehydrateSession(refreshToken)` → `POST /auth/refresh` → resolves to `authenticated` (with new access + refresh tokens) or `anonymous`.

Auth statuses: `idle | bootstrapping | submitting | authenticated | anonymous`. Token persistence (both tokens) lives in `src/lib/utils/auth-storage.ts`.

### Token model

- **Access token** (JWT, 15 min): sent as `Authorization: Bearer <token>` on every protected request.
- **Refresh token** (opaque, 30 days): sent in the JSON body of `/auth/refresh` and `/auth/logout`. Backend **rotates** it on every refresh — always persist whatever `/auth/refresh` returns.
- Both tokens live in `localStorage` and are mirrored in Redux (`state.auth.accessToken`, `state.auth.refreshToken`).
- `/auth/login`, `/auth/signup`, `/auth/refresh`, `/auth/logout` all return `{ accessToken, refreshToken, user }` (logout returns 204).

### Redux

Single `auth` slice today (`src/lib/store/store.ts`). Always use the typed hooks `useAppDispatch`, `useAppSelector`, `useAppStore` from `src/lib/store/hooks.ts` — never raw `useDispatch`/`useSelector`.

### API layer

All HTTP goes through `apiRequest()` in `src/lib/api/http-client.ts`. It prepends `env.apiBaseUrl`, attaches `Authorization: Bearer <token>` when supplied, JSON-encodes bodies, handles 204, and normalizes errors into `ApiError { status, message, fieldErrors }` (validation issues become a `path → message` map). Feature UIs should consume `ApiError` directly. Never call `fetch()` from a component.

Each feature exposes a `services/<feature>-service.ts` that wraps `apiRequest` — caller passes the bearer token from Redux.

**Auto-refresh on 401.** If a request with `token` returns 401, `apiRequest` calls into `src/lib/api/auth-bridge.ts` to refresh tokens (single-flight: concurrent 401s share one `/auth/refresh` call) and retries the original request once with the new access token. If refresh fails, the bridge dispatches `sessionRevoked` and the 401 propagates. Auth endpoints opt out via `skipAuthRefresh: true` to avoid recursion. Feature services don't need to handle this — just pass `token` and let the http client deal with expiry.

## Income feature — important domain rule

`GET /income` returns multiple records but the UI treats `incomes[0]` as the single active editable plan. The backend persists the **whole plan**, not row-level records — every add/edit/delete sends the full updated payload via `PUT /income/:incomeId`. Row mutations are UI-only until save. Don't refactor toward per-row endpoints without confirming a backend change.

Endpoints: `GET /income/categories`, `GET /income`, `POST /income`, `PUT /income/:incomeId`, `DELETE /income/:incomeId`.

Client-side validation blocks: invalid total, invalid entry amount, duplicate categories, allocations exceeding total.

## Validation

- Zod for stable, field-oriented schemas (see `features/auth/schemas/auth-schemas.ts`).
- Plain runtime helpers for view-specific rules (see income allocation checks). Don't force Zod where it adds ceremony.

## Styling

Theme tokens live in `src/app/globals.css` (`--background`, `--foreground`, `--surface`, `--border`, `--copy-muted`, `--brand`, `--brand-strong`). Use them — don't introduce per-page palettes. The active dashboard nav tab requires strong text/background contrast (this regressed once before).

## Conventions to preserve

- Thin route files; logic in features.
- One `services/` file per feature for REST.
- Preserve the bootstrap → protected-route → shell flow.
- Mirror `income`'s structure when scaffolding new domains (e.g. `personalization` placeholder exists and should follow this pattern when filled in). Feature-internal pure helpers may live in a `utils/` subdirectory.
