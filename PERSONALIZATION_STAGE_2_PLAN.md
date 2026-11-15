# Personalization Stage 2 — Rule → Category Allocation

> **Status:** Plan (not yet implemented).
> **Scope:** After the recommender picks a rule (Stage 1), divide the income across categories inside each rule bucket using a server-owned catalog of weights. Show the allocation to the user, allow per-category edits with bucket-total constraints, persist on APPLY.
> **Out of scope (Stage 3):** comparing this allocation against what's already in the Income tab, applying it to existing income records, migrating legacy category codes.
> **Mental model:** new user, blank slate. Every recommendation run produces a *fresh* allocation from inputs + catalog. The user's prior Income tab plan is not read.

---

## 1. Decisions (final)

| # | Question | Decision | Rationale |
|---|---|---|---|
| 1 | Where does the catalog live? | Backend constants. Exposed via REST. | Same value for all users; editorial content; ships with code, not DB writes. |
| 2 | Same weights across all three rules? | Yes — one set of weights per bucket. | Rule decides bucket %; weights divide within bucket. Simpler data, easier to reason about. Per-rule weights deferred until we have evidence we need them. |
| 3 | Existing category codes (FOOD, EDUCATION, SAVINGS, "Loans") | Keep them as-is. Add new codes alongside. No DB migration. | Stage 2 is greenfield for the personalization flow. Legacy income records keep working. Comparison/migration is Stage 3. |
| 4 | Backend module home | New `src/modules/personalization/` module. | Mirrors the frontend feature split. Keeps the income module focused on user-record CRUD. The catalog endpoint doesn't belong to income any more than it belongs to expenses. |
| 5 | Recommendation freshness | Always generated from inputs + catalog on each run. Never read user's existing income allocations. | User said: "this plan will always show fresh allocation every time." |
| 6 | Edit constraint | Each bucket's total **must equal** its rule slab %. Frontend blocks save if a bucket is over/under. | Matches Stage 1 income tab's behavior (allocations ≤ total). Equal-not-just-≤ keeps the math clean for the visualization. |

---

## 2. Expanded category taxonomy

Existing 11 codes stay (backend `src/modules/income/income.types.ts:1-13`). The personalization catalog defines which codes belong to which bucket and adds new codes where the buckets are thin.

### Bucket assignment for existing codes

| Code | Bucket | Notes |
|---|---|---|
| `HOUSING` | Needs | |
| `UTILITIES` | Needs | |
| `TRANSPORT` | Needs | |
| `HEALTHCARE` | Needs | |
| `FOOD` | Needs | Treated as groceries-equivalent for legacy users. New flow uses `GROCERIES`. |
| `EDUCATION` | Needs | Legacy combined; new flow uses `EDUCATION_KIDS` / `SELF_DEVELOPMENT`. |
| `Loans` | Needs | Pre-existing casing inconsistency. Keep as-is; new flow uses `EMI_LOAN`. |
| `ENTERTAINMENT` | Wants | |
| `SAVINGS` | Save/Invest | |
| `INVESTMENTS` | Save/Invest | |
| `OTHER` | (unassigned) | Catch-all; not part of any rule bucket. |

### New codes to add

**Needs (essentials)**

| Code | Name | Why added |
|---|---|---|
| `GROCERIES` | Groceries | Separate from dining out. |
| `EMI_LOAN` | Loan EMIs | Clean replacement for `"Loans"`. |
| `INSURANCE` | Insurance Premiums | Research §3 — term + health, 0.5–2% of income. |
| `EDUCATION_KIDS` | Children's Education | Split from `EDUCATION`. |
| `CHILDCARE` | Childcare | Research §1 essentials list. |

**Wants (lifestyle)**

| Code | Name | Why added |
|---|---|---|
| `DINING_OUT` | Dining Out | Bucket had only Entertainment. |
| `SUBSCRIPTIONS` | Subscriptions | OTT, apps, memberships. |
| `SHOPPING` | Shopping | Lifestyle upgrades. |
| `TRAVEL` | Travel | Discretionary. |
| `HOBBIES` | Hobbies | |
| `PERSONAL_CARE` | Personal Care | |
| `SELF_DEVELOPMENT` | Self-development | Split from `EDUCATION`. |

**Save / Invest**

| Code | Name | Why added |
|---|---|---|
| `EMERGENCY_FUND` | Emergency Fund | Pyramid layer 1 (Research §2). Highest priority. |
| `RETIREMENT` | Retirement | PPF/EPF/NPS — pyramid layer 3. |
| `DEBT_PREPAYMENT` | Debt Prepayment | Pyramid layer 2. |
| `GOAL_SAVINGS` | Goal-based Savings | Short/medium term goals — pyramid layer 4. |

After this, the catalog has **24 codes across 3 buckets** (8 / 8 / 6) plus `OTHER` unassigned. The legacy 11 codes remain valid for old income records.

