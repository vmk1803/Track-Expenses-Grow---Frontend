"use client";

import { AllocationCategoryRow } from "@/features/personalization/components/allocation-category-row";
import type {
  BucketAllocation,
  CategoryAllocation,
} from "@/features/personalization/utils/build-allocation";
import {
  bucketAmountSum,
  bucketWeightSum,
} from "@/features/personalization/utils/build-allocation";
import { cn } from "@/lib/utils/cn";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

type Props = {
  bucket: BucketAllocation;
  onWeightChange: (code: string, weight: number) => void;
  onReset: () => void;
};

export function AllocationBucketCard({
  bucket,
  onWeightChange,
  onReset,
}: Props) {
  const weightSum = bucketWeightSum(bucket);
  const amountSum = bucketAmountSum(bucket);
  const isBalanced = weightSum === 100;
  const drift = weightSum - 100;

  return (
    <article className="space-y-4 rounded-[24px] border border-border bg-background p-5 sm:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-strong">
            {bucket.name}
          </p>
          <p className="text-2xl font-semibold text-foreground">
            {currencyFormatter.format(bucket.total)}
          </p>
          <p className="text-xs text-copy-muted">
            {bucket.percent}% of monthly income
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-semibold text-brand-strong underline-offset-4 transition hover:underline"
        >
          Reset to defaults
        </button>
      </header>

      <div className="rounded-2xl border border-border/70 bg-surface px-4 py-1">
        {bucket.categories.map((category: CategoryAllocation) => (
          <AllocationCategoryRow
            key={category.code}
            category={category}
            onWeightChange={onWeightChange}
          />
        ))}
      </div>

      <footer
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-xs",
          isBalanced
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-amber-200 bg-amber-50 text-amber-800"
        )}
      >
        <span className="font-semibold">
          Weights: {weightSum}%
          {!isBalanced && (
            <>
              {" "}
              <span className="font-normal">
                ({drift > 0 ? `+${drift}` : drift} to fix)
              </span>
            </>
          )}
        </span>
        <span className="text-copy-muted">
          Allocated: {currencyFormatter.format(amountSum)} /{" "}
          {currencyFormatter.format(bucket.total)}
        </span>
      </footer>
    </article>
  );
}
