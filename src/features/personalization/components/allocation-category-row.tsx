"use client";

import type { ChangeEvent } from "react";
import type { CategoryAllocation } from "@/features/personalization/utils/build-allocation";
import { cn } from "@/lib/utils/cn";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

type Props = {
  category: CategoryAllocation;
  onWeightChange: (code: string, weight: number) => void;
};

export function AllocationCategoryRow({ category, onWeightChange }: Props) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    if (raw === "") {
      onWeightChange(category.code, 0);
      return;
    }
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.max(0, Math.min(100, parsed));
    onWeightChange(category.code, clamped);
  };

  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border/60 py-3 last:border-b-0">
      <p className="text-sm font-medium text-foreground">{category.name}</p>
      <div className="flex items-center gap-1">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          step={1}
          value={category.weight}
          onChange={handleChange}
          className={cn(
            "h-9 w-16 rounded-xl border border-border bg-background px-2 text-right text-sm text-foreground outline-none transition",
            "focus:border-brand focus:ring-2 focus:ring-brand/20"
          )}
        />
        <span className="text-xs text-copy-muted">%</span>
      </div>
      <p className="min-w-24 text-right text-sm font-semibold text-foreground tabular-nums">
        {currencyFormatter.format(category.amount)}
      </p>
    </div>
  );
}
