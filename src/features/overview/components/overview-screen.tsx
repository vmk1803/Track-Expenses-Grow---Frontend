"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api/http-client";
import { useAppSelector } from "@/lib/store/hooks";
import { cn } from "@/lib/utils/cn";
import { overviewService } from "@/features/overview/services/overview-service";
import type {
  OverviewCategoryMetric,
  OverviewResponse,
  OverviewSummary,
} from "@/features/overview/types/overview";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function normalizeApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "Unable to load your overview right now.";
}

function SectionLabel({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-strong">
        {eyebrow}
      </p>
      <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
        {title}
      </h1>
      <p className="max-w-3xl text-base leading-7 text-copy-muted">
        {description}
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "positive" | "warning";
}) {
  return (
    <section className="rounded-[26px] border border-border bg-surface p-5 shadow-[0_20px_50px_rgba(13,20,33,0.08)]">
      <p className="text-sm font-medium text-copy-muted">{label}</p>
      <p
        className={cn(
          "mt-3 text-3xl font-semibold",
          tone === "positive"
            ? "text-brand-strong"
            : tone === "warning"
              ? "text-rose-600"
              : "text-foreground"
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-copy-muted">{hint}</p>
    </section>
  );
}

function CategoryBar({
  metric,
}: {
  metric: OverviewCategoryMetric;
}) {
  const spentWidth =
    metric.allocated > 0 ? Math.min((metric.spent / metric.allocated) * 100, 100) : 0;
  const remainingWidth =
    metric.allocated > 0 && metric.remaining > 0
      ? (metric.remaining / metric.allocated) * 100
      : 0;
  const isOverspent = metric.remaining < 0;

  return (
    <div className="rounded-[24px] border border-border bg-background px-5 py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-strong">
            {metric.categoryName}
          </p>
          <p className="mt-2 text-sm text-copy-muted">
            Allocated {formatCurrency(metric.allocated)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand-strong">
            Spent {formatCurrency(metric.spent)}
          </span>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              isOverspent
                ? "bg-rose-100 text-rose-700"
                : "bg-stone-100 text-copy-muted"
            )}
          >
            {isOverspent
              ? `Over by ${formatCurrency(Math.abs(metric.remaining))}`
              : `Remaining ${formatCurrency(metric.remaining)}`}
          </span>
        </div>
      </div>

      <div className="mt-5">
        <div className="h-3 overflow-hidden rounded-full bg-stone-200">
          <div className="flex h-full w-full">
            <div
              className={cn(
                "h-full",
                isOverspent ? "bg-rose-500" : "bg-brand"
              )}
              style={{ width: `${spentWidth}%` }}
            />
            {remainingWidth > 0 ? (
              <div
                className="h-full bg-brand/20"
                style={{ width: `${remainingWidth}%` }}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-copy-muted sm:grid-cols-3">
        <div>
          <p className="font-medium text-foreground">Allocated</p>
          <p className="mt-1">{formatCurrency(metric.allocated)}</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Spent</p>
          <p className="mt-1">{formatCurrency(metric.spent)}</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Remaining</p>
          <p className="mt-1">{formatCurrency(metric.remaining)}</p>
        </div>
      </div>
    </div>
  );
}

const emptySummary: OverviewSummary = {
  totalIncome: 0,
  totalAllocated: 0,
  remainingIncome: 0,
  totalSpent: 0,
  remainingAfterSpending: 0,
};

export function OverviewScreen() {
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    const token = accessToken;
    setPageError(null);

    try {
      const response = await overviewService.getOverview(token);
      setOverview(response);
    } catch (error) {
      setPageError(normalizeApiError(error));
      setOverview(null);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const token = accessToken;
    let isMounted = true;

    async function run() {
      setIsLoading(true);

      try {
        const response = await overviewService.getOverview(token);

        if (!isMounted) {
          return;
        }

        setOverview(response);
        setPageError(null);
      } catch (error) {
        if (isMounted) {
          setPageError(normalizeApiError(error));
          setOverview(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void run();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  const summary = overview?.summary ?? emptySummary;
  const hasActiveIncome = overview?.activeIncome !== null;

  const allocatedCategories = useMemo(() => {
    return (overview?.categories ?? []).filter((category) => category.allocated > 0);
  }, [overview]);

  const handleRefresh = async () => {
    if (!accessToken) {
      return;
    }

    setIsRefreshing(true);

    try {
      await loadOverview();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-[28px] border border-border bg-surface px-8 py-10 text-center shadow-[0_20px_50px_rgba(13,20,33,0.08)]">
          <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-4 border-brand/15 border-t-brand" />
          <p className="text-sm font-medium text-copy-muted">
            Loading your overview...
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <SectionLabel
        eyebrow="Overview"
        title="See how your budget and spending are moving together"
        description="This dashboard combines your active income plan with category spending so you can spot what has room left and what is starting to run tight."
      />

      {pageError ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{pageError}</span>
            <button
              type="button"
              onClick={() => {
                void handleRefresh();
              }}
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-rose-200 bg-white px-4 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
            >
              Retry
            </button>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Total income"
          value={formatCurrency(summary.totalIncome)}
          hint="Latest active income plan total."
        />
        <SummaryCard
          label="Total allocated"
          value={formatCurrency(summary.totalAllocated)}
          hint="Budget already assigned to categories."
        />
        <SummaryCard
          label="Remaining income"
          value={formatCurrency(summary.remainingIncome)}
          hint="Income not yet allocated inside the plan."
          tone={summary.remainingIncome < 0 ? "warning" : "positive"}
        />
        <SummaryCard
          label="Total spent"
          value={formatCurrency(summary.totalSpent)}
          hint="Expenses logged across all categories."
        />
        <SummaryCard
          label="Remaining after spending"
          value={formatCurrency(summary.remainingAfterSpending)}
          hint="Income left after actual spending is considered."
          tone={summary.remainingAfterSpending < 0 ? "warning" : "positive"}
        />
      </section>

      <section className="rounded-[30px] border border-border bg-surface p-6 shadow-[0_24px_70px_rgba(13,20,33,0.08)] sm:p-8">
        <div className="flex flex-col gap-3 border-b border-border/70 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-strong">
              Category spending
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              Allocated categories vs real spend
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-copy-muted">
              Each bar compares allocated budget, actual spending, and remaining room for the categories in your active income plan.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void handleRefresh();
            }}
            disabled={isRefreshing}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-medium text-copy-muted transition hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {hasActiveIncome && allocatedCategories.length > 0 ? (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap gap-3 text-xs font-semibold text-copy-muted">
              <span className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                Spent
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-brand/20" />
                Remaining
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                Overspent
              </span>
            </div>

            {allocatedCategories.map((metric) => (
              <CategoryBar key={metric.category} metric={metric} />
            ))}
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center justify-center rounded-[28px] border border-dashed border-border bg-background px-6 py-16 text-center">
            <div className="max-w-2xl space-y-4">
              <h3 className="text-2xl font-semibold text-foreground">
                Create an income plan to unlock the category graph
              </h3>
              <p className="text-base leading-7 text-copy-muted">
                The summary above can still reflect your totals, but the category comparison becomes meaningful once you define allocations in the income tab.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
