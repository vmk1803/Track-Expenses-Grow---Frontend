"use client";

import { useEffect } from "react";
import { AllocationBucketCard } from "@/features/personalization/components/allocation-bucket-card";
import { loadRuleCatalog } from "@/features/personalization/state/personalization-slice";
import type { BucketKey } from "@/features/personalization/types/rule-catalog";
import type { RuleAllocation } from "@/features/personalization/utils/build-allocation";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";

type Props = {
  allocation: RuleAllocation | null;
  onWeightChange: (bucket: BucketKey, code: string, weight: number) => void;
  onBucketReset: (bucket: BucketKey) => void;
};

export function AllocationSection({
  allocation,
  onWeightChange,
  onBucketReset,
}: Props) {
  const dispatch = useAppDispatch();
  const catalog = useAppSelector((state) => state.personalization.catalog);
  const catalogStatus = useAppSelector(
    (state) => state.personalization.catalogStatus
  );
  const catalogError = useAppSelector(
    (state) => state.personalization.catalogError
  );

  useEffect(() => {
    if (catalogStatus === "idle") {
      void dispatch(loadRuleCatalog());
    }
  }, [catalogStatus, dispatch]);

  if (catalogStatus === "loading" || catalogStatus === "idle") {
    return <LoadingState />;
  }

  if (catalogStatus === "error") {
    return (
      <ErrorState
        message={catalogError ?? "Unable to load the rule catalog."}
        onRetry={() => {
          void dispatch(loadRuleCatalog());
        }}
      />
    );
  }

  if (!catalog || !allocation) {
    return null;
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-strong">
          Divide each bucket across categories
        </p>
        <p className="text-sm text-copy-muted">
          Defaults below come from common Indian household patterns. Tweak the
          weights to match yours — each bucket must still total{" "}
          <strong>100%</strong>.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-3">
        {allocation.buckets.map((bucket) => (
          <AllocationBucketCard
            key={bucket.key}
            bucket={bucket}
            onWeightChange={(code, weight) =>
              onWeightChange(bucket.key, code, weight)
            }
            onReset={() => onBucketReset(bucket.key)}
          />
        ))}
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="rounded-[24px] border border-border bg-background px-5 py-10 text-center text-sm text-copy-muted">
      Loading category breakdown…
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-3 rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-6 text-sm text-rose-800">
      <p className="font-semibold">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex h-9 items-center justify-center rounded-xl border border-rose-300 bg-white px-3 text-xs font-semibold text-rose-800 transition hover:bg-rose-100"
      >
        Try again
      </button>
    </div>
  );
}

