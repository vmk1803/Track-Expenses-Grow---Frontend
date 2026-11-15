# Personalization Feature — Stage 1 Implementation Plan

> **Status:** Plan (not yet implemented). Frontend-only, no backend changes.
> **Scope:** Rename `AI Advice` → `Personalization`, add a **Grow** sub-page (proven budget-planning practices) with educational content + interactive budget-rule recommender. APPLY persists to localStorage only — Income tab is **not** modified in Stage 1.
> **Inputs to this plan:** `CLAUDE.md`, `AGENTS.md`, `LIFESTYLE_PLANNING_RESEARCH.md`, architect agent blueprint, reviewer agent feedback.

---

## 1. Decisions (final)

| # | Question | Decision | Rationale |
|---|---|---|---|
| 1 | What does APPLY do? | Persist `PersonalizationProfile` (inputs **+** recommendation) to Redux + localStorage. Income tab untouched. | Research doc says "descriptive first, prescriptive later." Cross-feature wiring is Stage 2. |
| 2 | Route layout | Nested: `/dashboard/personalization` (landing) + `/dashboard/personalization/grow`. | Deep-linkable, zero state plumbing, inherits dashboard layout for free. |
| 3 | Slug rename | Yes — delete `ai-advice` route, create `personalization`. | No external traffic. Avoids permanent label/URL mismatch. |
| 4 | Feature module shape | `src/features/personalization/{components,utils,schemas,state,types}/`. **No `lib/`** (uses `utils/` to stay aligned with canonical conventions). **No `services/`** (no API). | `lib/` is reserved for `src/lib/` per CLAUDE.md. AGENTS.md will be updated to mention `utils/` as an allowed feature subdirectory. |
| 5 | Recommender logic location | `src/features/personalization/utils/recommend-budget-rule.ts` — pure function. | Testable, zero deps. |
| 6 | Form validation | Zod schema in `schemas/recommender-schemas.ts`. Mirror `auth-schemas.ts` (not `income`, which uses runtime helpers). | Field-oriented inputs (enum + bounded ints) — exactly where Zod earns its keep. |

### Product decisions (defaults — override if you disagree)

| # | Question | Default | Why |
|---|---|---|---|
| P1 | Post-APPLY behavior | Stay on page. Button transitions `APPLY` → `Saved ✓` for 2s → `Update`. Landing card shows a "Saved" badge with date. | Cheaper than a toast component; no new primitives needed. |
| P2 | AI Advice future home | Will return later as a separate feature with its own route. `ai-advice` is removed from the placeholder list in docs. | The brief explicitly separates AI Advice (in progress) from Grow (proven practices). |
| P3 | Multi-user safety | Clear personalization profile on logout — extend `logout` thunk (or AuthBootstrapper on `anonymous` transition) to call `clearStoredPersonalizationProfile()`. | Cheap to add now; prevents Person B from seeing Person A's data on shared devices. |
| P4 | Pre-fill UX | Form inputs **and** the prior recommendation pre-fill on revisit. Recommendation shows as a "Last saved on DD MMM YYYY" banner above the form. User clicks "Recalculate" to re-run. | Avoids the "blank result, did it break?" UX issue. |
| P5 | Keep the two-card landing? | Yes. The disabled AI Advice card communicates the roadmap and frames the future. | Removing it now means re-adding it later when AI Advice ships. |

---

## 2. Files

### Create (11 files)

| Path | Purpose |
|---|---|
| `src/app/(app)/dashboard/personalization/page.tsx` | Thin route — mounts `PersonalizationLanding` |
| `src/app/(app)/dashboard/personalization/grow/page.tsx` | Thin route — mounts `GrowScreen` |
| `src/features/personalization/types/personalization.ts` | `CityTier`, `BudgetRule`, `RecommenderInputs`, `BudgetRecommendation`, `PersonalizationProfile` |
| `src/features/personalization/schemas/recommender-schemas.ts` | Zod schema + `validateRecommenderInputs()` |
| `src/features/personalization/utils/recommend-budget-rule.ts` | Pure recommender function |
| `src/features/personalization/utils/personalization-storage.ts` | `readStoredProfile` / `writeStoredProfile` / `clearStoredProfile` (JSON + try/catch) |
| `src/features/personalization/state/personalization-slice.ts` | Redux slice: `savedProfile`, `saveProfile`, `rehydrateProfile`, `clearProfile` |
| `src/features/personalization/components/personalization-landing.tsx` | Two-card landing (AI Advice disabled + Grow linked); reads `savedProfile` to show "Saved" badge |
| `src/features/personalization/components/grow-screen.tsx` | Composes the 2 sections; owns dispatch + selector |
| `src/features/personalization/components/budget-frameworks-section.tsx` | Static read-only educational content (server component) |
| `src/features/personalization/components/budget-recommender-section.tsx` | Form + recommendation result + APPLY |

