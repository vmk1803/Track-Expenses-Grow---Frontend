"use client";

import Link from "next/link";
import { BudgetFrameworksSection } from "@/features/personalization/components/budget-frameworks-section";
import { BudgetRecommenderSection } from "@/features/personalization/components/budget-recommender-section";
import { saveProfile } from "@/features/personalization/state/personalization-slice";
import type { PersonalizationProfile } from "@/features/personalization/types/personalization";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";

export function GrowScreen() {
  const dispatch = useAppDispatch();
  const savedProfile = useAppSelector(
    (state) => state.personalization.savedProfile
  );

  const handleApply = (profile: PersonalizationProfile) => {
    dispatch(saveProfile(profile));
  };

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <Link
          href="/dashboard/personalization"
          className="inline-flex items-center gap-2 text-sm font-medium text-copy-muted transition hover:text-brand"
        >
          <svg
            viewBox="0 0 20 20"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M15 10H5M9 6l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Personalization
        </Link>

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-strong">
            Grow
          </p>
          <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">
            Proven practices for planning your money.
          </h1>
          <p className="max-w-3xl text-base leading-7 text-copy-muted">
            Start with the three frameworks below, then let us suggest the one
            that fits your income, city, family, and stage of life.
          </p>
        </div>
      </div>

      <BudgetFrameworksSection />

      <BudgetRecommenderSection
        savedProfile={savedProfile}
        onApply={handleApply}
      />
    </div>
  );
}
