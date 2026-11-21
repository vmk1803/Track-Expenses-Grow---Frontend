"use client";

import { type FormEvent, useState } from "react";
import { fieldClass } from "@/features/expenses/components/field-class";
import type { ParsedExpense } from "@/features/expenses/smart-add/parser";
import type { SmartAddDraft } from "@/features/expenses/smart-add/types";
import type {
  ExpenseCategory,
  ExpenseInputSource,
} from "@/features/expenses/types/expense";
import type { IncomeCategoryCode } from "@/features/income/types/income";

type SmartAddReviewCardProps = {
  parsed: ParsedExpense;
  source: ExpenseInputSource;
  allowedCategories: ExpenseCategory[];
  busy: boolean;
  onConfirm: (draft: SmartAddDraft) => void;
  onDiscard: () => void;
};

type FieldName = "amount" | "spentDate" | "category" | "description";
type FieldErrors = Partial<Record<FieldName, string>>;

type FormState = Record<FieldName, string>;

// Basic checks only (task 1.5). Budget limits and the current-month rule
// arrive with the shared validation in task 3.7.
function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  const amount = Number(form.amount);

  if (!form.amount.trim() || !Number.isFinite(amount) || amount <= 0) {
    errors.amount = "Enter an amount greater than zero.";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.spentDate)) {
    errors.spentDate = "Choose the date this was spent.";
  }
  if (!form.category) {
    errors.category = "Pick a category.";
  }
  if (!form.description.trim()) {
    errors.description = "Add a short description.";
  }

  return errors;
}

/**
 * Editable preview of a parsed sentence. Mounted with a fresh `key` per
 * submission, so its state is initialised once from `parsed`.
 */
export function SmartAddReviewCard({
  parsed,
  source,
  allowedCategories,
  busy,
  onConfirm,
  onDiscard,
}: SmartAddReviewCardProps) {
  const [form, setForm] = useState<FormState>(() => ({
    amount: parsed.amount.value === null ? "" : String(parsed.amount.value),
    spentDate: parsed.spentDate.value ?? "",
    category: parsed.category.value ?? "",
    description: parsed.description.value ?? "",
  }));
  const [touched, setTouched] = useState<Set<FieldName>>(() => new Set());
  const [attempted, setAttempted] = useState(false);

  const errors = validate(form);
  const isValid = Object.keys(errors).length === 0;

  // Category shows its hint whenever it's empty (neither the local parser nor
  // the AI found an allowed one); other
  // fields show errors once edited or after a Confirm attempt.
  const visibleError = (field: FieldName) =>
    field === "category" || attempted || touched.has(field) ? errors[field] : undefined;

  const update = (field: FieldName, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setTouched((current) => new Set(current).add(field));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);

    if (!isValid || busy) {
      return;
    }

    onConfirm({
      amount: Number(form.amount),
      spentDate: form.spentDate,
      category: form.category as IncomeCategoryCode,
      description: form.description.trim(),
    });
  };

  const amountError = visibleError("amount");
  const dateError = visibleError("spentDate");
  const categoryError = visibleError("category");
  const descriptionError = visibleError("description");

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Review expense"
      className="mt-4 rounded-[24px] border border-border bg-background p-5"
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-copy-muted">Heard:</span>
        <span className="min-w-0 break-words font-medium text-foreground">
          “{parsed.rawText}”
        </span>
        <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-copy-muted">
          {source === "voice" ? "Voice" : "Typed"}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Amount</span>
          <input
            type="number"
            inputMode="decimal"
            min="1"
            step="0.01"
            value={form.amount}
            onChange={(event) => update("amount", event.target.value)}
            className={fieldClass(Boolean(amountError))}
          />
          {amountError ? <p className="text-sm text-rose-600">{amountError}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Spent date</span>
          <input
            type="date"
            value={form.spentDate}
            onChange={(event) => update("spentDate", event.target.value)}
            className={fieldClass(Boolean(dateError))}
          />
          {dateError ? <p className="text-sm text-rose-600">{dateError}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Category</span>
          <select
            value={form.category}
            onChange={(event) => update("category", event.target.value)}
            className={fieldClass(Boolean(categoryError))}
          >
            <option value="">Select category</option>
            {allowedCategories.map((category) => (
              <option key={category.code} value={category.code}>
                {category.name}
              </option>
            ))}
          </select>
          {categoryError ? <p className="text-sm text-rose-600">{categoryError}</p> : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-foreground">Description</span>
          <input
            type="text"
            maxLength={255}
            value={form.description}
            onChange={(event) => update("description", event.target.value)}
            className={fieldClass(Boolean(descriptionError))}
          />
          {descriptionError ? (
            <p className="text-sm text-rose-600">{descriptionError}</p>
          ) : null}
        </label>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onDiscard}
          disabled={busy}
          className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
        >
          Discard
        </button>
        <button
          type="submit"
          disabled={!isValid || busy}
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand px-5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(0,120,97,0.24)] transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:bg-brand"
        >
          {busy ? "Saving..." : "Confirm"}
        </button>
      </div>
    </form>
  );
}