### Modify (5 files)

| Path | Change |
|---|---|
| `src/app/(app)/dashboard/ai-advice/page.tsx` | Delete entire directory |
| `src/components/layout/dashboard-shell.tsx` | (a) Replace nav entry `ai-advice/AI Advice` with `personalization/Personalization`. (b) Update active-tab match — see §3.1. |
| `src/lib/store/store.ts` | Register `personalization: personalizationReducer` |
| `src/components/auth/auth-bootstrapper.tsx` | Dispatch `rehydrateProfile(readStoredProfile())` on mount. Clear stored profile when auth transitions to `anonymous`. |
| `src/features/auth/state/auth-slice.ts` *(or AuthBootstrapper)* | On logout, call `clearStoredPersonalizationProfile()`. Pick whichever location stays closer to the existing pattern. |

### Docs to update

| Path | Change |
|---|---|
| `CLAUDE.md` | Remove `ai-advice` from the "placeholders exist" list (line 89). Mention `utils/` is an allowed feature subdirectory. |
| `AGENTS.md` | Update file tree (line 64) and route list (line 160). Add `utils/` to feature subdirectory list (lines 120–125). |
| `docs/codebase-guide.md` | Update file tree (line 50) and route list (line 138). |

---

## 3. Critical implementation details

### 3.1 Active-tab fix — exact code

In `src/components/layout/dashboard-shell.tsx`, replace the `pathname === item.href` check:

```ts
const isActive =
  pathname === item.href ||
  pathname.startsWith(item.href + "/");
```

Handles both exact matches (`/dashboard/personalization`) and sub-routes (`/dashboard/personalization/grow`). The `+ "/"` suffix prevents false positives like `/dashboard/incomes` matching `/dashboard/income`.

### 3.2 SSR-safe slice rehydration

**Do NOT read localStorage inside `initialState`.** Mirror the auth pattern:

```ts
// personalization-slice.ts
const initialState: PersonalizationState = { savedProfile: null };

const slice = createSlice({
  name: "personalization",
  initialState,
  reducers: {
    saveProfile(state, action: PayloadAction<PersonalizationProfile>) {
      state.savedProfile = action.payload;
      writeStoredProfile(action.payload);
    },
    rehydrateProfile(state, action: PayloadAction<PersonalizationProfile | null>) {
      state.savedProfile = action.payload;
    },
    clearProfile(state) {
      state.savedProfile = null;
      clearStoredProfile();
    },
  },
});
```

In `AuthBootstrapper` (already `"use client"` with `useEffect`):

```ts
useEffect(() => {
  dispatch(rehydrateProfile(readStoredProfile()));
}, [dispatch]);
```

`readStoredProfile()` guards `typeof window`, wraps `JSON.parse` in try/catch, clears the key on parse failure, returns `null` on any error.

### 3.3 Storage helper — explicit try/catch

`src/features/personalization/utils/personalization-storage.ts`:

```ts
const KEY = "track-expenses-grow.personalizationProfile";

export function readStoredProfile(): PersonalizationProfile | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersonalizationProfile;
  } catch {
    window.localStorage.removeItem(KEY); // self-heal on corruption
    return null;
  }
}

export function writeStoredProfile(profile: PersonalizationProfile): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(profile));
}

export function clearStoredProfile(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
```

### 3.4 Documentation cleanup

After deleting the `ai-advice` route, grep and update **every** occurrence in the same commit:

```bash
grep -rn "ai-advice" --include="*.md" --include="*.ts" --include="*.tsx" .
```

Confirmed locations: `CLAUDE.md:89`, `AGENTS.md:64,160`, `docs/codebase-guide.md:50,138`.

### 3.5 `utils/` directory naming

Use `src/features/personalization/utils/` (not `lib/`). Add one sentence to `AGENTS.md` feature-structure section: *"Feature-internal pure helpers may live in a `utils/` subdirectory."* Minimal docs change that legitimizes the directory.

---

## 4. Type definitions (final)

```ts
// src/features/personalization/types/personalization.ts

export type CityTier = "metro" | "tier2" | "tier3";

export type BudgetRule = "50/30/20" | "60/20/20" | "70/20/10";

export type RecommenderInputs = {
  monthlyTakeHome: number;   // ₹, positive
  cityTier: CityTier;
  dependents: number;        // 0–10 (UI shows "5+" but submits 5)
  monthlyEmi: number;        // ₹, ≥ 0
  age: number;               // 18–70, integer
};

export type BudgetRecommendation = {
  rule: BudgetRule;
  needsPct: number;          // e.g. 60
  wantsPct: number;          // e.g. 20
  saveInvestPct: number;     // e.g. 20
  needsAmount: number;       // ₹, rounded
  wantsAmount: number;       // ₹, rounded
  saveInvestAmount: number;  // ₹, rounded
  rationale: string;         // one sentence
};

export type PersonalizationProfile = {
  inputs: RecommenderInputs;
  recommendation: BudgetRecommendation;
  savedAt: string;           // ISO timestamp
};
```