---

## 3. Catalog data shape (backend)

```ts
// src/modules/personalization/personalization.catalog.ts

export const BUDGET_RULES = ["50/30/20", "60/20/20", "70/20/10"] as const;
export type BudgetRule = (typeof BUDGET_RULES)[number];

export type RuleBucketPercents = {
  needs: number;
  wants: number;
  saveInvest: number;
};

export const ruleBucketPercents: Record<BudgetRule, RuleBucketPercents> = {
  "50/30/20": { needs: 50, wants: 30, saveInvest: 20 },
  "60/20/20": { needs: 60, wants: 20, saveInvest: 20 },
  "70/20/10": { needs: 70, wants: 20, saveInvest: 10 },
};

export type BucketKey = "needs" | "wants" | "saveInvest";

export type BucketCategoryDefault = {
  code: string;        // matches IncomeCategoryCode (existing + new)
  name: string;
  weight: number;      // 0–100, integer, sums to 100 per bucket
};

export const bucketCategories: Record<BucketKey, {
  name: string;        // display name e.g. "Needs"
  categories: BucketCategoryDefault[];
}> = {
  needs: {
    name: "Needs",
    categories: [
      { code: "HOUSING",        name: "Housing / Rent",        weight: 30 },
      { code: "EMI_LOAN",       name: "Loan EMIs",             weight: 20 },
      { code: "GROCERIES",      name: "Groceries",             weight: 15 },
      { code: "UTILITIES",      name: "Utilities",             weight: 8  },
      { code: "TRANSPORT",      name: "Transport",             weight: 8  },
      { code: "HEALTHCARE",     name: "Healthcare",            weight: 7  },
      { code: "INSURANCE",      name: "Insurance Premiums",    weight: 7  },
      { code: "EDUCATION_KIDS", name: "Children's Education",  weight: 5  },
    ], // sum = 100
  },
  wants: {
    name: "Wants",
    categories: [
      { code: "DINING_OUT",       name: "Dining Out",       weight: 20 },
      { code: "ENTERTAINMENT",    name: "Entertainment",    weight: 15 },
      { code: "SHOPPING",         name: "Shopping",         weight: 15 },
      { code: "TRAVEL",           name: "Travel",           weight: 15 },
      { code: "SUBSCRIPTIONS",    name: "Subscriptions",    weight: 10 },
      { code: "HOBBIES",          name: "Hobbies",          weight: 10 },
      { code: "PERSONAL_CARE",    name: "Personal Care",    weight: 8  },
      { code: "SELF_DEVELOPMENT", name: "Self-development", weight: 7  },
    ], // sum = 100
  },
  saveInvest: {
    name: "Save / Invest",
    categories: [
      { code: "INVESTMENTS",     name: "Investments (SIP / MF)", weight: 30 },
      { code: "EMERGENCY_FUND",  name: "Emergency Fund",         weight: 25 },
      { code: "RETIREMENT",      name: "Retirement",             weight: 20 },
      { code: "DEBT_PREPAYMENT", name: "Debt Prepayment",        weight: 10 },
      { code: "GOAL_SAVINGS",    name: "Goal-based Savings",     weight: 10 },
      { code: "SAVINGS",         name: "General Savings",        weight: 5  },
    ], // sum = 100
  },
};
```

**Invariant the catalog must satisfy:** for each bucket, `sum(weight) === 100`. Add a startup assertion in the backend to catch drift when someone edits the file.

---

## 4. API contract

### `GET /personalization/rule-catalog`

Public to authenticated users. Returns the full catalog so the frontend can render any rule without follow-up calls.

**Response 200**
```json
{
  "rules": [
    { "code": "50/30/20", "buckets": { "needs": 50, "wants": 30, "saveInvest": 20 } },
    { "code": "60/20/20", "buckets": { "needs": 60, "wants": 20, "saveInvest": 20 } },
    { "code": "70/20/10", "buckets": { "needs": 70, "wants": 20, "saveInvest": 10 } }
  ],
  "buckets": {
    "needs": {
      "name": "Needs",
      "categories": [
        { "code": "HOUSING", "name": "Housing / Rent", "weight": 30 },
        { "code": "EMI_LOAN", "name": "Loan EMIs", "weight": 20 }
      ]
    },
    "wants": { "name": "Wants", "categories": [...] },
    "saveInvest": { "name": "Save / Invest", "categories": [...] }
  }
}
```

No path/query params. No mutations. Standard 401 from auth middleware applies.

### Income categories endpoint

`GET /income/categories` keeps returning the legacy list **plus** the new codes (so the Income tab can also use the expanded list when it eventually wants to). Source of truth for the union list is `incomeCategories` in `income.types.ts` — extend that array with the new codes from §2.

---

