"use client";

import { useState } from "react";
import { expenseService } from "@/features/expenses/services/expense-service";
import { SmartAddBar } from "@/features/expenses/smart-add/components/smart-add-bar";
import { SmartAddReviewCard } from "@/features/expenses/smart-add/components/smart-add-review-card";
import { smartAddService } from "@/features/expenses/smart-add/services/smart-add-service";
import {
  parseExpense,
  type ParsedExpense,
} from "@/features/expenses/smart-add/parser";
import type {
  AiParsedExpense,
  ParseExpenseRequest,
  SmartAddDraft,
  SmartAddSubmission,
} from "@/features/expenses/smart-add/types";
import { mergeParsed } from "@/features/expenses/smart-add/utils/merge-parsed";
import type {
  ExpenseCategory,
  ExpenseView,
} from "@/features/expenses/types/expense";
import { getTodayDateInputValue } from "@/features/expenses/utils/date";
import type { IncomeView } from "@/features/income/types/income";
import { useAppSelector } from "@/lib/store/hooks";
import { cn } from "@/lib/utils/cn";

export type SmartAddSectionProps = {
  /** Active income plan; source of the monthly category limits. */
  income: IncomeView;
  /** Categories in the active plan; the only ones Smart Add may use. */
  allowedCategories: ExpenseCategory[];
  /** All expenses (every month), for the budget check added in task 3.7. */
  expenses: ExpenseView[];
  /** True when the dashboard isn't showing the current month. */
  disabled: boolean;
  /** Shown when disabled, e.g. "Switch to November 2026 to add expenses". */
  disabledReason?: string;
  /** Called with the saved expense so the screen can add it to its list. */
  onExpenseCreated: (expense: ExpenseView) => void;
  /** Called when the save fails; the screen shows it in its error popup. */
  onSaveError: (error: unknown) => void;
};

const AI_PARSE_TIMEOUT_MS = 12_000;

type ActiveSubmission = SmartAddSubmission & {
  /** Increments per submit; used as the card's key so each submit remounts it. */
  id: number;
  parsed: ParsedExpense;
};

/**
 * Smart Add: log an expense by typing or saying one sentence.
 * Bar → parse → review card → save.
 */
export function SmartAddSection({
  allowedCategories,
  disabled,
  disabledReason,
  onExpenseCreated,
  onSaveError,
}: SmartAddSectionProps) {
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const [submission, setSubmission] = useState<ActiveSubmission | null>(null);
  const [barKey, setBarKey] = useState(0);
  const [saving, setSaving] = useState(false);
  // True while POST /expenses/parse is in flight (like `saving` for Confirm).
  const [waitingForAi, setWaitingForAi] = useState(false);

  /** The AI's result, or null when it's unavailable (no token, error, timeout). Never throws. */
  const fetchAiParse = async (body: ParseExpenseRequest): Promise<AiParsedExpense | null> => {
    if (!accessToken) {
      return null;
    }

    try {
      // 12 s = the API's 10 s Groq timeout plus some margin.
      const { parsed } = await smartAddService.parseExpense(
        body,
        accessToken,
        AbortSignal.timeout(AI_PARSE_TIMEOUT_MS)
      );
      return parsed;
    } catch (error) {
      console.warn("[smart-add] AI parse unavailable", error);
      return null;
    }
  };

  const handleSubmit = async ({ text, source }: SmartAddSubmission) => {
    if (saving || waitingForAi) {
      return; // don't replace the card mid-save or start a second AI request
    }

    const today = getTodayDateInputValue();
    // Instant result from the local, rule-based parser (no network, no AI).
    const localResult = parseExpense(text, { today, allowedCategories });

    setWaitingForAi(true);
    const aiResult = await fetchAiParse({ text, today });
    setWaitingForAi(false);

    setSubmission((current) => ({
      id: (current?.id ?? 0) + 1,
      text,
      source,
      parsed: mergeParsed(localResult, aiResult, allowedCategories),
    }));
  };

  const handleDiscard = () => {
    setSubmission(null);
    setBarKey((current) => current + 1); // remount the bar to clear its text
  };

  const handleConfirm = async (draft: SmartAddDraft) => {
    if (!submission || !accessToken || saving || waitingForAi) {
      return;
    }

    setSaving(true);

    try {
      // Always send both input fields; the API requires both or neither.
      const { expense } = await expenseService.createExpense(
        { ...draft, inputText: submission.text, inputSource: submission.source },
        accessToken
      );

      onExpenseCreated(expense);
      setSubmission(null);
      setBarKey((current) => current + 1); // clear the bar, same as Discard
    } catch (error) {
      // Keep the card (and the user's edits) so they can retry.
      onSaveError(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      aria-labelledby="smart-add-title"
      // Visual dimming only; the bar's own controls are disabled below.
      className={cn(
        "rounded-[30px] border border-border bg-surface p-6 shadow-[0_24px_70px_rgba(13,20,33,0.08)] transition sm:p-8",
        disabled && "opacity-60"
      )}
    >
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-strong">
          Smart Add
        </p>
        <h2
          id="smart-add-title"
          className="text-2xl font-semibold text-foreground"
        >
          Log an expense in one sentence
        </h2>
        <p className="text-sm leading-6 text-copy-muted">
          Type or say something like “250 for coffee at Starbucks yesterday”.
        </p>
      </div>

      <div className="mt-5">
        <SmartAddBar
          key={barKey}
          disabled={disabled}
          disabledReason={disabledReason}
          busy={waitingForAi}
          onSubmit={handleSubmit}
        />
      </div>

      {disabled && disabledReason ? (
        <p className="mt-3 text-sm text-copy-muted">{disabledReason}</p>
      ) : null}

      {/* Hidden while the AI works, so the card appears once with the new details. */}
      {submission && !disabled && !waitingForAi ? (
        <SmartAddReviewCard
          key={submission.id}
          parsed={submission.parsed}
          source={submission.source}
          allowedCategories={allowedCategories}
          busy={saving || waitingForAi}
          onConfirm={handleConfirm}
          onDiscard={handleDiscard}
        />
      ) : null}
    </section>
  );
}