**Note on `dependents`:** kept as `number`, not a union with `"5+"`. UI shows a select with options 0/1/2/3/4/5+ where "5+" submits the value `5`. Keeps persisted Redux/localStorage shape clean.

---

## 5. Recommender algorithm

```ts
// src/features/personalization/utils/recommend-budget-rule.ts

export function recommendBudgetRule(inputs: RecommenderInputs): BudgetRecommendation {
  const emiBurden = inputs.monthlyTakeHome > 0
    ? inputs.monthlyEmi / inputs.monthlyTakeHome
    : 0;

  let score = 0;
  if (inputs.cityTier === "metro") score += 1;
  if (inputs.dependents >= 1) score += 1;          // couple/dependent = family-income tier
  if (emiBurden >= 0.25) score += 1;

  // Early-career boost: under-30s with any pressure get nudged stricter
  if (inputs.age < 30 && score >= 1 && score < 3) score += 1;

  // Older-adult relief: 55+ with no pressure points → most flexible rule
  if (inputs.age >= 55 && score <= 1 && emiBurden < 0.1) score = 0;

  const rule: BudgetRule =
    score === 0 ? "50/30/20" :
    score === 1 ? "60/20/20" :
    "70/20/10";

  const [needsPct, wantsPct, saveInvestPct] = rule.split("/").map(Number);

  return {
    rule,
    needsPct, wantsPct, saveInvestPct,
    needsAmount: Math.round(inputs.monthlyTakeHome * needsPct / 100),
    wantsAmount: Math.round(inputs.monthlyTakeHome * wantsPct / 100),
    saveInvestAmount: Math.round(inputs.monthlyTakeHome * saveInvestPct / 100),
    rationale: rationaleFor(rule),
  };
}

function rationaleFor(rule: BudgetRule): string {
  switch (rule) {
    case "50/30/20": return "Comfortable income with low fixed costs — balanced default split.";
    case "60/20/20": return "Moderate fixed costs or city cost of living — needs bucket widens.";
    case "70/20/10": return "High fixed costs, dependents, or early career — prioritize essentials first.";
  }
}
```

**Deliberately out of scope:** the 40/30/30 "high earner" rule. Stage 1 has no high-earner signal in the input set; needs an income-tier input. Defer to Stage 2.

---

## 6. Component tree

### `/dashboard/personalization`

```
DashboardLayout (auto)
  └─ ProtectedRoute
      └─ DashboardShell
          └─ PersonalizationLanding [client — reads savedProfile selector]
              ├─ Card: "AI Advice"           [disabled, "Coming soon" badge]
              └─ Card: "Grow"  [Link]
                  └─ shows "Saved DD MMM YYYY" badge if savedProfile exists
```

### `/dashboard/personalization/grow`

```
DashboardLayout (auto)
  └─ ProtectedRoute
      └─ DashboardShell
          └─ GrowScreen [client — owns dispatch + selector]
              ├─ Back link → /dashboard/personalization
              ├─ Heading
              ├─ BudgetFrameworksSection           [server-safe, static]
              │   └─ FrameworkCard × 3 (50/30/20, 60/20/20, 70/20/10)
              └─ BudgetRecommenderSection [props: savedProfile, onApply]
                  ├─ SavedRecommendationBanner    [conditional — if savedProfile]
                  ├─ RecommenderForm              [controlled, string inputs]
                  └─ RecommendationResult         [conditional — after valid submit]
                      ├─ RuleDisplay (rule + ₹ breakdown + rationale)
                      └─ APPLY button (transitions "APPLY" → "Saved ✓" → "Update")
```

---

## 7. Data flow

### Recommender submit → APPLY

```
User fills form (string inputs)
  → local useState in BudgetRecommenderSection
  → onSubmit:
      parsed = { monthlyTakeHome: Number(...),
                 dependents: parseInt(..., 10),
                 monthlyEmi: Number(...),
                 age: parseInt(..., 10),
                 cityTier }
  → validateRecommenderInputs(parsed)   [Zod]
      invalid → setFieldErrors, halt
      valid   → recommendBudgetRule(parsed)
  → setLocalRecommendation(result)
  → user clicks APPLY
  → onApply({ inputs: parsed, recommendation: result, savedAt: ISO })
      ↳ GrowScreen dispatches saveProfile(profile)
          ↳ slice updates state + writeStoredProfile()
  → button shows "Saved ✓" for 2s, then "Update"
```