## 5. Allocation math (frontend, pure function)

```ts
// src/features/personalization/utils/build-allocation.ts

import type { BudgetRule } from "@/features/personalization/types/personalization";
import type { RuleCatalog } from "@/features/personalization/types/rule-catalog";

export type CategoryAllocation = {
  bucket: "needs" | "wants" | "saveInvest";
  code: string;
  name: string;
  weight: number;   // editable
  amount: number;   // derived: bucketTotal * weight / 100, rounded
};

export type BucketAllocation = {
  key: "needs" | "wants" | "saveInvest";
  name: string;
  percent: number;     // from rule
  total: number;       // income * percent / 100
  categories: CategoryAllocation[];
};

export type RuleAllocation = {
  rule: BudgetRule;
  monthlyTakeHome: number;
  buckets: BucketAllocation[];
};

export function buildAllocation(
  rule: BudgetRule,
  monthlyTakeHome: number,
  catalog: RuleCatalog,
): RuleAllocation {
  const rulePercents = catalog.rules.find(r => r.code === rule)!.buckets;

  const makeBucket = (key: "needs" | "wants" | "saveInvest"): BucketAllocation => {
    const percent = rulePercents[key];
    const total = Math.round(monthlyTakeHome * percent / 100);
    const def = catalog.buckets[key];
    return {
      key,
      name: def.name,
      percent,
      total,
      categories: def.categories.map(c => ({
        bucket: key,
        code: c.code,
        name: c.name,
        weight: c.weight,
        amount: Math.round(total * c.weight / 100),
      })),
    };
  };

  return {
    rule,
    monthlyTakeHome,
    buckets: [makeBucket("needs"), makeBucket("wants"), makeBucket("saveInvest")],
  };
}
```

### Rounding behavior

Per-category amounts are rounded individually with `Math.round`. The sum of category amounts inside a bucket may drift ±1–2 from the bucket total due to rounding. Acceptable for display. **Do not** add a "fix-up the last row" hack — surface the bucket total separately and let the user see both numbers. (If we add a per-bucket "remaining" indicator later, this gives us an honest source for that delta.)

---

## 6. Edit semantics (frontend)

When the recommendation renders, each category row shows:
- Category name
- Editable weight (`%` input, 0–100)
- Computed amount (read-only, updates as weight changes)

**Per-bucket constraint:** `sum(weight in bucket) === 100`. APPLY is disabled until all three buckets satisfy this. Helper text under each bucket: `Needs allocation: 100% (or "97% — needs +3% to save")`.

**Why equal not ≤:** unlike the Income tab where users can leave headroom under their total, the personalization recommendation divides a *fixed* slab percentage. Leaving 5% of the Needs bucket unallocated has no meaningful interpretation — it's not income that goes elsewhere, it's income that disappears. Force-equal keeps the math truthful.

Reset button per bucket — restores weights from `catalog.buckets[key].categories[*].weight`. Useful escape hatch when the user has fiddled.

---

## 7. Frontend module changes

### New files (under `src/features/personalization/`)

| Path | Purpose |
|---|---|
| `types/rule-catalog.ts` | `RuleCatalog`, `BucketKey`, `CategoryDefault` types matching backend response |
| `services/personalization-service.ts` | `getRuleCatalog(token)` wrapping `apiRequest` |
| `utils/build-allocation.ts` | Pure function from §5 |
| `components/allocation-section.tsx` | Renders the 3 buckets, owns edit state, computes APPLY enablement |
| `components/allocation-bucket-card.tsx` | One bucket — header (name, %, total), category rows, reset button, sum indicator |
| `components/allocation-category-row.tsx` | Name, weight input, computed amount |

### Modified files

| Path | Change |
|---|---|
| `state/personalization-slice.ts` | Add `catalog: RuleCatalog \| null`, `catalogStatus: 'idle' \| 'loading' \| 'ready' \| 'error'`. Thunk `loadRuleCatalog`. Extend `savedProfile` payload to include `allocations` (per-bucket edited weights). |
| `types/personalization.ts` | Extend `PersonalizationProfile` to include `allocations: RuleAllocation` (or just the edited weight map, see §8). |
| `utils/personalization-storage.ts` | No code change, but the stored JSON shape changes — bump storage key to `track-expenses-grow.personalizationProfile.v2` to avoid loading stale v1 shape into the new code. v1 entries are silently discarded. |
| `components/grow-screen.tsx` | After valid form submit, dispatch `loadRuleCatalog` (if not loaded) then render `<AllocationSection rule={recommendation.rule} income={inputs.monthlyTakeHome} />` below the existing rule display. |
| `components/budget-recommender-section.tsx` | APPLY now also includes the edited allocations in the saved profile. |

### Catalog fetch timing

Fetch lazily: only when the user submits the recommender form for the first time in a session. Cache in Redux for the rest of the session. Don't fetch on `AuthBootstrapper` — most users won't reach the recommender on any given visit.

