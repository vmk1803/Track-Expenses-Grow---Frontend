"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import Link from "next/link";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ListboxSelect } from "@/components/ui/listbox-select";
import { Pagination } from "@/components/ui/pagination";
import { incomeService } from "@/features/income/services/income-service";
import type {
  IncomeAllocationView,
  IncomeCategoryCode,
  IncomeView,
} from "@/features/income/types/income";
import { expenseService } from "@/features/expenses/services/expense-service";
import type {
  ExpenseBudgetStatus,
  ExpenseCategory,
  ExpensePayload,
  ExpenseView,
} from "@/features/expenses/types/expense";
import { ApiError } from "@/lib/api/http-client";
import { useAppSelector } from "@/lib/store/hooks";
import { cn } from "@/lib/utils/cn";

type ExpenseDraft = {
  category: string;
  description: string;
  amount: string;
  spentDate: string;
};

type DraftErrors = {
  category?: string;
  description?: string;
  amount?: string;
  spentDate?: string;
};

type ErrorNotice = {
  title: string;
  message: string;
};

const defaultDraft: ExpenseDraft = {
  category: "",
  description: "",
  amount: "",
  spentDate: "",
};

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const DEFAULT_PAGE_SIZE = 25;

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const displayDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatDate(value: string) {
  return displayDateFormatter.format(new Date(value));
}

const monthLabelFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
});

function padTwo(value: number) {
  return String(value).padStart(2, "0");
}

// Local calendar date (not toISOString, which is UTC and can be a day behind).
function getTodayDateInputValue() {
  const now = new Date();
  return `${now.getFullYear()}-${padTwo(now.getMonth() + 1)}-${padTwo(now.getDate())}`;
}

/** "2026-11-10" → "2026-11" */
function toMonthKey(dateValue: string) {
  return dateValue.slice(0, 7);
}

function getCurrentMonthKey() {
  return toMonthKey(getTodayDateInputValue());
}

/** "2026-11" → "November 2026" */
function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return monthLabelFormatter.format(new Date(year, month - 1, 1));
}

function parsePositiveAmount(rawValue: string) {
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function sortExpenses(items: ExpenseView[]) {
  return [...items].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

function normalizeApiError(error: unknown) {
  if (error instanceof ApiError) {
    return {
      title: "Unable to save expense",
      message: error.message,
    };
  }

  return {
    title: "Unable to save expense",
    message: "Something went wrong while talking to the backend.",
  };
}

function fieldClass(hasError: boolean, sizing = "h-12") {
  return cn(
    "w-full rounded-2xl border bg-background px-4 text-sm text-foreground outline-none transition",
    sizing,
    hasError
      ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
      : "border-border focus:border-brand focus:ring-2 focus:ring-brand/20"
  );
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

function IconButton({
  title,
  onClick,
  children,
  tone = "neutral",
  disabled = false,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "neutral" | "success" | "danger";
  disabled?: boolean;
}) {
  const toneClass =
    tone === "success"
      ? "text-brand hover:border-brand/50 hover:bg-brand/10"
      : tone === "danger"
        ? "text-rose-600 hover:border-rose-300 hover:bg-rose-50"
        : "text-copy-muted hover:border-brand/40 hover:bg-brand/8 hover:text-brand";

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface transition disabled:cursor-not-allowed disabled:opacity-60",
        toneClass
      )}
    >
      {children}
    </button>
  );
}

