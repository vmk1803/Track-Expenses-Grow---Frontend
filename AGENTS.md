# AGENTS.md

## Project

`Track Expenses & Grow - Frontend`

Frontend for a personal finance application built with `Next.js 16`, `TypeScript`, `Redux Toolkit`, `Tailwind CSS v4`, and `Zod`.

The backend lives in a separate repository and is consumed through REST APIs configured via environment variables.

## Purpose Of This File

This file is the operating manual for anyone working in this repository, including coding agents. It explains:

- how the codebase is structured
- how auth and routing work
- how the current live modules behave
- how to extend the app without breaking the existing patterns
- which implementation conventions should be followed

## Current Product State

Implemented today:

- public auth entry at `/`
- single-screen login/signup flow
- Redux-backed session state
- access + refresh token persistence in local storage
- 15-minute access token with silent refresh via 30-day rotating refresh token
- protected dashboard shell
- `Expenses` dashboard home: budget summary, category usage, paginated expense list (Overview was merged into it)
- live `Income` feature with backend integration

Not fully implemented yet:

- AI guidance workflows

## Stack

- `next`
- `react`
- `react-dom`
- `typescript`
- `@reduxjs/toolkit`
- `react-redux`
- `zod`
- `tailwindcss`
- `eslint`

## Repo Layout

```text
.
├── AGENTS.md
├── docs/
│   └── codebase-guide.md
├── package.json
├── src/
│   ├── app/
│   │   ├── (app)/
│   │   │   └── dashboard/
│   │   │       ├── personalization/page.tsx
│   │   │       ├── expenses/page.tsx
│   │   │       ├── income/page.tsx
│   │   │       ├── layout.tsx
│   │   │       └── page.tsx
│   │   ├── globals.css
│   │   ├── icon.svg
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── dashboard-shell.tsx
│   │   │   └── protected-route.tsx
│   │   ├── providers/
│   │   │   ├── app-providers.tsx
│   │   │   └── auth-bootstrapper.tsx
│   │   └── ui/
│   │       └── pagination.tsx
│   ├── config/
│   │   └── env.ts
│   ├── features/
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── schemas/
│   │   │   ├── services/
│   │   │   ├── state/
│   │   │   └── types/
│   │   └── income/
│   │       ├── components/
│   │       ├── services/
│   │       └── types/
│   └── lib/
│       ├── api/
│       ├── store/
│       └── utils/
```

## Architectural Rules

### 1. Keep `app/` thin

Files in `src/app` should mostly:

- define routes
- read route/search params
- compose layouts
- mount feature components

Do not put heavy business logic into route files if it belongs to a feature.

### 2. Put business logic in `features/`

Each real product area should live under `src/features/<feature-name>/`.

Preferred structure:

- `components/`
- `services/`
- `types/`
- `schemas/`
- `state/` only if feature-level shared state is needed
- `utils/` for feature-internal pure helpers (e.g. recommender logic, formatters)

### 3. Put shared app infrastructure in `components/`, `lib/`, and `config/`

- `components/` for layout/providers shared across features
- `lib/` for reusable low-level utilities
- `config/` for environment and config parsing

### 4. Use feature services for API calls

Do not scatter raw `fetch()` calls through UI components. Create service files that wrap `apiRequest()`.

## Routing Model

### Public route

`src/app/page.tsx`

- public entry point
- resolves `next` query parameter
- renders `AuthScreen`
- defaults successful auth redirect to `/dashboard/expenses`

### Protected routes

`src/app/(app)/dashboard/layout.tsx`

- wraps all dashboard screens in `ProtectedRoute`
- wraps authenticated content in `DashboardShell`

All dashboard pages inherit auth protection automatically.

### Current dashboard routes

- `/dashboard/expenses`
- `/dashboard/income`
- `/dashboard/personalization`

## App Bootstrap And Session Flow

### Core files

- `src/app/layout.tsx`
- `src/components/providers/app-providers.tsx`
- `src/components/providers/auth-bootstrapper.tsx`
- `src/features/auth/state/auth-slice.ts`
- `src/lib/utils/auth-storage.ts`

### Bootstrap sequence

1. root layout mounts `AppProviders`
2. Redux provider is created
3. `AuthBootstrapper` runs on the client once
4. it registers the auth bridge (`src/lib/api/auth-bridge.ts`) so the http client can refresh tokens
5. it reads local storage for `track-expenses-grow.refreshToken`
6. if refresh token is missing:
   - auth state becomes `anonymous`
