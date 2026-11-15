# Lifestyle Planning — Research & Weightage Model

> Research foundation for expanding **Track Expenses & Grow** from budget tracking into a holistic lifestyle planning tool. Source-backed budgeting frameworks, India-specific sizing rules, and a proposed weightage engine for the upcoming `lifestyle-plan` feature module.

---

## 1. The three load-bearing budget frameworks

All three split *take-home (post-tax)* income into Needs / Wants / Save-Invest. The right rule depends on income tier, city, and life stage.

| Rule         | Needs | Wants | Save / Invest | Best fit                              |
| ------------ | ----- | ----- | ------------- | ------------------------------------- |
| **50/30/20** | 50%   | 30%   | 20%           | Default, comfortable income           |
| **60/20/20** | 60%   | 20%   | 20%           | Tier-1 city, EMIs, family commitments |
| **70/20/10** | 70%   | 20%   | 10%           | Early career, low income, high rent   |

**Key insight:** The rule should *bend with income tier*, not stay fixed. Indians on average now spend ~55% on basics vs <45% a decade ago — so a static 50/30/20 is unrealistic for many.

### Category definitions

- **Needs** — housing/EMI, utilities, groceries, transport, insurance premiums, childcare, essential healthcare.
- **Wants** — dining out, OTT/streaming, hobbies, travel, gadgets, lifestyle upgrades.
- **Save/Invest** — emergency fund top-ups, retirement contributions, mutual fund SIPs, debt prepayment.

---

## 2. The Financial Planning Pyramid (priority order)

**Order matters more than percentages.** Lower layers must be filled before higher layers receive allocation. This is the missing scaffold for weightage logic.

```
        ┌─────────────────┐
        │  4. Wealth /    │   Speculative, real estate, alpha
        │     Growth      │
        ├─────────────────┤
        │  3. Core        │   Retirement, kids' education,
        │     Investments │   long-term equity SIPs, PPF/EPF/NPS
        ├─────────────────┤
        │  2. Debt        │   Pay off high-interest debt
        │     Management  │   (credit card, personal loans)
        ├─────────────────┤
        │  1. Foundation  │   Emergency fund, health insurance,
        │  (Protection &  │   term insurance — MUST-HAVE,
        │   Liquidity)    │   non-negotiable
        └─────────────────┘
```

This mirrors Maslow's hierarchy: safety needs first, self-actualization last. A user with no health insurance but ₹10L in equity is *fragile*, not wealthy.

---

## 3. India-specific sizing rules (the "minimum essentials")

| Essential                       | Common thumb rule              | Refined / better rule                                                                                                                          |
| ------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Emergency fund**              | 6 months of essential expenses | 3 mo (single/stable job) → 6 mo (couple) → 12 mo (family/single income/volatile job)                                                           |
| **Health insurance (floater)**  | ₹5–10L minimum                 | ₹10–15L in metros; add a ₹25–50L super top-up; bump sum insured when parents are added                                                         |
| **Term insurance**              | 10× annual income              | **Needs-based**: (annual expenses × years till kids independent) + outstanding loans + education corpus − existing assets − spouse's earnings  |
| **Retirement corpus**           | 25× annual expenses (4% SWR)   | **30–40× for India** — driven by 6–7% structural inflation and 10–12% healthcare inflation                                                     |
| **Insurance premium spend**     | —                              | Term: ~0.5–1% of annual income; Health: ~1–2% of annual income                                                                                 |
| **Equity : Debt allocation**    | —                              | "100 − age = equity %" (e.g. age 30 → 70% equity, 30% debt). Aggressive variant: "120 − age".                                                  |

### Emergency fund composition (where to park it)

- **30%** in savings account — instant access, 3–4% return
- **30%** in fixed deposits — moderate access, 6–7% return
- **40%** in liquid mutual funds — 1-day liquidity, 6–7% return, beats inflation

### Goal-bucketing by horizon

- **Short-term (<3 years):** debt mutual funds, FD, RD
- **Medium-term (3–7 years):** hybrid funds, balanced advantage funds
- **Long-term (>7 years):** equity mutual funds, index funds, ELSS

---

## 4. Proposed weightage engine for the app

A two-stage allocation pipeline.

### Stage 1 — Split take-home into top-level buckets

Auto-suggest a budget tier from user inputs (income, city, dependents, EMIs):

| User profile                                | Suggested split |
| ------------------------------------------- | --------------- |
| Early career, Tier-1 city, paying rent      | 70 / 20 / 10    |
| Mid-career, EMIs, family                    | 60 / 20 / 20    |
| Established, low fixed costs                | 50 / 30 / 20    |
| High earner, low expenses                   | 40 / 30 / 30    |