function ActionIcons(props: {
  busy?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <IconButton
        title="Edit expense"
        onClick={() => props.onEdit?.()}
        disabled={props.busy}
      >
        <svg
          viewBox="0 0 20 20"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M4 14.75V16h1.25L14 7.25l-1.25-1.25L4 14.75Z" />
          <path
            d="M11.75 7.25 13 6a1.77 1.77 0 1 1 2.5 2.5l-1.25 1.25"
            strokeLinecap="round"
          />
        </svg>
      </IconButton>
      <IconButton
        title="Delete expense"
        tone="danger"
        onClick={() => props.onDelete?.()}
        disabled={props.busy}
      >
        <svg
          viewBox="0 0 20 20"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M5.75 6.25h8.5" strokeLinecap="round" />
          <path d="M8 6.25V4.75h4v1.5" strokeLinecap="round" />
          <path d="M7 8.5v5.25M10 8.5v5.25M13 8.5v5.25" strokeLinecap="round" />
          <path
            d="M6.25 6.25 7 15a1 1 0 0 0 1 .92h4a1 1 0 0 0 1-.92l.75-8.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </IconButton>
    </div>
  );
}

function ErrorPopup({
  notice,
  onClose,
}: {
  notice: ErrorNotice | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(onClose, 5000);
    return () => window.clearTimeout(timeoutId);
  }, [notice, onClose]);

  if (!notice) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 w-full max-w-sm sm:right-6 sm:top-6">
      <div className="pointer-events-auto rounded-[24px] border border-rose-200 bg-white px-5 py-4 shadow-[0_24px_60px_rgba(13,20,33,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-rose-700">{notice.title}</p>
            <p className="text-sm leading-6 text-rose-600">{notice.message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-rose-500 transition hover:bg-rose-50"
            aria-label="Dismiss error"
          >
            <svg
              viewBox="0 0 20 20"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  expense,
  busy,
  onCancel,
  onConfirm,
}: {
  expense: ExpenseView | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!expense) {
    return null;
  }

  return (
    <Dialog
      open
      onClose={() => {
        if (!busy) {
          onCancel();
        }
      }}
      className="relative z-40"
    >
      <DialogBackdrop className="fixed inset-0 bg-[rgba(13,20,33,0.42)]" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-[28px] border border-border bg-white p-6 shadow-[0_28px_80px_rgba(13,20,33,0.24)]">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-rose-600">
            Confirm delete
          </p>
          <DialogTitle className="text-2xl font-semibold text-foreground">
            Remove this expense entry?
          </DialogTitle>
          <p className="text-sm leading-6 text-copy-muted">
            Deleting <span className="font-medium text-foreground">{expense.description}</span>
            {" "}will immediately free up the spent amount in the{" "}
            <span className="font-medium text-foreground">{expense.categoryName}</span>
            {" "}category budget.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Deleting..." : "Delete expense"}
          </button>
        </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

function ExpenseFormModal({
  mode,
  open,
  draft,
  errors,
  busy,
  categories,
  minDate,
  maxDate,
  onChange,
  onSubmit,
  onClose,
}: {
  mode: "add" | "edit";
  open: boolean;
  draft: ExpenseDraft;
  errors: DraftErrors;
  busy: boolean;
  categories: ExpenseCategory[];
  minDate?: string;
  maxDate?: string;
  onChange: (patch: Partial<ExpenseDraft>) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!busy) {
          onClose();
        }
      }}
      className="relative z-40"
    >
      <DialogBackdrop className="fixed inset-0 bg-[rgba(13,20,33,0.42)]" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel className="w-full max-w-lg rounded-[28px] border border-border bg-white p-6 shadow-[0_28px_80px_rgba(13,20,33,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-2xl font-semibold text-foreground">
                  {mode === "add" ? "Add expense" : "Edit expense"}
                </DialogTitle>
                <p className="mt-1 text-sm text-copy-muted">
                  Only categories from your active income plan are available.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                aria-label="Close"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-copy-muted transition hover:bg-brand/8 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg
                  viewBox="0 0 20 20"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Amount
                  </span>
                  <input
                    data-autofocus
                    type="number"
                    inputMode="decimal"
                    min="1"
                    step="0.01"
                    value={draft.amount}
                    onChange={(event) => onChange({ amount: event.target.value })}
                    placeholder="Enter amount"
                    className={fieldClass(Boolean(errors.amount))}
                  />
                  {errors.amount ? (
                    <p className="text-sm text-rose-600">{errors.amount}</p>
                  ) : null}
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Spent date
                  </span>
                  <input
                    type="date"
                    min={minDate}
                    max={maxDate}
                    value={draft.spentDate}
                    onChange={(event) =>
                      onChange({ spentDate: event.target.value })
                    }
                    className={fieldClass(Boolean(errors.spentDate))}
                  />
                  {errors.spentDate ? (
                    <p className="text-sm text-rose-600">{errors.spentDate}</p>
                  ) : null}
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">
                  Category
                </span>
                <select
                  value={draft.category}
                  onChange={(event) => onChange({ category: event.target.value })}
                  className={fieldClass(Boolean(errors.category))}
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.code} value={category.code}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.category ? (
                  <p className="text-sm text-rose-600">{errors.category}</p>
                ) : null}
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-foreground">
                  Description
                </span>
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(event) =>
                    onChange({ description: event.target.value })
                  }
                  placeholder="Example: Grocery refill for the week"
                  className={fieldClass(
                    Boolean(errors.description),
                    "resize-none py-3"
                  )}
                />
                {errors.description ? (
                  <p className="text-sm text-rose-600">{errors.description}</p>
                ) : null}
              </label>

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand px-4 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(0,120,97,0.24)] transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "Saving..." : "Save expense"}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

