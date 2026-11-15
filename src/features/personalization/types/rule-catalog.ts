import type { BudgetRule } from "@/features/personalization/types/personalization";

export type BucketKey = "needs" | "wants" | "saveInvest";

export type RuleBucketPercents = {
  needs: number;
  wants: number;
  saveInvest: number;
};

export type RuleCatalogRule = {
  code: BudgetRule;
  buckets: RuleBucketPercents;
};

export type BucketCategoryDefault = {
  code: string;
  name: string;
  weight: number;
};

export type RuleCatalogBucket = {
  name: string;
  categories: BucketCategoryDefault[];
};

export type RuleCatalog = {
  rules: RuleCatalogRule[];
  buckets: Record<BucketKey, RuleCatalogBucket>;
};

export type RuleCatalogResponse = RuleCatalog;
