import type {
  BudgetRule,
  SavedAllocation,
} from "@/features/personalization/types/personalization";
import type {
  BucketKey,
  RuleCatalog,
} from "@/features/personalization/types/rule-catalog";

export type CategoryAllocation = {
  bucket: BucketKey;
  code: string;
  name: string;
  weight: number;
  amount: number;
};

export type BucketAllocation = {
  key: BucketKey;
  name: string;
  percent: number;
  total: number;
  categories: CategoryAllocation[];
};

export type RuleAllocation = {
  rule: BudgetRule;
  monthlyTakeHome: number;
  buckets: BucketAllocation[];
};

const BUCKET_ORDER: BucketKey[] = ["needs", "wants", "saveInvest"];

function bucketTotalFor(monthlyTakeHome: number, percent: number): number {
  return Math.round((monthlyTakeHome * percent) / 100);
}

function amountFor(bucketTotal: number, weight: number): number {
  return Math.round((bucketTotal * weight) / 100);
}

function rulePercents(catalog: RuleCatalog, rule: BudgetRule) {
  const entry = catalog.rules.find((r) => r.code === rule);
  if (!entry) {
    throw new Error(`Rule ${rule} not found in catalog`);
  }
  return entry.buckets;
}

export function buildAllocation(
  rule: BudgetRule,
  monthlyTakeHome: number,
  catalog: RuleCatalog
): RuleAllocation {
  const percents = rulePercents(catalog, rule);

  const buckets = BUCKET_ORDER.map((key): BucketAllocation => {
    const percent = percents[key];
    const def = catalog.buckets[key];
    const total = bucketTotalFor(monthlyTakeHome, percent);
    return {
      key,
      name: def.name,
      percent,
      total,
      categories: def.categories.map((c) => ({
        bucket: key,
        code: c.code,
        name: c.name,
        weight: c.weight,
        amount: amountFor(total, c.weight),
      })),
    };
  });

  return { rule, monthlyTakeHome, buckets };
}

export function buildAllocationFromSaved(
  rule: BudgetRule,
  monthlyTakeHome: number,
  catalog: RuleCatalog,
  saved: SavedAllocation[]
): RuleAllocation {
  const base = buildAllocation(rule, monthlyTakeHome, catalog);
  const savedMap = new Map<string, number>(
    saved.map((s) => [savedKey(s.bucket, s.code), s.weight])
  );

  return {
    ...base,
    buckets: base.buckets.map((bucket) => ({
      ...bucket,
      categories: bucket.categories.map((cat) => {
        const overrideWeight = savedMap.get(savedKey(cat.bucket, cat.code));
        const weight = overrideWeight ?? cat.weight;
        return {
          ...cat,
          weight,
          amount: amountFor(bucket.total, weight),
        };
      }),
    })),
  };
}

export function updateCategoryWeight(
  allocation: RuleAllocation,
  bucketKey: BucketKey,
  code: string,
  weight: number
): RuleAllocation {
  return {
    ...allocation,
    buckets: allocation.buckets.map((bucket) => {
      if (bucket.key !== bucketKey) return bucket;
      return {
        ...bucket,
        categories: bucket.categories.map((cat) =>
          cat.code === code
            ? { ...cat, weight, amount: amountFor(bucket.total, weight) }
            : cat
        ),
      };
    }),
  };
}

export function resetBucket(
  allocation: RuleAllocation,
  bucketKey: BucketKey,
  catalog: RuleCatalog
): RuleAllocation {
  return {
    ...allocation,
    buckets: allocation.buckets.map((bucket) => {
      if (bucket.key !== bucketKey) return bucket;
      const defaults = catalog.buckets[bucketKey].categories;
      return {
        ...bucket,
        categories: bucket.categories.map((cat) => {
          const def = defaults.find((d) => d.code === cat.code);
          const weight = def ? def.weight : cat.weight;
          return { ...cat, weight, amount: amountFor(bucket.total, weight) };
        }),
      };
    }),
  };
}

export function bucketWeightSum(bucket: BucketAllocation): number {
  return bucket.categories.reduce((sum, cat) => sum + cat.weight, 0);
}

export function bucketAmountSum(bucket: BucketAllocation): number {
  return bucket.categories.reduce((sum, cat) => sum + cat.amount, 0);
}

export function isAllocationValid(allocation: RuleAllocation): boolean {
  return allocation.buckets.every((b) => bucketWeightSum(b) === 100);
}

export function flattenAllocations(
  allocation: RuleAllocation
): SavedAllocation[] {
  return allocation.buckets.flatMap((bucket) =>
    bucket.categories.map((cat) => ({
      bucket: cat.bucket,
      code: cat.code,
      weight: cat.weight,
    }))
  );
}

function savedKey(bucket: BucketKey, code: string): string {
  return `${bucket}:${code}`;
}
