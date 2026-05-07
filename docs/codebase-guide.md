# Track Expenses & Grow Frontend Codebase Guide

## Purpose

This document explains how the frontend is organized today, how the current flows work, and which conventions should be followed as the project grows.

The app is a `Next.js 16 + TypeScript` frontend using:

- App Router
- Redux Toolkit for auth/session state
- Tailwind CSS v4 for styling
- Zod for environment parsing and client-side form validation

The backend is a separate repository and is expected to be available through the configured API base URL.

## Current Product Scope

The frontend currently covers:

- public auth entry flow at `/`
- login and signup in a single auth screen
- session persistence via Redux + local storage
- protected dashboard shell
- placeholder `Overview`, `Expenses`, and `AI Advice` tabs
- live `Income` tab with backend-connected CRUD behavior

This means the app already has the core application shell and one real feature module (`Income`) that can serve as the reference pattern for future modules.

## Tech Stack

- `next`: application runtime and routing
- `react`, `react-dom`: UI runtime
- `@reduxjs/toolkit`, `react-redux`: global auth state
- `zod`: schema validation
- `tailwindcss`: utility styling
- `eslint`, `typescript`: code quality and type safety

## Project Structure

```text
.
├── .env.example
├── docs/
│   └── codebase-guide.md
├── package.json
├── src/
│   ├── app/
│   │   ├── (app)/
│   │   │   └── dashboard/
│   │   │       ├── ai-advice/page.tsx
│   │   │       ├── expenses/page.tsx
│   │   │       ├── income/page.tsx
│   │   │       ├── overview/page.tsx
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
│   │   └── providers/
│   │       ├── app-providers.tsx
│   │       └── auth-bootstrapper.tsx
│   ├── config/
│   │   └── env.ts
│   ├── features/
│   │   ├── auth/
│   │   │   ├── components/auth-screen.tsx
│   │   │   ├── schemas/auth-schemas.ts
│   │   │   ├── services/auth-service.ts
│   │   │   ├── state/auth-slice.ts
│   │   │   └── types/auth.ts
│   │   └── income/
│   │       ├── components/income-screen.tsx
│   │       ├── services/income-service.ts
│   │       └── types/income.ts
│   └── lib/
│       ├── api/http-client.ts
│       ├── store/hooks.ts
│       ├── store/store.ts
│       └── utils/
│           ├── auth-storage.ts
│           └── cn.ts
```

## High-Level Architecture

The architecture intentionally separates concerns into four layers:

1. `app/`
   - route entry points and layout composition
   - should stay thin

2. `components/`
   - cross-feature layout or provider components
   - shared infrastructure, not business logic

3. `features/`
   - domain-specific code
   - this is where most future application work should go

4. `lib/` and `config/`
   - low-level utilities, store wiring, API helper, environment handling

The main design choice here is: pages are only route wrappers, and actual feature behavior lives under `src/features`.

## Routing Model

### Public entry route

`src/app/page.tsx`

- resolves `next` query parameter
- defaults post-login navigation to `/dashboard/overview`
- renders the auth screen directly

This keeps `/` as the public entry point and avoids maintaining separate `/login` and `/signup` routes for now.

### Protected app routes

`src/app/(app)/dashboard/layout.tsx`

- wraps dashboard pages with `ProtectedRoute`
- wraps authenticated content in `DashboardShell`

All pages under `src/app/(app)/dashboard/*` inherit that protection automatically.

### Dashboard tabs

Current dashboard routes:

- `/dashboard/overview`
- `/dashboard/expenses`
- `/dashboard/income`
- `/dashboard/ai-advice`

At the moment:

- `Overview` is a styled placeholder summary
- `Expenses` is scaffolded only
- `Income` is the first live backend-connected module
- `AI Advice` is scaffolded only

## App Bootstrap Workflow

The app startup flow is:

1. `src/app/layout.tsx` loads global metadata and wraps the app in `AppProviders`
2. `AppProviders` mounts the Redux `Provider`
3. `AuthBootstrapper` runs once on the client
4. `AuthBootstrapper` checks local storage for an access token
5. if no token exists, auth state becomes `anonymous`
6. if a token exists, `rehydrateSession(accessToken)` is dispatched
7. the backend validates the token through the auth API
8. Redux state is updated to either:
   - `authenticated`, if token login succeeds
   - `anonymous`, if token login fails

This design makes refresh-time re-authentication automatic and keeps session restoration logic out of page components.

## Authentication Workflow

### Core files

- `src/features/auth/components/auth-screen.tsx`
- `src/features/auth/state/auth-slice.ts`
- `src/features/auth/services/auth-service.ts`
- `src/features/auth/schemas/auth-schemas.ts`
- `src/lib/utils/auth-storage.ts`

### Login flow