### Page mount with existing profile

```
AuthBootstrapper mounts (already runs on app load)
  → dispatch(rehydrateProfile(readStoredProfile()))
  → state.personalization.savedProfile populated

User navigates to /dashboard/personalization/grow
  → GrowScreen reads savedProfile via useAppSelector
  → BudgetRecommenderSection receives savedProfile as prop
  → form pre-fills inputs from savedProfile.inputs
  → SavedRecommendationBanner shows "Last saved: 60/20/20 on 27 May 2026"
  → user can edit inputs and click "Recalculate"
```

### Logout cleanup

```
User clicks logout
  → existing logout thunk fires
  → on completion / on anonymous transition
  → clearStoredPersonalizationProfile() + dispatch(clearProfile())
```

---

## 8. Build sequence (8 phases — each ends in a verifiable state)

**Phase 1 — Route rename & docs**
- Delete `src/app/(app)/dashboard/ai-advice/`
- Create `src/app/(app)/dashboard/personalization/page.tsx` with temporary inline placeholder
- Update `dashboard-shell.tsx` nav entry + active-tab logic
- Update `CLAUDE.md`, `AGENTS.md`, `docs/codebase-guide.md`
- ✅ **Verify:** `npm run dev` → nav shows "Personalization", `/dashboard/ai-advice` 404s, `/dashboard/personalization` renders placeholder, no console errors

**Phase 2 — Types & schemas**
- `types/personalization.ts`
- `schemas/recommender-schemas.ts`
- ✅ **Verify:** `npm run build` compiles

**Phase 3 — Pure logic**
- `utils/recommend-budget-rule.ts`
- ✅ **Verify:** trace several input combinations by hand against §5

**Phase 4 — Storage + slice**
- `utils/personalization-storage.ts`
- `state/personalization-slice.ts`
- Register reducer in `src/lib/store/store.ts`
- Wire `rehydrateProfile` dispatch into `AuthBootstrapper`
- ✅ **Verify:** Redux DevTools shows `personalization.savedProfile: null` on first load

**Phase 5 — Landing page**
- `components/personalization-landing.tsx`
- Replace placeholder in `personalization/page.tsx`
- ✅ **Verify:** two cards render, AI Advice visually disabled with "Coming soon", Grow links to sub-route

**Phase 6 — Educational section**
- `components/budget-frameworks-section.tsx`
- ✅ **Verify:** renders three framework cards from research doc §1

**Phase 7 — Recommender section**
- `components/budget-recommender-section.tsx` (form + result, no APPLY wiring yet)
- ✅ **Verify:** form validates, recommendation appears with correct ₹ breakdown

**Phase 8 — Sub-page assembly + APPLY**
- `components/grow-screen.tsx`
- `app/(app)/dashboard/personalization/grow/page.tsx`
- Wire APPLY → dispatch → localStorage → banner update
- Wire logout cleanup
- ✅ **Verify:** full loop — submit form, click APPLY, refresh page, see "Saved" badge on landing card and pre-filled form on sub-page. Logout clears the badge.

---

## 9. Out of scope (Stage 1)

- **Pre-filling the Income tab** from the recommendation — Stage 2.
- **40/30/30 high-earner rule** — needs an income-tier input.
- **Financial Planning Pyramid UI** (foundation/debt/investments/wealth layers) — research doc §2, future stage.
- **Lifestyle Resilience Score** — needs expense actuals, insurance data, EF balance.
- **Stage 2 recommender inputs** — job stability, existing insurance, current EF balance.
- **Server-side persistence** of the profile.
- **Toast/notification component** — inline button-state transition only.
- **AI Advice actual content** — placeholder only.

---

## 10. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Active-tab `startsWith` introduces false positive on future route | Low | Low | Suffix `+ "/"` check (§3.1) |
| SSR hydration mismatch from localStorage read | Med if done wrong | High | No localStorage in `initialState`; bootstrapper-only (§3.2) |
| Stale `ai-advice` references after rename | Med | Low (docs only) | Grep checklist in §3.4 |
| User confusion when re-visiting (empty result area) | Med | Med | Pre-fill recommendation banner (P4) |
| Logout leaves profile visible to next user | Med (shared device) | Med | Clear on logout (P3, §3.2) |
| `utils/` directory deviates from doc convention | Low | Low | Update `AGENTS.md` in same commit (§3.5) |

---

## 11. Next steps

After this plan is approved:

1. Confirm or override the 5 product defaults (P1–P5) in §1.
2. Execute Phase 1 → Phase 8 in order. Each phase is a logical commit.
3. After Phase 8 ships, the natural Stage 2 starting point is wiring the saved `PersonalizationProfile` into the Income tab's plan total/categories as a pre-fill option.
