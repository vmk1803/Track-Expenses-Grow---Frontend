"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { AllocationSection } from "@/features/personalization/components/allocation-section";
import { validateRecommenderInputs } from "@/features/personalization/schemas/recommender-schemas";
import type {
  BudgetRecommendation,
  CityTier,
  PersonalizationProfile,
  RecommenderFormValues,
  RecommenderInputs,
} from "@/features/personalization/types/personalization";
import type { BucketKey } from "@/features/personalization/types/rule-catalog";
import {
  buildAllocation,
  buildAllocationFromSaved,
  flattenAllocations,
  isAllocationValid,
  updateCategoryWeight,
} from "@/features/personalization/utils/build-allocation";
import { recommendBudgetRule } from "@/features/personalization/utils/recommend-budget-rule";
import { useAppSelector } from "@/lib/store/hooks";
import { cn } from "@/lib/utils/cn";

type EditsMap = Record<string, number>;

function editKey(bucket: BucketKey, code: string): string {
  return `${bucket}:${code}`;
}

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function formatSavedDate(iso: string): string | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : dateFormatter.format(date);
}

const defaultForm: RecommenderFormValues = {
  monthlyTakeHome: "",
  cityTier: "metro",
  dependents: "0",
  monthlyEmi: "",
  age: "",
};

function formFromProfile(
  profile: PersonalizationProfile | null
): RecommenderFormValues {
  if (!profile) {
    return defaultForm;
  }

  const { inputs } = profile;

  return {
    monthlyTakeHome: String(inputs.monthlyTakeHome),
    cityTier: inputs.cityTier,
    dependents: String(Math.min(inputs.dependents, 5)),
    monthlyEmi: String(inputs.monthlyEmi),
    age: String(inputs.age),
  };
}

