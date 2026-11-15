import type {
  BudgetRecommendation,
  BudgetRule,
  RecommenderInputs,
} from "@/features/personalization/types/personalization";

const RULE_SPLITS: Record<BudgetRule, [needs: number, wants: number, save: number]> = {
  "50/30/20": [50, 30, 20],
  "60/20/20": [60, 20, 20],
  "70/20/10": [70, 20, 10],
};

const RULE_RATIONALES: Record<BudgetRule, string> = {
  "50/30/20":
    "Comfortable income with low fixed costs — a balanced split that funds essentials, lifestyle, and savings without strain.",
  "60/20/20":
    "Moderate fixed costs or city cost of living — the needs bucket widens so rent and EMIs fit, while savings stay protected.",
  "70/20/10":
    "High fixed costs, dependents, or early career — essentials come first; lifestyle and savings shrink until pressure eases.",
};

export function recommendBudgetRule(
  inputs: RecommenderInputs
): BudgetRecommendation {
  const emiBurden =
    inputs.monthlyTakeHome > 0 ? inputs.monthlyEmi / inputs.monthlyTakeHome : 0;

  let score = 0;
  if (inputs.cityTier === "metro") score += 1;
  if (inputs.dependents >= 1) score += 1;
  if (emiBurden >= 0.25) score += 1;

  // Early-career boost: under-30s with any pressure get nudged toward a stricter rule.
  if (inputs.age < 30 && score >= 1 && score < 3) score += 1;

  // Older-adult relief: 55+ with no real pressure → most flexible rule.
  if (inputs.age >= 55 && score <= 1 && emiBurden < 0.1) score = 0;

  const rule: BudgetRule =
    score === 0 ? "50/30/20" : score === 1 ? "60/20/20" : "70/20/10";

  const [needsPct, wantsPct, saveInvestPct] = RULE_SPLITS[rule];

  return {
    rule,
    needsPct,
    wantsPct,
    saveInvestPct,
    needsAmount: Math.round((inputs.monthlyTakeHome * needsPct) / 100),
    wantsAmount: Math.round((inputs.monthlyTakeHome * wantsPct) / 100),
    saveInvestAmount: Math.round((inputs.monthlyTakeHome * saveInvestPct) / 100),
    rationale: RULE_RATIONALES[rule],
  };
}