1. user lands on `/`
2. `AuthScreen` defaults to login mode
3. form input is validated with `validateLogin`
4. Redux thunk `login` is dispatched
5. `authService.loginWithCredentials()` calls `POST /auth/login`
6. on success:
   - Redux auth state becomes `authenticated`
   - token is stored in local storage
   - user is redirected to `nextPath`
7. on failure:
   - API error message is surfaced
   - field-level issues are mapped when available

### Signup flow

1. user switches to signup mode inside the same auth card
2. `validateSignup` checks name, email, password, and confirmation
3. Redux thunk `signup` is dispatched
4. `authService.signup()` calls `POST /auth/signup`
5. on success:
   - user is immediately treated as authenticated
   - token is stored
   - redirect occurs without an extra login step

### Refresh / rehydrate flow

1. `AuthBootstrapper` reads local storage token
2. dispatches `rehydrateSession`
3. `authService.loginWithAccessToken()` calls `POST /auth/login` with `{ accessToken }`
4. Redux state is restored from the backend response

### Logout flow

1. logout button in `DashboardShell` dispatches `logout()`
2. Redux state is cleared
3. stored access token is removed
4. router sends user back to `/`

## Auth State Model

The auth slice supports these states:

- `idle`
- `bootstrapping`
- `authenticated`
- `anonymous`
- `submitting`

These statuses are used for both UI behavior and route protection.

Important state fields:

- `status`
- `user`
- `accessToken`
- `error`

### Why this is useful

- route protection can distinguish between “not logged in” and “still checking”
- forms can show proper busy/loading states
- rehydration behavior stays explicit

## Route Protection Behavior

`src/components/layout/protected-route.tsx`

Behavior:

- if auth status is `idle`, `bootstrapping`, or `submitting`, show a restore/loading screen
- if auth status is `anonymous`, redirect to `/?next=<current-path>`
- if auth status is `authenticated`, render the protected content

This is the core boundary that protects the entire dashboard area.

## Dashboard Shell Workflow

`src/components/layout/dashboard-shell.tsx`

Responsibilities:

- render the authenticated header
- show user greeting
- render dashboard tab navigation
- handle logout
- provide a consistent content frame for all dashboard pages

### Active tab styling

The active tab uses strong brand contrast:

- dark green background
- white text
- subtle shadow

This was adjusted so active-state text stays readable.

## Environment Configuration

### Files

- `.env.example`
- `src/config/env.ts`

### Variables

- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_API_BASE_URL`

### Behavior

`src/config/env.ts` validates environment variables with Zod at startup. If env values are invalid, the app throws early instead of failing later in API calls.

This is a good pattern and should be kept for all future public env variables.

## API Layer

### File

`src/lib/api/http-client.ts`

### Responsibilities

- prepend `env.apiBaseUrl`
- attach `Content-Type: application/json`
- attach `Authorization: Bearer <token>` when provided
- serialize request bodies
- disable fetch caching for API requests
- normalize backend validation errors into a consistent `ApiError`

### Error handling model

`ApiError` includes:

- `status`
- `message`
- `fieldErrors`

`fieldErrors` are derived from backend `issues[]`, which keeps feature forms simpler because they can render errors by field name directly.

### Current API usage pattern

Feature services call `apiRequest()`.

Examples:

- auth feature calls `/auth/*`
- income feature calls `/income/*`

This service-layer pattern should be repeated for future modules.

## Income Module

The income module is currently the best reference for how feature development should happen in this repo.

### Core files

- `src/features/income/components/income-screen.tsx`
- `src/features/income/services/income-service.ts`
- `src/features/income/types/income.ts`
- `src/app/(app)/dashboard/income/page.tsx`

### Backend contract used

The frontend expects:

- `GET /income/categories`
- `GET /income`
- `POST /income`
- `PUT /income/:incomeId`
- `DELETE /income/:incomeId`

with bearer auth.

### Data model

The UI treats the newest backend income record as the active editable plan.

Types include:

- `IncomeCategory`
- `IncomeAllocation`
- `IncomeAllocationView`
- `IncomeView`
- `IncomePayload`

### Income page workflow

1. authenticated user opens `/dashboard/income`
2. `IncomeScreen` fetches:
   - income categories
   - income records
3. newest income record becomes the active plan
4. if no income record exists:
   - show centered empty state
   - let user start by adding income
5. if a plan exists:
   - show total income
   - show allocated and remaining summaries
   - show allocation rows
   - allow inline add/edit/delete actions

### Add entry workflow

1. user clicks `Add entry`
2. row composer appears
3. user selects category and amount
4. client validates:
   - category selected
   - amount > 0
   - no duplicate category
   - total allocated does not exceed total income
5. submit creates or updates the whole plan payload

### Edit entry workflow

1. user clicks edit icon
2. row switches into inline editable mode
3. category and amount become editable
4. save and cancel use icon actions
5. on save, the whole plan is persisted back via `PUT`

### Delete entry workflow

1. user clicks delete icon
2. allocation is removed from the in-memory plan
3. if other rows remain, updated plan is saved via `PUT`
4. if last row is removed, the whole income record is deleted via `DELETE`
5. UI returns to empty state

### Important implementation detail

The backend stores the full income plan, so the frontend updates income by sending the entire current allocation set back to the server. This is important for future maintenance: row-level actions are UI behavior, but backend persistence is plan-level.

## Styling System

### Foundation

All global theme tokens live in `src/app/globals.css`.

Current tokens:

- `--background`
- `--foreground`
- `--surface`
- `--border`
- `--copy-muted`
- `--brand`
- `--brand-strong`

### Design direction

The app currently follows a calm finance-oriented visual language:

- warm light background
- dark readable text
- green brand accents
- soft glass-like white surfaces
- restrained shadows
- rounded controls

### Common UI characteristics

- large rounded surfaces, often `rounded-[24px]` to `rounded-[32px]`
- muted explanatory copy
- brand color reserved for emphasis and actions
- soft shadows, not harsh elevation
- center-aligned auth and empty-state compositions
- compact but readable dashboard navigation

## Code Style and Conventions

### 1. Keep route files thin

Pages under `src/app` should mostly:

- resolve route params/search params
- mount the relevant feature component
- avoid holding business logic

### 2. Organize by feature

Feature-specific code belongs under `src/features/<feature-name>/`.

Recommended internal structure:

- `components/`
- `services/`
- `types/`
- `schemas/`
- `state/` if global feature state is needed later

### 3. Use typed service boundaries

API calls should not be scattered across components. Instead:

- add a feature service file
- define request/response types
- call `apiRequest()`

This keeps fetch behavior consistent and errors easier to handle.

### 4. Validate before dispatching requests

Client-side validation should happen before API submission when possible.

Current examples:

- auth forms use Zod
- income screen uses focused runtime validation helpers

As modules expand, prefer keeping validation close to the feature rather than embedding ad hoc checks throughout JSX.

### 5. Keep shared utilities very small

Current utilities are intentionally lightweight:

- `cn()` for class joining
- `auth-storage.ts` for token persistence

Only promote helpers into `lib/` when they are truly shared.

### 6. Prefer explicit state transitions

The auth slice is a good example:

- each status has meaning
- bootstrapping is separate from submitting
- session persistence happens in one place

Future feature state should try to stay equally explicit.

### 7. Use ASCII-first code and plain naming

The codebase currently uses straightforward English names and avoids overly abstract naming. This should continue.

Good patterns already in use:

- `AuthBootstrapper`
- `ProtectedRoute`
- `DashboardShell`
- `incomeService`
- `rehydrateSession`

## Frontend Workflow for New Features

When adding a new feature, follow this path:

1. define the route shell under `src/app` if needed
2. create the feature folder under `src/features`
3. define types first
4. add a service layer for backend requests
5. build the main feature component
6. keep route wrappers thin
7. use the existing auth token from Redux when calling protected APIs
8. keep validation and API errors visible in the UI

### Suggested pattern for `Expenses`

When the expenses module is built, mirror the income shape:

- `src/features/expenses/types/*`
- `src/features/expenses/services/*`
- `src/features/expenses/components/*`
- route file under `src/app/(app)/dashboard/expenses/page.tsx`

## Known Implementation Decisions

These are intentional choices in the current codebase:

- auth is the public entry point
- dashboard protection is client-side using Redux auth state
- local storage stores only the access token
- session restoration uses backend token login
- the income tab treats only the newest income record as the active editable plan
- `Overview`, `Expenses`, and `AI Advice` are partially scaffolded, not finished feature modules yet

## Gaps / Future Work

The following areas are still open:

- expenses module
- richer overview metrics from live data
- AI advice integration
- shared UI primitives if repeated controls start to multiply
- stronger test coverage
- possible middleware/server-side auth strategy later if the app needs stronger route guarantees

## Local Development

### Setup

1. create `.env` from `.env.example`
2. ensure backend is running separately
3. install dependencies
4. run the app

### Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
```

### Environment example

```env
NEXT_PUBLIC_APP_NAME=Track Expenses & Grow
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
```

## How to Read the Codebase Quickly

If someone is new to the repo, the best reading order is:

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

That sequence explains the app from bootstrap to auth to the current live domain module.

## Recommended Maintenance Rules

- do not put business logic directly into route files
- do not duplicate fetch logic across components
- do not bypass the shared API client for normal JSON requests
- do not introduce new global state unless component or feature-local state is insufficient
- do not add visual styles ad hoc without checking the existing token palette and surface language

## Summary

This frontend already has a solid foundation:

- clear route separation
- stable auth/session handling
- a reusable dashboard shell
- a working backend-integrated feature module

The cleanest path forward is to keep extending it feature-by-feature using the same pattern established by `auth` and `income`.