function parseInteger(raw: string): number {
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseAmount(raw: string): number {
  if (raw.trim() === "") return Number.NaN;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseDependents(raw: string): number {
  if (raw === "5+") return 5;
  return parseInteger(raw);
}

function parseForm(values: RecommenderFormValues): RecommenderInputs {
  return {
    monthlyTakeHome: parseAmount(values.monthlyTakeHome),
    cityTier: values.cityTier,
    dependents: parseDependents(values.dependents),
    monthlyEmi:
      values.monthlyEmi.trim() === "" ? 0 : parseAmount(values.monthlyEmi),
    age: parseInteger(values.age),
  };
}

type Props = {
  savedProfile: PersonalizationProfile | null;
  onApply: (profile: PersonalizationProfile) => void;
};

export function BudgetRecommenderSection({ savedProfile, onApply }: Props) {
  const catalog = useAppSelector((state) => state.personalization.catalog);

  const [form, setForm] = useState<RecommenderFormValues>(() =>
    formFromProfile(savedProfile)
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [recommendation, setRecommendation] =
    useState<BudgetRecommendation | null>(null);
  const [parsedInputs, setParsedInputs] = useState<RecommenderInputs | null>(
    null
  );
  const [edits, setEdits] = useState<EditsMap>({});
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!justSaved) return;
    const timer = window.setTimeout(() => setJustSaved(false), 2000);
    return () => window.clearTimeout(timer);
  }, [justSaved]);

  const allocation = useMemo(() => {
    if (!catalog || !recommendation || !parsedInputs) return null;

    const useSaved =
      savedProfile &&
      savedProfile.recommendation.rule === recommendation.rule &&
      savedProfile.allocations &&
      savedProfile.allocations.length > 0;

    const base = useSaved
      ? buildAllocationFromSaved(
          recommendation.rule,
          parsedInputs.monthlyTakeHome,
          catalog,
          savedProfile.allocations
        )
      : buildAllocation(
          recommendation.rule,
          parsedInputs.monthlyTakeHome,
          catalog
        );

    let next = base;
    for (const [key, weight] of Object.entries(edits)) {
      const [bucket, code] = key.split(":");
      next = updateCategoryWeight(next, bucket as BucketKey, code, weight);
    }
    return next;
  }, [catalog, recommendation, parsedInputs, savedProfile, edits]);

  const savedBanner = useMemo(() => {
    if (!savedProfile) return null;
    const when = formatSavedDate(savedProfile.savedAt);
    return {
      rule: savedProfile.recommendation.rule,
      when,
    };
  }, [savedProfile]);

  const updateField = <K extends keyof RecommenderFormValues>(
    field: K,
    value: RecommenderFormValues[K]
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setRecommendation(null);
    setParsedInputs(null);
    setEdits({});
    setJustSaved(false);
    setFieldErrors((current) => {
      if (!current[field as string]) return current;
      const next = { ...current };
      delete next[field as string];
      return next;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = parseForm(form);
    const result = validateRecommenderInputs(parsed);

    if (!result.success) {
      setFieldErrors(result.fieldErrors);
      setRecommendation(null);
      setParsedInputs(null);
      setEdits({});
      return;
    }

    setFieldErrors({});
    setParsedInputs(parsed);
    setRecommendation(recommendBudgetRule(parsed));
    setEdits({});
    setJustSaved(false);
  };

  const handleWeightChange = (
    bucket: BucketKey,
    code: string,
    weight: number
  ) => {
    setEdits((current) => ({ ...current, [editKey(bucket, code)]: weight }));
    setJustSaved(false);
  };

  const handleBucketReset = (bucket: BucketKey) => {
    if (!catalog) return;
    const defaults = catalog.buckets[bucket].categories;
    setEdits((current) => {
      const next = { ...current };
      for (const cat of defaults) {
        next[editKey(bucket, cat.code)] = cat.weight;
      }
      return next;
    });
    setJustSaved(false);
  };

  const handleApply = () => {
    if (!recommendation || !parsedInputs || !allocation) return;
    if (!isAllocationValid(allocation)) return;

    onApply({
      inputs: parsedInputs,
      recommendation,
      allocations: flattenAllocations(allocation),
      savedAt: new Date().toISOString(),
    });
    setJustSaved(true);
  };

  const applyEnabled =
    Boolean(recommendation) &&
    Boolean(allocation) &&
    (allocation ? isAllocationValid(allocation) : false) &&
    !justSaved;

  const applyLabel = justSaved
    ? "Saved ✓"
    : savedProfile
      ? "Update"
      : "Apply";

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-strong">
          Section 2 &mdash; Let us pick a rule for you
        </p>
        <h2 className="text-2xl font-semibold text-foreground">
          Get a budget split sized to your life
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-copy-muted">
          Five quick questions. We score the pressure on your monthly income
          and suggest one of the three rules, then divide each bucket across
          categories. Nothing changes elsewhere until you hit Apply &mdash; the
          choice is saved locally for now.
        </p>
      </div>

      {savedBanner ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-brand/20 bg-brand/5 px-5 py-4 text-sm">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-strong">
              Last saved
            </p>
            <p className="font-medium text-foreground">
              {savedBanner.rule}
              {savedBanner.when ? ` · ${savedBanner.when}` : ""}
            </p>
          </div>
          <p className="text-xs text-copy-muted">
            Edit the inputs and recalculate to update.
          </p>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-[28px] border border-border bg-surface p-6 shadow-[0_18px_50px_rgba(13,20,33,0.06)] sm:p-8"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Monthly take-home (₹)"
            hint="After tax. Salary credited to your account."
            error={fieldErrors.monthlyTakeHome}
          >
            <input
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={form.monthlyTakeHome}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateField("monthlyTakeHome", event.target.value)
              }
              placeholder="e.g. 120000"
              className={inputClass(Boolean(fieldErrors.monthlyTakeHome))}
            />
          </Field>

          <Field
            label="City tier"
            hint="Metro = Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, Pune."
            error={fieldErrors.cityTier}
          >
            <select
              value={form.cityTier}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                updateField("cityTier", event.target.value as CityTier)
              }
              className={inputClass(Boolean(fieldErrors.cityTier))}
            >
              <option value="metro">Metro</option>
              <option value="tier2">Tier 2</option>
              <option value="tier3">Tier 3</option>
            </select>
          </Field>

          <Field
            label="Financial dependents"
            hint="Anyone who depends on your income (spouse, children, parents)."
            error={fieldErrors.dependents}
          >
            <select
              value={form.dependents}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                updateField("dependents", event.target.value)
              }
              className={inputClass(Boolean(fieldErrors.dependents))}
            >
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5+">5+</option>
            </select>
          </Field>

          <Field
            label="Monthly EMI (₹)"
            hint="Total of all loan EMIs. Use 0 if none."
            error={fieldErrors.monthlyEmi}
          >
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={form.monthlyEmi}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateField("monthlyEmi", event.target.value)
              }
              placeholder="0"
              className={inputClass(Boolean(fieldErrors.monthlyEmi))}
            />
          </Field>

          <Field
            label="Age"
            hint="Used to nudge the rule for early-career and late-career stages."
            error={fieldErrors.age}
          >
            <input
              type="number"
              inputMode="numeric"
              min="18"
              max="70"
              step="1"
              value={form.age}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateField("age", event.target.value)
              }
              placeholder="e.g. 32"
              className={inputClass(Boolean(fieldErrors.age))}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/70 pt-5">
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-brand px-5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(0,120,97,0.24)] transition hover:bg-brand-strong"
          >
            {recommendation ? "Recalculate" : "Get my rule"}
          </button>
        </div>
      </form>

      {recommendation && parsedInputs ? (
        <article className="space-y-6 rounded-[28px] border border-brand/30 bg-surface p-6 shadow-[0_20px_60px_rgba(0,120,97,0.12)] sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-strong">
                Your recommendation
              </p>
              <p className="text-3xl font-semibold text-foreground">
                {recommendation.rule}
              </p>
            </div>
            <p className="max-w-md text-sm leading-6 text-copy-muted">
              {recommendation.rationale}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <BreakdownCard
              label="Needs"
              pct={recommendation.needsPct}
              amount={recommendation.needsAmount}
            />
            <BreakdownCard
              label="Wants"
              pct={recommendation.wantsPct}
              amount={recommendation.wantsAmount}
            />
            <BreakdownCard
              label="Save / Invest"
              pct={recommendation.saveInvestPct}
              amount={recommendation.saveInvestAmount}
              accent
            />
          </div>

          <AllocationSection
            allocation={allocation}
            onWeightChange={handleWeightChange}
            onBucketReset={handleBucketReset}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-5">
            <p className="text-xs text-copy-muted">
              Apply saves this rule and your category weights to your device.
              Income tab stays untouched in this phase.
            </p>
            <button
              type="button"
              onClick={handleApply}
              disabled={!applyEnabled}
              className={cn(
                "inline-flex h-12 min-w-32 items-center justify-center rounded-2xl px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                justSaved
                  ? "bg-brand-strong text-white"
                  : "bg-foreground text-white hover:bg-brand-strong"
              )}
            >
              {applyLabel}
            </button>
          </div>
        </article>
      ) : null}
    </section>
  );
}

function inputClass(hasError: boolean): string {
  return cn(
    "h-12 w-full rounded-2xl border bg-background px-4 text-sm text-foreground outline-none transition",
    hasError
      ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
      : "border-border focus:border-brand focus:ring-2 focus:ring-brand/20"
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      {children}
      {error ? (
        <span className="block text-sm text-rose-600">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-copy-muted">{hint}</span>
      ) : null}
    </label>
  );
}

function BreakdownCard({
  label,
  pct,
  amount,
  accent = false,
}: {
  label: string;
  pct: number;
  amount: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-[20px] border border-border bg-background px-5 py-5">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-copy-muted">{label}</p>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-copy-muted">
          {pct}%
        </p>
      </div>
      <p
        className={cn(
          "mt-3 text-2xl font-semibold",
          accent ? "text-brand-strong" : "text-foreground"
        )}
      >
        {formatCurrency(amount)}
      </p>
    </div>
  );
}
