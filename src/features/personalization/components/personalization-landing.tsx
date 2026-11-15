"use client";

import Link from "next/link";
import { useAppSelector } from "@/lib/store/hooks";

const savedDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatSavedDate(isoTimestamp: string): string | null {
  const date = new Date(isoTimestamp);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return savedDateFormatter.format(date);
}

export function PersonalizationLanding() {
  const savedProfile = useAppSelector(
    (state) => state.personalization.savedProfile
  );

  const savedLabel = savedProfile
    ? formatSavedDate(savedProfile.savedAt)
    : null;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-strong">
          Personalization
        </p>
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
          Tailor your money plan to your life.
        </h1>
        <p className="max-w-3xl text-base leading-7 text-copy-muted">
          Two ways to make this app feel like yours. Pick the route that fits
          where you are today &mdash; AI guidance is coming, and proven
          budgeting frameworks are ready to use right now.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <article
          aria-disabled="true"
          className="flex h-full flex-col gap-5 rounded-[28px] border border-dashed border-border bg-surface/70 p-7 opacity-80 shadow-[0_18px_50px_rgba(13,20,33,0.05)]"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-copy-muted">
              AI Advice
            </p>
            <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-copy-muted">
              Coming soon
            </span>
          </div>
          <h2 className="text-2xl font-semibold text-foreground">
            Smart nudges, tuned to your spending.
          </h2>
          <p className="text-sm leading-6 text-copy-muted">
            Once your expense and income data are flowing, AI will surface
            recommendations, flag patterns, and answer questions about your
            money in plain language.
          </p>
          <p className="mt-auto text-sm font-medium text-copy-muted">
            In progress
          </p>
        </article>

        <Link
          href="/dashboard/personalization/grow"
          className="group flex h-full flex-col gap-5 rounded-[28px] border border-border bg-surface p-7 shadow-[0_18px_50px_rgba(13,20,33,0.07)] transition hover:border-brand/40 hover:shadow-[0_24px_60px_rgba(0,120,97,0.18)]"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-strong">
              Grow
            </p>
            {savedLabel ? (
              <span className="inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-strong">
                Saved {savedLabel}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-copy-muted">
                Proven practices
              </span>
            )}
          </div>
          <h2 className="text-2xl font-semibold text-foreground">
            Plan your money with frameworks that work.
          </h2>
          <p className="text-sm leading-6 text-copy-muted">
            Learn the 50/30/20, 60/20/20, and 70/20/10 budget rules &mdash;
            then answer five quick questions to get a split sized to your
            income, city, family, and stage of life.
          </p>
          <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-brand-strong">
            Open Grow
            <svg
              viewBox="0 0 20 20"
              className="h-4 w-4 transition group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M5 10h10M11 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </Link>
      </div>
    </div>
  );
}