function getBudgetErrorMessage(
  allocation: IncomeAllocationView,
  nextAmount: number,
  currentSpent: number,
  monthKey: string
) {
  const overBy = currentSpent + nextAmount - allocation.limit;
  return `${allocation.categoryName} only has ${formatCurrency(
    Math.max(allocation.limit - currentSpent, 0)
  )} left for ${formatMonthLabel(monthKey)}. This entry exceeds the category limit by ${formatCurrency(overBy)}.`;
}

export function ExpensesScreen() {
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(
    []
  );
  const [activeIncome, setActiveIncome] = useState<IncomeView | null>(null);
  const [expenses, setExpenses] = useState<ExpenseView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<ErrorNotice | null>(null);
  const [newDraft, setNewDraft] = useState<ExpenseDraft>({
    ...defaultDraft,
    spentDate: getTodayDateInputValue(),
  });
  const [draftErrors, setDraftErrors] = useState<DraftErrors>({});
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ExpenseDraft>(defaultDraft);
  const [editErrors, setEditErrors] = useState<DraftErrors>({});
  const [expensePendingDelete, setExpensePendingDelete] =
    useState<ExpenseView | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey);

  const currentMonthKey = getCurrentMonthKey();
  const isViewingCurrentMonth = selectedMonth === currentMonthKey;
  const selectedMonthLabel = formatMonthLabel(selectedMonth);

  // Current month plus every month that has at least one expense, newest first.
  const monthOptions = useMemo(() => {
    const keys = new Set([currentMonthKey]);
    expenses.forEach((expense) => keys.add(toMonthKey(expense.spentDate)));

    return [...keys]
      .sort((left, right) => right.localeCompare(left))
      .map((key) => ({ value: key, label: formatMonthLabel(key) }));
  }, [expenses, currentMonthKey]);

  const monthExpenses = useMemo(
    () =>
      expenses.filter(
        (expense) => toMonthKey(expense.spentDate) === selectedMonth
      ),
    [expenses, selectedMonth]
  );

  // Clamp at derive time so deleting the last row of the last page falls back
  // to the previous page without an extra effect.
  const pageCount = Math.max(1, Math.ceil(monthExpenses.length / pageSize));
  const currentPage = Math.min(page, pageCount);

  const pagedExpenses = useMemo(
    () =>
      monthExpenses.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [monthExpenses, currentPage, pageSize]
  );

  const resolveLoadError = useCallback((results: Array<PromiseSettledResult<unknown>>) => {
    const firstRejected = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected"
    );

    return firstRejected ? normalizeApiError(firstRejected.reason).message : null;
  }, []);

  const loadExpensesData = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    const token = accessToken;
    setPageError(null);

    const [incomeResult, categoriesResult, expensesResult] =
      await Promise.allSettled([
        incomeService.listIncome(token),
        expenseService.getExpenseCategories(token),
        expenseService.listExpenses(token),
      ]);

    if (incomeResult.status === "fulfilled") {
      setActiveIncome(incomeResult.value.incomes[0] ?? null);
    } else {
      setActiveIncome(null);
    }

    if (categoriesResult.status === "fulfilled") {
      setExpenseCategories(categoriesResult.value.categories);
    } else {
      setExpenseCategories([]);
    }

    if (expensesResult.status === "fulfilled") {
      setExpenses(sortExpenses(expensesResult.value.expenses));
    } else {
      setExpenses([]);
    }

    const nextError = resolveLoadError([
      incomeResult,
      categoriesResult,
      expensesResult,
    ]);

    if (nextError) {
      setPageError(nextError);
    }
  }, [accessToken, resolveLoadError]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const token = accessToken;
    let isMounted = true;

    async function run() {
      setIsLoading(true);

      try {
        const [incomeResult, categoriesResult, expensesResult] =
          await Promise.allSettled([
            incomeService.listIncome(token),
            expenseService.getExpenseCategories(token),
            expenseService.listExpenses(token),
          ]);

        if (!isMounted) {
          return;
        }

        if (incomeResult.status === "fulfilled") {
          setActiveIncome(incomeResult.value.incomes[0] ?? null);
        } else {
          setActiveIncome(null);
        }

        if (categoriesResult.status === "fulfilled") {
          setExpenseCategories(categoriesResult.value.categories);
        } else {
          setExpenseCategories([]);
        }

        if (expensesResult.status === "fulfilled") {
          setExpenses(sortExpenses(expensesResult.value.expenses));
        } else {
          setExpenses([]);
        }

        const nextError = resolveLoadError([
          incomeResult,
          categoriesResult,
          expensesResult,
        ]);
        setPageError(nextError);
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
  }, [accessToken, resolveLoadError]);

  const currentIncome = activeIncome;
  const isEditMode = editingExpenseId !== null;

  const allowedCategories = useMemo(() => {
    if (!currentIncome) {
      return [];
    }

    const allowedCodes = new Set(
      currentIncome.allocations.map((allocation) => allocation.category)
    );

    return expenseCategories.filter((category) => allowedCodes.has(category.code));
  }, [currentIncome, expenseCategories]);

  const spendByCategory = useMemo(() => {
    return monthExpenses.reduce<Record<string, number>>((accumulator, expense) => {
      accumulator[expense.category] =
        (accumulator[expense.category] ?? 0) + expense.amount;
      return accumulator;
    }, {});
  }, [monthExpenses]);

  const budgetStatuses = useMemo<ExpenseBudgetStatus[]>(() => {
    if (!currentIncome) {
      return [];
    }

    return currentIncome.allocations.map((allocation) => {
      const spent = spendByCategory[allocation.category] ?? 0;

      return {
        category: allocation.category,
        categoryName: allocation.categoryName,
        limit: allocation.limit,
        spent,
        remaining: allocation.limit - spent,
      };
    });
  }, [currentIncome, spendByCategory]);

  const totalSpent = useMemo(() => {
    return monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [monthExpenses]);

  const resetComposer = () => {
    setIsAdding(false);
    setNewDraft({
      ...defaultDraft,
      spentDate: getTodayDateInputValue(),
    });
    setDraftErrors({});
  };

  const resetEditState = () => {
    setEditingExpenseId(null);
    setEditDraft(defaultDraft);
    setEditErrors({});
  };

  const openAddModal = () => {
    resetEditState();
    setDraftErrors({});
    setErrorNotice(null);
    setNewDraft((current) => ({
      ...current,
      spentDate: current.spentDate || getTodayDateInputValue(),
    }));
    setIsAdding(true);
  };

  const validateExpenseDraft = ({
    draft,
    expenseIdToIgnore,
    allowPastMonths,
  }: {
    draft: ExpenseDraft;
    expenseIdToIgnore?: string | null;
    allowPastMonths: boolean;
  }) => {
    const nextErrors: DraftErrors = {};
    const parsedAmount = parsePositiveAmount(draft.amount);
    const trimmedDescription = draft.description.trim();
    const trimmedSpentDate = draft.spentDate.trim();

    if (!currentIncome) {
      return {
        parsedAmount: null,
        nextErrors,
      };
    }

    if (!draft.category) {
      nextErrors.category = "Choose a category.";
    }

    if (!trimmedDescription) {
      nextErrors.description = "Add a short description for the expense.";
    } else if (trimmedDescription.length > 255) {
      nextErrors.description =
        "Descriptions must be 255 characters or fewer.";
    }

    if (!parsedAmount) {
      nextErrors.amount = "Enter an amount greater than zero.";
    }

    if (!trimmedSpentDate) {
      nextErrors.spentDate = "Choose the date when this expense was spent.";
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedSpentDate)) {
      nextErrors.spentDate = "Spent date must be in YYYY-MM-DD format.";
    } else if (
      !allowPastMonths &&
      toMonthKey(trimmedSpentDate) !== getCurrentMonthKey()
    ) {
      nextErrors.spentDate =
        "New expenses can only be added to the current month.";
    }

    const allocation = currentIncome.allocations.find(
      (item) => item.category === draft.category
    );

    if (draft.category && !allocation) {
      nextErrors.category =
        "This category is not part of the active income allocation plan.";
    }

    // Category limits are monthly: compare against spending in the draft's own
    // month, not lifetime totals or whichever month is being viewed.
    if (allocation && parsedAmount && !nextErrors.spentDate) {
      const draftMonth = toMonthKey(trimmedSpentDate);
      const currentSpent = expenses
        .filter(
          (expense) =>
            expense.category === draft.category &&
            expense.id !== expenseIdToIgnore &&
            toMonthKey(expense.spentDate) === draftMonth
        )
        .reduce((sum, expense) => sum + expense.amount, 0);

      if (currentSpent + parsedAmount > allocation.limit) {
        nextErrors.amount = getBudgetErrorMessage(
          allocation,
          parsedAmount,
          currentSpent,
          draftMonth
        );
      }
    }

    return {
      parsedAmount,
      nextErrors,
    };
  };

  const handleRefresh = async () => {
    if (!accessToken) {
      return;
    }

    setIsRefreshing(true);

    try {
      await loadExpensesData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddExpense = async () => {
    if (!accessToken || !currentIncome) {
      return;
    }

    const { parsedAmount, nextErrors } = validateExpenseDraft({
      draft: newDraft,
      allowPastMonths: false,
    });

    setDraftErrors(nextErrors);

    if (!parsedAmount || Object.keys(nextErrors).length > 0) {
      if (nextErrors.amount) {
        setErrorNotice({
          title: "Expense limit reached",
          message: nextErrors.amount,
        });
      }
      return;
    }

    setPendingAction("create");

    try {
      const payload: ExpensePayload = {
        category: newDraft.category as IncomeCategoryCode,
        description: newDraft.description.trim(),
        amount: parsedAmount,
        spentDate: newDraft.spentDate,
      };

      const response = await expenseService.createExpense(payload, accessToken);

      setExpenses((current) => sortExpenses([response.expense, ...current]));
      setSelectedMonth(toMonthKey(response.expense.spentDate));
      setPage(1);
      resetComposer();
    } catch (error) {
      setErrorNotice(normalizeApiError(error));
    } finally {
      setPendingAction(null);
    }
  };

  const handleStartEdit = (expense: ExpenseView) => {
    setEditingExpenseId(expense.id);
    setEditDraft({
      category: expense.category,
      description: expense.description,
      amount: String(expense.amount),
      spentDate: expense.spentDate,
    });
    setEditErrors({});
    setIsAdding(false);
    setDraftErrors({});
  };

  const handleSaveEdit = async () => {
    if (!accessToken || !editingExpenseId) {
      return;
    }

    const { parsedAmount, nextErrors } = validateExpenseDraft({
      draft: editDraft,
      expenseIdToIgnore: editingExpenseId,
      allowPastMonths: true,
    });

    setEditErrors(nextErrors);

    if (!parsedAmount || Object.keys(nextErrors).length > 0) {
      if (nextErrors.amount) {
        setErrorNotice({
          title: "Expense limit reached",
          message: nextErrors.amount,
        });
      }
      return;
    }

    setPendingAction(editingExpenseId);

    try {
      const payload: ExpensePayload = {
        category: editDraft.category as IncomeCategoryCode,
        description: editDraft.description.trim(),
        amount: parsedAmount,
        spentDate: editDraft.spentDate,
      };

      const response = await expenseService.updateExpense(
        editingExpenseId,
        payload,
        accessToken
      );

      setExpenses((current) =>
        sortExpenses(
          current.map((expense) =>
            expense.id === editingExpenseId ? response.expense : expense
          )
        )
      );

      // Keep the edited row visible if its date moved it to another month.
      const savedMonth = toMonthKey(response.expense.spentDate);
      if (savedMonth !== selectedMonth) {
        setSelectedMonth(savedMonth);
        setPage(1);
      }
      resetEditState();
    } catch (error) {
      setErrorNotice(normalizeApiError(error));
    } finally {
      setPendingAction(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!accessToken || !expensePendingDelete) {
      return;
    }

    setPendingAction(expensePendingDelete.id);

    try {
      await expenseService.deleteExpense(expensePendingDelete.id, accessToken);
      setExpenses((current) =>
        current.filter((expense) => expense.id !== expensePendingDelete.id)
      );

      if (editingExpenseId === expensePendingDelete.id) {
        resetEditState();
      }

      setExpensePendingDelete(null);
    } catch (error) {
      setErrorNotice({
        title: "Unable to delete expense",
        message: normalizeApiError(error).message,
      });
    } finally {
      setPendingAction(null);
    }
  };

  if (isLoading) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-[28px] border border-border bg-surface px-8 py-10 text-center shadow-[0_20px_50px_rgba(13,20,33,0.08)]">
          <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-4 border-brand/15 border-t-brand" />
          <p className="text-sm font-medium text-copy-muted">
            Loading your expense workspace...
          </p>
        </div>
      </section>
    );
  }

  if (!currentIncome) {
    return (
      <div className="space-y-8">
        <SectionLabel
          eyebrow="Dashboard"
          title="Track spending once your income plan is in place"
          description="Expenses are budget-aware in this workspace, so the screen needs your active income allocations before it can validate category limits."
        />

        <section className="mx-auto flex min-h-[48vh] w-full max-w-4xl items-center justify-center rounded-[30px] border border-border bg-surface px-6 py-16 text-center shadow-[0_24px_70px_rgba(13,20,33,0.08)]">
          <div className="max-w-2xl space-y-5">
            {pageError ? (
              <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-left text-sm text-rose-700">
                {pageError}
              </div>
            ) : null}
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-strong">
              No active income plan
            </p>
            <h2 className="text-3xl font-semibold text-foreground">
              Start with category allocations before adding expenses.
            </h2>
            <p className="text-base leading-7 text-copy-muted">
              The expense flow checks every entry against the category budget from
              your newest income plan. Add those allocations first, then come back
              here to log spending with confidence.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard/income"
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-brand px-5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(0,120,97,0.24)] transition hover:bg-brand-strong"
              >
                Go to income plan
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const incomeLeft = currentIncome.totalIncome - totalSpent;

  return (
    <>
      <ErrorPopup notice={errorNotice} onClose={() => setErrorNotice(null)} />
      <ConfirmDeleteModal
        expense={expensePendingDelete}
        busy={pendingAction === expensePendingDelete?.id}
        onCancel={() => setExpensePendingDelete(null)}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
      />
      <ExpenseFormModal
        mode={isEditMode ? "edit" : "add"}
        open={isAdding || isEditMode}
        draft={isEditMode ? editDraft : newDraft}
        errors={isEditMode ? editErrors : draftErrors}
        busy={
          isEditMode
            ? pendingAction === editingExpenseId
            : pendingAction === "create"
        }
        categories={allowedCategories}
        minDate={isEditMode ? undefined : `${currentMonthKey}-01`}
        maxDate={isEditMode ? undefined : getTodayDateInputValue()}
        onChange={(patch) => {
          const setDraft = isEditMode ? setEditDraft : setNewDraft;
          setDraft((current) => ({ ...current, ...patch }));
        }}
        onSubmit={() => {
          void (isEditMode ? handleSaveEdit() : handleAddExpense());
        }}
        onClose={isEditMode ? resetEditState : resetComposer}
      />

      <div className="space-y-8">
        <SectionLabel
          eyebrow="Dashboard"
          title="Your budget and spending at a glance"
          description="See how much of your income is left, how each category is tracking against its budget, and log new expenses as they happen."
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

        <section className="rounded-[30px] border border-border bg-surface p-6 shadow-[0_24px_70px_rgba(13,20,33,0.08)] sm:p-8">
          <div className="space-y-6 border-b border-border/70 pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-strong">
                  Monthly budget
                </p>
                <h2 className="text-2xl font-semibold text-foreground">
                  Where your money is going
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-copy-muted">
                  Spending for the selected month against your monthly category
                  limits.
                </p>
              </div>

              <ListboxSelect
                ariaLabel="Month"
                value={selectedMonth}
                options={monthOptions}
                onChange={(nextMonth) => {
                  setSelectedMonth(nextMonth);
                  setPage(1);
                }}
                className="w-full shrink-0 sm:w-52"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-border bg-background px-4 py-4">
                <p className="text-sm font-medium text-copy-muted">Income</p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {formatCurrency(currentIncome.totalIncome)}
                </p>
                <p className="mt-1 text-xs text-copy-muted">
                  {formatCurrency(currentIncome.totalAllocated)} budgeted
                </p>
              </div>
              <div className="rounded-[22px] border border-border bg-background px-4 py-4">
                <p className="text-sm font-medium text-copy-muted">Spent</p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {formatCurrency(totalSpent)}
                </p>
                <p className="mt-1 text-xs text-copy-muted">
                  in {selectedMonthLabel} · of{" "}
                  {formatCurrency(currentIncome.totalAllocated)} budgeted
                </p>
              </div>
              <div className="rounded-[22px] border border-border bg-background px-4 py-4">
                <p className="text-sm font-medium text-copy-muted">Left</p>
                <p
                  className={cn(
                    "mt-2 text-xl font-semibold",
                    incomeLeft < 0 ? "text-rose-600" : "text-brand-strong"
                  )}
                >
                  {formatCurrency(incomeLeft)}
                </p>
                <p className="mt-1 text-xs text-copy-muted">
                  after {selectedMonthLabel} spending
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {budgetStatuses.map((status) => {
              const spentRatio =
                status.limit > 0 ? Math.min(status.spent / status.limit, 1) : 0;

              return (
                <div
                  key={status.category}
                  className="rounded-[24px] border border-border bg-background px-5 py-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-strong">
                        {status.categoryName}
                      </p>
                      <p className="mt-2 text-sm text-copy-muted">
                        Limit {formatCurrency(status.limit)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        status.remaining <= 0
                          ? "bg-rose-100 text-rose-700"
                          : "bg-brand/10 text-brand-strong"
                      )}
                    >
                      {status.remaining < 0
                        ? `Over by ${formatCurrency(Math.abs(status.remaining))}`
                        : `${formatCurrency(status.remaining)} left`}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="h-2 rounded-full bg-brand/10">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all",
                          status.remaining <= 0 ? "bg-rose-500" : "bg-brand"
                        )}
                        style={{ width: `${spentRatio * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm text-copy-muted">
                    <span>Spent {formatCurrency(status.spent)}</span>
                    <span>{Math.round(spentRatio * 100)}% used</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-[30px] border border-border bg-surface p-6 shadow-[0_24px_70px_rgba(13,20,33,0.08)] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">
                Expenses
              </h2>
              <p className="mt-1 text-sm text-copy-muted">
                {selectedMonthLabel}
                {" · "}
                {monthExpenses.length}{" "}
                {monthExpenses.length === 1 ? "entry" : "entries"}
                {" · "}
                {formatCurrency(totalSpent)} spent
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  void handleRefresh();
                }}
                disabled={isRefreshing || pendingAction !== null}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-medium text-copy-muted transition hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
              <button
                type="button"
                onClick={openAddModal}
                disabled={!isViewingCurrentMonth}
                title={
                  isViewingCurrentMonth
                    ? undefined
                    : `Switch to ${formatMonthLabel(currentMonthKey)} to add expenses`
                }
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-brand px-4 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(0,120,97,0.24)] transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:bg-brand sm:flex-none"
              >
                <svg
                  viewBox="0 0 20 20"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M10 4.5v11M4.5 10h11" strokeLinecap="round" />
                </svg>
                Add expense
              </button>
            </div>
          </div>

          {monthExpenses.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-[24px] border border-dashed border-border bg-background px-6 py-14 text-center">
              <div className="max-w-lg space-y-4">
                <h3 className="text-xl font-semibold text-foreground">
                  No expenses in {selectedMonthLabel} yet
                </h3>
                <p className="text-sm leading-6 text-copy-muted">
                  “What gets tracked gets improved.” Add your first expense and
                  this list will start showing where your budget goes.
                </p>
                <button
                  type="button"
                  onClick={openAddModal}
                  disabled={!isViewingCurrentMonth}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand px-5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(0,120,97,0.24)] transition hover:bg-brand-strong"
                >
                  Add expense
                </button>
              </div>
            </div>
          ) : (
            <ul className="mt-6 divide-y divide-border overflow-hidden rounded-[24px] border border-border bg-background">
              {pagedExpenses.map((expense) => (
                <li
                  key={expense.id}
                  className="group flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate font-medium text-foreground">
                        {expense.description}
                      </p>
                      {expense.recurringId ? (
                        <span
                          title="Auto-generated from a recurring template. Edit it on the Income page → recurring items."
                          className="inline-flex shrink-0 items-center rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-strong"
                        >
                          Recurring
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-copy-muted">
                      <span className="font-semibold uppercase tracking-[0.06em] text-brand-strong">
                        {expense.categoryName}
                      </span>
                      <span aria-hidden="true"> · </span>
                      {formatDate(expense.spentDate)}
                    </p>
                  </div>

                  <p className="shrink-0 font-semibold tabular-nums text-foreground">
                    {formatCurrency(expense.amount)}
                  </p>

                  <div className="flex w-[4.5rem] shrink-0 justify-end">
                    {expense.recurringId ? null : (
                      <div className="transition [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-within:opacity-100">
                        <ActionIcons
                          busy={pendingAction === expense.id}
                          onEdit={() => handleStartEdit(expense)}
                          onDelete={() => setExpensePendingDelete(expense)}
                        />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {monthExpenses.length > PAGE_SIZE_OPTIONS[0] ? (
            <div className="mt-4">
              <Pagination
                label="Expense pages"
                page={currentPage}
                pageCount={pageCount}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                totalItems={monthExpenses.length}
                onPageChange={setPage}
                onPageSizeChange={(nextSize) => {
                  setPageSize(nextSize);
                  setPage(1);
                }}
              />
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}