---

## 8. What we persist on APPLY

Extend `PersonalizationProfile`:

```ts
export type SavedAllocation = {
  bucket: BucketKey;
  code: string;
  weight: number;        // user-edited
  // amount intentionally NOT persisted — re-derive from income on read
};

export type PersonalizationProfile = {
  inputs: RecommenderInputs;
  recommendation: BudgetRecommendation;
  allocations: SavedAllocation[];   // NEW — flat list across all 3 buckets
  savedAt: string;
};
```

**Why not persist amounts:** they're a pure function of `(income × rulePct × weight)`. Persisting them invites drift if the user changes income later. Re-derive on read.

**Why flat (not nested by bucket):** matches the eventual `IncomeAllocation` shape from the Income tab, which makes Stage 3's diff easier. Bucket is carried on each row so we don't need a code→bucket lookup at read time.

---

## 9. Build sequence (5 phases)

**Phase 1 — Backend catalog module**
- Create `src/modules/personalization/personalization.catalog.ts` with the data from §3.
- Create `src/modules/personalization/personalization.routes.ts` with `GET /rule-catalog`.
- Wire the routes into `src/app.ts` (mount under `/personalization`, auth middleware applied).
- Extend `incomeCategories` in `src/modules/income/income.types.ts` with the 16 new codes from §2.
- Add a startup assertion: each bucket's weights sum to 100.
- ✅ Verify: `curl -H "Authorization: Bearer $TOKEN" $API/personalization/rule-catalog` returns the full shape. `GET /income/categories` returns the union list.

**Phase 2 — Frontend types + service**
- `types/rule-catalog.ts`
- `services/personalization-service.ts`
- Extend slice: `catalog`, `catalogStatus`, `loadRuleCatalog` thunk.
- ✅ Verify: dispatch `loadRuleCatalog` manually in dev (Redux DevTools), confirm `catalog` populates.

**Phase 3 — Allocation builder (pure)**
- `utils/build-allocation.ts` from §5.
- ✅ Verify: trace `buildAllocation("60/20/20", 50000, catalog)` against expected: Needs total 30000, Housing 9000, EMI 6000, etc.

**Phase 4 — UI components**
- `allocation-category-row.tsx`, `allocation-bucket-card.tsx`, `allocation-section.tsx`.
- Wire into `grow-screen.tsx` below the existing rule display — lazy-fetch catalog on first render.
- Per-bucket sum indicator + reset button.
- APPLY disabled until all three buckets sum to 100.
- ✅ Verify: rule renders, edit weights, see amounts recompute, bucket sums shown, reset works.

**Phase 5 — Persistence**
- Extend `PersonalizationProfile` + storage to v2 key.
- APPLY persists edited allocations alongside inputs+recommendation.
- On revisit, pre-fill weights from `savedProfile.allocations` instead of catalog defaults.
- ✅ Verify: edit weights, APPLY, refresh page, weights restored. Logout clears.

---

## 10. Frontend ↔ backend split (commit pattern)

Backend PR ships first (Phase 1). Frontend PR (Phases 2–5) depends on it. Coordinate the merge order — the frontend will 404 against an unupdated dev API.

Don't gate the frontend behind a feature flag for this — the personalization screen already exists; the new UI just won't render until the catalog endpoint responds. Acceptable interim behavior: show a loading state until catalog loads, error state on 404.

---

## 11. Out of scope (Stage 3)

- Comparing this allocation against the user's existing Income tab plan.
- Applying the personalization allocation to `/income` (`POST` or `PUT`).
- Showing diffs ("you have ₹X in Wants, we recommend ₹Y").
- Migrating existing `FOOD`, `EDUCATION`, `"Loans"` codes — those still exist on legacy income records and we don't touch them.
- Per-rule weight variation.
- Admin UI for editing the catalog.
- Pyramid-aware Save/Invest fill order (research §4 — interesting but big enough to be its own stage).

---

## 12. Open questions to confirm before implementation

1. **`OTHER` category** — leave fully unassigned, or assign it to Wants as a default? Currently unassigned in §3. I'd leave it unassigned and stop showing it in the personalization flow — the Income tab can still use it.
2. **Weight input UX** — slider, stepper, or free-form `%` input? Free-form `%` integer input is cheapest to build, matches Income tab's amount input style. Recommend that.
3. **What happens if backend catalog drifts from frontend types** — e.g. backend adds a new code we don't know about? Frontend should render unknown codes by `code` as name fallback rather than crashing. Add a Zod schema for catalog response so we fail loudly in dev if shape changes.
4. **Reset scope** — "reset bucket" only, or also "reset all"? Recommend bucket-level only; "reset all" is one re-submit of the form away.

Resolve these and Phase 1 can start.
