export type CityTier = "metro" | "tier2" | "tier3";

export type BudgetRule = "50/30/20" | "60/20/20" | "70/20/10";

export type RecommenderInputs = {
  monthlyTakeHome: number;
  cityTier: CityTier;
  dependents: number;
  monthlyEmi: number;
  age: number;
};

export type BudgetRecommendation = {
  rule: BudgetRule;
  needsPct: number;
  wantsPct: number;
  saveInvestPct: number;
  needsAmount: number;
  wantsAmount: number;
  saveInvestAmount: number;
  rationale: string;
};

export type SavedAllocation = {
  bucket: "needs" | "wants" | "saveInvest";
  code: string;
  weight: number;
};

export type PersonalizationProfile = {
  inputs: RecommenderInputs;
  recommendation: BudgetRecommendation;
  allocations: SavedAllocation[];
  savedAt: string;
};

export type RecommenderFormValues = {
  monthlyTakeHome: string;
  cityTier: CityTier;
  dependents: string;
  monthlyEmi: string;
  age: string;
};