User can override — the suggestion is a starting point, not a lock-in.

### Stage 2 — Pyramid-priority allocation inside Save/Invest bucket

Fill bottom-up. Each layer is "completed" before the next gets a meaningful share:

1. **Emergency fund** — drip until target month-count is hit (highest priority).
2. **Insurance premiums** — health + term, sized by family profile.
3. **High-interest debt prepayment** — until cleared.
4. **Retirement & long-term investments** — equity SIPs sized by age-based equity:debt rule.
5. **Short / medium-term goals** — vacation, car, gadget, home down-payment.
6. **Discretionary / speculative** — only after 1–5 are healthy.

### Killer feature — "Lifestyle Resilience Score"

A 0–100 composite score showing how protected the user is across the foundation layer. No Indian budgeting app does this well today.

Suggested sub-scores:
- **Emergency Fund Coverage** — months of expenses available / target months
- **Health Insurance Adequacy** — sum insured / recommended-for-profile
- **Life Cover Adequacy** — term cover / needs-based requirement
- **Debt Health** — high-interest debt as % of annual income
- **Retirement Track** — current corpus vs age-appropriate milestone

Each sub-score = 0–100, weighted-average into the Lifestyle Resilience Score.

---

## 5. Inputs the engine needs from the user

To produce personalized weightage (not just textbook percentages):

- **Monthly take-home pay**
- **City tier** — metro / tier-2 / tier-3
- **Marital status** & dependents (kids, ageing parents)
- **Single or dual income** household
- **Age** — drives retirement horizon and equity:debt split
- **Existing EMIs and outstanding loan balances** (with interest rates)
- **Existing insurance coverage** — health sum insured, term cover
- **Current emergency fund balance**
- **Job stability** — salaried / freelance / business

---

## 6. Open design questions

1. **Prescriptive vs descriptive tone.** "Spend 50% on needs" (rule-based) vs "you spent 62% on needs — here's why that's risky" (analytical). **Recommendation: descriptive first** — meet users where they are, then nudge.
2. **Healthcare inflation** — bake in 10–12% for healthcare, not the generic 6% CPI, in any long-term projection.
3. **Non-recommendation stance** — per the brief, the app does **not** recommend specific policies/funds; it only provides analysis and target numbers users can act on.
4. **Re-evaluation cadence** — Lifestyle Resilience Score should auto-refresh monthly; nudge user when score drops or a milestone is hit.
5. **Couple / family mode** — should the app eventually support a joint household profile? Important for term-cover and emergency-fund sizing.

---

## 7. Sources

- [50/30/20 Rule — Chase](https://www.chase.com/personal/banking/education/budgeting-saving/50-20-30-budget-rule)
- [50/30/20 — Ramsey Solutions](https://www.ramseysolutions.com/budgeting/50-20-30-budget-rule)
- [50-30-20 Indian Example — Business Scroll](https://www.businessscroll.com/50-30-20-budget-rule-explained-with-indian-example/)
- [50/30/20 — HDFC Life](https://www.hdfclife.com/savings-plans/50-30-20-rule)
- [Financial Planning Pyramid — Finance Strategists](https://www.financestrategists.com/financial-advisor/financial-planning/financial-planning-pyramid/)
- [Maslow × Financial Pyramid — ACM Wealth](https://acmwealth.com/article-video/how-maslows-pyramid-intersects-with-the-financial-planning-pyramid/)
- [Emergency Fund 3-6-12 Rule India — Finnovate](https://www.finnovate.in/learn/blog/emergency-fund-india-3-6-12-rule)
- [Emergency Fund India 2026 — Profitnifty](https://profitnifty.in/blog/emergency-fund-india-2026)
- [Term Insurance Guide 2026 — RupayWise](https://rupaywise.com/guides/term-insurance-guide-india)
- [Term Insurance Coverage — Kotak Life](https://www.kotaklife.com/insurance-guide/protection/how-much-term-life-insurance-cover-do-i-need-in-india)
- [Family Floater Health Insurance — Policybazaar](https://www.policybazaar.com/health-insurance/family-floater-health-insurance/articles/family-floater-plans-a-quick-overview/)
- [FIRE in India 2026 — VSRK Capital](https://vsrkcapital.com/fire-in-india-2026-how-much-money-do-you-actually-need-to-retire-early)
- [Retirement Corpus India — Hisabhkaro](https://hisabhkaro.com/learn/how-much-retirement-corpus-is-enough/)
- [Middle-class spending pattern — The Better India](https://thebetterindia.com/trending/budget-2026-middle-class-impact-nirmala-sitharaman-india-11075514)