7. if refresh token exists:
   - auth state becomes `bootstrapping`
   - `rehydrateSession(refreshToken)` is dispatched, which calls `POST /auth/refresh`
8. backend validates and rotates the refresh token, returning a fresh `{ accessToken, refreshToken, user }`
9. Redux becomes either:
   - `authenticated` (both tokens persisted)
   - `anonymous` (tokens cleared)

This is the canonical session restore flow. Do not duplicate it elsewhere.

## Auth Model

### Files

- `src/features/auth/components/auth-screen.tsx`
- `src/features/auth/services/auth-service.ts`
- `src/features/auth/schemas/auth-schemas.ts`
- `src/features/auth/state/auth-slice.ts`
- `src/features/auth/types/auth.ts`

### Auth statuses

- `idle`
- `bootstrapping`
- `authenticated`
- `anonymous`
- `submitting`

### Login flow

1. user lands on `/`
2. login form is shown by default
3. client validation runs through `validateLogin`
4. thunk `login()` is dispatched
5. `POST /auth/login` is called through `authService`
6. on success:
   - access + refresh tokens are saved to local storage
   - Redux user/session state is hydrated
   - router redirects to `nextPath`

### Signup flow

1. user switches form mode inside the same auth card
2. `validateSignup` checks form data
3. thunk `signup()` is dispatched
4. `POST /auth/signup` is called
5. on success:
   - user is immediately authenticated
   - both tokens are persisted
   - redirect happens directly

### Rehydrate flow

Uses:

- local storage refresh token
- `rehydrateSession`
- `authService.refresh`

Backend contract:

`POST /auth/refresh` with `{ refreshToken }` returns `{ accessToken, refreshToken, user }`. The refresh token is rotated, so the new one must be persisted.

### Silent refresh on 401

When a request carrying an access token gets `401` from the API, `apiRequest` calls `refreshAccessToken()` from `src/lib/api/auth-bridge.ts`:

- single-flight: concurrent 401s reuse the same in-flight refresh promise
- on success: `tokensRefreshed` is dispatched, both tokens are persisted, the original request retries once with the new access token
- on failure: `sessionRevoked` is dispatched, tokens are cleared, the original 401 propagates so the caller can react

Auth endpoints (`/auth/login`, `/auth/signup`, `/auth/refresh`, `/auth/logout`) pass `skipAuthRefresh: true` to avoid recursion.

### Logout flow

Handled in `DashboardShell` via the `logout` thunk.

On logout:

- `POST /auth/logout` is called with the current refresh token (best-effort revocation; failure does not block)
- Redux auth state is cleared
- both tokens are removed from local storage
- router sends user back to `/`

## Protected Route Behavior

`src/components/layout/protected-route.tsx`

Behavior:

- `idle`, `bootstrapping`, `submitting`:
  - show loading / restoring session screen
- `anonymous`:
  - redirect to `/?next=<current-path>`
- `authenticated`:
  - render children

Agents should preserve this behavior unless auth architecture is intentionally being redesigned.

## API Layer

### Shared HTTP client

`src/lib/api/http-client.ts`

Responsibilities:

- prepend `env.apiBaseUrl`
- attach JSON headers
- attach bearer token when provided
- parse JSON responses
- handle `204` responses
- normalize backend validation errors into `ApiError`

### `ApiError`

Provides:

- `status`
- `message`
- `fieldErrors`

Feature UIs should consume this normalized shape rather than re-implementing response parsing.

## Environment Configuration

### Source

`src/config/env.ts`

### Supported public env vars

- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_API_BASE_URL`

### Rule

All new public env vars should be added to:

- `.env.example`
- `src/config/env.ts`

and validated with Zod.

## Styling System

### Theme source

`src/app/globals.css`

Current theme tokens:

- `--background`
- `--foreground`
- `--surface`
- `--border`
- `--copy-muted`
- `--brand`
- `--brand-strong`

### Current visual language

- warm finance-oriented background
- dark readable text
- green brand accents
- soft glass-like white surfaces
- rounded controls
- restrained shadows

### Styling guidance

When implementing new UI:

- use the existing theme tokens first
- preserve readability over decorative styling
- keep spacing generous
- prefer calm, trustworthy finance UI rather than flashy dashboards
- keep active states and CTA contrast strong

## Dashboard Shell

`src/components/layout/dashboard-shell.tsx`

Responsibilities:

- authenticated header
- user greeting
- nav tabs
- logout action
- page frame for all protected content

### Navigation rule

The active tab must always maintain strong text/background contrast. This was already corrected once and should not regress.

## Income Feature

The `Income` module is the best current reference for future feature work.

### Files

- `src/app/(app)/dashboard/income/page.tsx`
- `src/features/income/components/income-screen.tsx`
- `src/features/income/services/income-service.ts`
- `src/features/income/types/income.ts`

### Backend contract

Expected endpoints:

- `GET /income/categories`
- `GET /income`
- `POST /income`
- `PUT /income/:incomeId`
- `DELETE /income/:incomeId`

All protected via bearer auth.

### Current page model

The UI treats:

- `incomes[0]` from `GET /income`

as the active editable income plan.

Older returned records are ignored on this screen for now.

### Feature behavior

If there is no active plan:

- show empty-state fallback
- show `Add income`
- allow first allocation creation

If there is an active plan:

- show total income
- show allocated and remaining summaries
- show allocation rows
- allow add/edit/delete inline

### Important domain rule

The backend stores the whole income plan, not row-level records.

That means:

- add/edit/delete row interactions are UI-level concepts
- persistence always sends the full updated plan payload

Agents should preserve this model when modifying the income feature.

### Current client-side validation

Income UI blocks:

- invalid total income
- invalid entry amount
- duplicate categories
- allocations whose total exceeds total income

## Current Placeholders

These routes are scaffolded but not yet fully domain-driven:

- `AI Advice`

If expanding them, follow the same pattern used by `Income`.

## Store Pattern

### Files

- `src/lib/store/store.ts`
- `src/lib/store/hooks.ts`

### Rule

Use typed hooks:

- `useAppDispatch()`
- `useAppSelector()`
- `useAppStore()`

Do not use raw `useDispatch` / `useSelector` directly in feature components.

## Utility Pattern

### Current utilities

- `src/lib/utils/auth-storage.ts`
- `src/lib/utils/cn.ts`

### Rule

Only add new shared utilities when the behavior is truly cross-feature. Avoid turning `lib/` into a dumping ground.

## Validation Pattern

For forms and request payloads:

- use Zod when schemas are stable and field-oriented
- use focused runtime validation helpers for view-specific rules when that is simpler

Current examples:

- auth uses Zod schema validation
- income uses local validation helpers for allocation rules

## Coding Conventions

### Prefer

- thin route files
- feature-centric organization
- typed service functions
- explicit state transitions
- plain naming
- small shared helpers

### Avoid

- business logic in `app/` pages
- ad hoc `fetch()` inside UI components
- duplicated auth/session logic
- inconsistent API error handling
- inventing new visual themes per page

## How To Add A New Feature

Recommended sequence:

1. create route entry file under `src/app` if needed
2. create `src/features/<feature-name>/`
3. define types
4. define service layer
5. implement main feature component
6. wire route file to that component
7. reuse Redux auth token for protected APIs
8. keep loading, validation, and error states visible

## Recommended Pattern For Expenses

When building the expenses module, mirror the income organization:

- `src/features/expenses/types/`
- `src/features/expenses/services/`
- `src/features/expenses/components/`

and keep route-level files thin.

## Local Development

### Environment

Expected env example:

```env
NEXT_PUBLIC_APP_NAME=Track Expenses & Grow
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
```

### Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
```

### Backend dependency

The frontend expects the backend to be available separately on the configured API URL.

## Best Reading Order For New Contributors

To understand the app quickly, read in this order:

1. `package.json`
2. `src/config/env.ts`
3. `src/app/layout.tsx`
4. `src/components/providers/app-providers.tsx`
5. `src/components/providers/auth-bootstrapper.tsx`
6. `src/features/auth/state/auth-slice.ts`
7. `src/components/layout/protected-route.tsx`
8. `src/components/layout/dashboard-shell.tsx`
9. `src/features/auth/components/auth-screen.tsx`
10. `src/features/income/components/income-screen.tsx`

## Agent-Specific Guidance

When working in this repository:

- prefer extending existing patterns over introducing new ones
- treat `auth` and `income` as reference implementations
- preserve the session bootstrap and protected-route flow
- keep route files minimal
- use service files for REST interactions
- keep UI polished but grounded in the existing visual language
- avoid broad refactors unless they directly unblock the feature being built

## Access to multiple repo
- Restapi: /Users/vasanthamuralikrishna/Documents/Personal/repos/Track Expenses & Grow

## Summary

This repo already has a solid frontend foundation. The safest way to move fast is to keep building feature-by-feature using the existing structure:

- `app` for routes
- `components` for shared shell/providers
- `features` for domain logic
- `lib/config` for shared plumbing

If in doubt, follow the shape established by `auth` and `income`.
