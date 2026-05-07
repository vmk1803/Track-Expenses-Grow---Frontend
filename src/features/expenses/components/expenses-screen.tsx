"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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

function getTodayDateInputValue() {
  return new Date().toISOString().slice(0, 10);
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
        "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-surface transition disabled:cursor-not-allowed disabled:opacity-60",
        toneClass
      )}
    >
      {children}
    </button>
  );
}

function ActionIcons(props: {
  editing?: boolean;
  busy?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
}) {
  if (props.editing) {
    return (
      <div className="flex items-center gap-2">
        <IconButton
          title="Cancel edit"
          onClick={() => props.onCancel?.()}
          disabled={props.busy}
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
        </IconButton>
        <IconButton
          title="Save expense"
          tone="success"
          onClick={() => props.onSave?.()}
          disabled={props.busy}
        >
          <svg
            viewBox="0 0 20 20"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              d="M4.5 10.5l3.2 3.2L15.5 6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </IconButton>
      </div>
    );
  }

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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(13,20,33,0.42)] px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-expense-title"
        className="w-full max-w-md rounded-[28px] border border-border bg-white p-6 shadow-[0_28px_80px_rgba(13,20,33,0.24)]"
      >
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-rose-600">
            Confirm delete
          </p>
          <h2
            id="delete-expense-title"
            className="text-2xl font-semibold text-foreground"
          >
            Remove this expense entry?
          </h2>
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
      </div>
    </div>
  );
}

function getBudgetErrorMessage(
  allocation: IncomeAllocationView,
  nextAmount: number,
  currentSpent: number
) {
  const overBy = currentSpent + nextAmount - allocation.limit;
  return `${allocation.categoryName} only has ${formatCurrency(
    Math.max(allocation.limit - currentSpent, 0)
  )} left. This entry exceeds the category limit by ${formatCurrency(overBy)}.`;
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
    return expenses.reduce<Record<string, number>>((accumulator, expense) => {
      accumulator[expense.category] =
        (accumulator[expense.category] ?? 0) + expense.amount;
      return accumulator;
    }, {});
  }, [expenses]);

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
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses]);

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

  const validateExpenseDraft = ({
    draft,
    expenseIdToIgnore,
  }: {
    draft: ExpenseDraft;
    expenseIdToIgnore?: string | null;
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
    }

    const allocation = currentIncome.allocations.find(
      (item) => item.category === draft.category
    );

    if (draft.category && !allocation) {
      nextErrors.category =
        "This category is not part of the active income allocation plan.";
    }

    if (allocation && parsedAmount) {
      const currentSpent = expenses
        .filter(
          (expense) =>
            expense.category === draft.category &&
            expense.id !== expenseIdToIgnore
        )
        .reduce((sum, expense) => sum + expense.amount, 0);

      if (currentSpent + parsedAmount > allocation.limit) {
        nextErrors.amount = getBudgetErrorMessage(
          allocation,
          parsedAmount,
          currentSpent
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
          eyebrow="Expenses"
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

      <div className="space-y-8">
        <SectionLabel
          eyebrow="Expenses"
          title="Track category spending against your active budget"
          description="Choose an allocated category, add a clear description, and log the amount. The screen keeps each category within its income limit."
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
          <div className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-strong">
                Active budget
              </p>
              <h2 className="text-2xl font-semibold text-foreground">
                Category usage at a glance
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-copy-muted">
                Each category below shows how much of the allocation has already
                been used by expenses and how much room is left.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-border bg-background px-4 py-4">
                <p className="text-sm font-medium text-copy-muted">Budgeted</p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {formatCurrency(currentIncome.totalAllocated)}
                </p>
              </div>
              <div className="rounded-[22px] border border-border bg-background px-4 py-4">
                <p className="text-sm font-medium text-copy-muted">Spent</p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {formatCurrency(totalSpent)}
                </p>
              </div>
              <div className="rounded-[22px] border border-border bg-background px-4 py-4">
                <p className="text-sm font-medium text-copy-muted">Remaining</p>
                <p className="mt-2 text-xl font-semibold text-brand-strong">
                  {formatCurrency(currentIncome.totalAllocated - totalSpent)}
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
                      {formatCurrency(status.remaining)} left
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

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[30px] border border-border bg-surface p-6 shadow-[0_24px_70px_rgba(13,20,33,0.08)] sm:p-8">
            <div className="flex flex-col gap-3 border-b border-border/70 pb-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-strong">
                    Add expense
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground">
                    Log a new spending entry
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding((current) => !current);
                    setDraftErrors({});
                    setErrorNotice(null);
                    resetEditState();
                    setNewDraft((current) => ({
                      ...current,
                      spentDate: current.spentDate || getTodayDateInputValue(),
                    }));
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:border-brand/40 hover:text-brand"
                >
                  {isAdding ? "Hide form" : "Add expense"}
                </button>
              </div>
              <p className="text-sm leading-6 text-copy-muted">
                Only categories from your active income allocations can be used
                here, so every expense stays grounded in the current budget plan.
              </p>
            </div>

            {isAdding ? (
              <div className="mt-6 space-y-5">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Spent date
                  </span>
                  <input
                    type="date"
                    value={newDraft.spentDate}
                    onChange={(event) =>
                      setNewDraft((current) => ({
                        ...current,
                        spentDate: event.target.value,
                      }))
                    }
                    className={cn(
                      "h-12 w-full rounded-2xl border bg-background px-4 text-sm text-foreground outline-none transition",
                      draftErrors.spentDate
                        ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                        : "border-border focus:border-brand focus:ring-2 focus:ring-brand/20"
                    )}
                  />
                  {draftErrors.spentDate ? (
                    <p className="text-sm text-rose-600">{draftErrors.spentDate}</p>
                  ) : null}
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Category
                  </span>
                  <select
                    value={newDraft.category}
                    onChange={(event) =>
                      setNewDraft((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    className={cn(
                      "h-12 w-full rounded-2xl border bg-background px-4 text-sm text-foreground outline-none transition",
                      draftErrors.category
                        ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                        : "border-border focus:border-brand focus:ring-2 focus:ring-brand/20"
                    )}
                  >
                    <option value="">Select category</option>
                    {allowedCategories.map((category) => (
                      <option key={category.code} value={category.code}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {draftErrors.category ? (
                    <p className="text-sm text-rose-600">{draftErrors.category}</p>
                  ) : null}
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Description
                  </span>
                  <textarea
                    rows={4}
                    value={newDraft.description}
                    onChange={(event) =>
                      setNewDraft((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Example: Grocery refill for the week"
                    className={cn(
                      "w-full rounded-2xl border bg-background px-4 py-3 text-sm text-foreground outline-none transition resize-none",
                      draftErrors.description
                        ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                        : "border-border focus:border-brand focus:ring-2 focus:ring-brand/20"
                    )}
                  />
                  {draftErrors.description ? (
                    <p className="text-sm text-rose-600">
                      {draftErrors.description}
                    </p>
                  ) : null}
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    Amount
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={newDraft.amount}
                    onChange={(event) =>
                      setNewDraft((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    placeholder="Enter amount"
                    className={cn(
                      "h-12 w-full rounded-2xl border bg-background px-4 text-sm text-foreground outline-none transition",
                      draftErrors.amount
                        ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                        : "border-border focus:border-brand focus:ring-2 focus:ring-brand/20"
                    )}
                  />
                  {draftErrors.amount ? (
                    <p className="text-sm text-rose-600">{draftErrors.amount}</p>
                  ) : null}
                </label>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={resetComposer}
                    disabled={pendingAction === "create"}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleAddExpense();
                    }}
                    disabled={pendingAction === "create"}
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand px-4 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(0,120,97,0.24)] transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pendingAction === "create" ? "Saving..." : "Save expense"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-[24px] border border-dashed border-border bg-background px-5 py-6">
                <p className="text-sm leading-6 text-copy-muted">
                  Open the composer when you are ready to add a new expense entry.
                  The form will show the remaining budget guardrails as soon as you
                  choose a category.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-[30px] border border-border bg-surface p-6 shadow-[0_24px_70px_rgba(13,20,33,0.08)] sm:p-8">
            <div className="flex flex-col gap-3 border-b border-border/70 pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-strong">
                  Expense list
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">
                  Current spending entries
                </h2>
                <p className="mt-2 text-sm leading-6 text-copy-muted">
                  Edit details inline or delete an entry to free that amount from
                  its category budget immediately.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void handleRefresh();
                }}
                disabled={isRefreshing || pendingAction !== null}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-medium text-copy-muted transition hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {expenses.length === 0 ? (
              <div className="mt-8 flex flex-col items-center justify-center rounded-[28px] border border-dashed border-border bg-background px-6 py-14 text-center">
                <div className="max-w-lg space-y-4">
                  <h3 className="text-2xl font-semibold text-foreground">
                    No expenses yet for this budget cycle
                  </h3>
                  <p className="text-base leading-7 text-copy-muted">
                    “What gets tracked gets improved.” Add your first expense entry
                    and this list will begin showing how each category budget moves
                    over time.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(true);
                      setDraftErrors({});
                      setNewDraft((current) => ({
                        ...current,
                        spentDate: current.spentDate || getTodayDateInputValue(),
                      }));
                    }}
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-brand px-5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(0,120,97,0.24)] transition hover:bg-brand-strong"
                  >
                    Add expense
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {expenses.map((expense) => {
                  const isEditing = editingExpenseId === expense.id;
                  const isBusy = pendingAction === expense.id;
                  const budgetStatus = budgetStatuses.find(
                    (status) => status.category === expense.category
                  );

                  return (
                    <div
                      key={expense.id}
                      className="rounded-[24px] border border-border bg-background px-5 py-5"
                    >
                      {isEditing ? (
                        <div className="grid gap-4 lg:grid-cols-[0.9fr_1fr_1.1fr_0.8fr_auto]">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-foreground">
                              Spent date
                            </label>
                            <input
                              type="date"
                              value={editDraft.spentDate}
                              onChange={(event) =>
                                setEditDraft((current) => ({
                                  ...current,
                                  spentDate: event.target.value,
                                }))
                              }
                              className={cn(
                                "h-12 w-full rounded-2xl border bg-surface px-4 text-sm text-foreground outline-none transition",
                                editErrors.spentDate
                                  ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                                  : "border-border focus:border-brand focus:ring-2 focus:ring-brand/20"
                              )}
                            />
                            {editErrors.spentDate ? (
                              <p className="text-sm text-rose-600">
                                {editErrors.spentDate}
                              </p>
                            ) : null}
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-foreground">
                              Category
                            </label>
                            <select
                              value={editDraft.category}
                              onChange={(event) =>
                                setEditDraft((current) => ({
                                  ...current,
                                  category: event.target.value,
                                }))
                              }
                              className={cn(
                                "h-12 w-full rounded-2xl border bg-surface px-4 text-sm text-foreground outline-none transition",
                                editErrors.category
                                  ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                                  : "border-border focus:border-brand focus:ring-2 focus:ring-brand/20"
                              )}
                            >
                              <option value="">Select category</option>
                              {allowedCategories.map((category) => (
                                <option key={category.code} value={category.code}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                            {editErrors.category ? (
                              <p className="text-sm text-rose-600">
                                {editErrors.category}
                              </p>
                            ) : null}
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-foreground">
                              Description
                            </label>
                            <textarea
                              rows={3}
                              value={editDraft.description}
                              onChange={(event) =>
                                setEditDraft((current) => ({
                                  ...current,
                                  description: event.target.value,
                                }))
                              }
                              className={cn(
                                "w-full rounded-2xl border bg-surface px-4 py-3 text-sm text-foreground outline-none transition resize-none",
                                editErrors.description
                                  ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                                  : "border-border focus:border-brand focus:ring-2 focus:ring-brand/20"
                              )}
                            />
                            {editErrors.description ? (
                              <p className="text-sm text-rose-600">
                                {editErrors.description}
                              </p>
                            ) : null}
                          </div>

                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-foreground">
                              Amount
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="0.01"
                              value={editDraft.amount}
                              onChange={(event) =>
                                setEditDraft((current) => ({
                                  ...current,
                                  amount: event.target.value,
                                }))
                              }
                              className={cn(
                                "h-12 w-full rounded-2xl border bg-surface px-4 text-sm text-foreground outline-none transition",
                                editErrors.amount
                                  ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                                  : "border-border focus:border-brand focus:ring-2 focus:ring-brand/20"
                              )}
                            />
                            {editErrors.amount ? (
                              <p className="text-sm text-rose-600">
                                {editErrors.amount}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex items-start justify-end lg:items-end">
                            <ActionIcons
                              editing
                              busy={isBusy}
                              onCancel={resetEditState}
                              onSave={() => {
                                void handleSaveEdit();
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-4 lg:grid-cols-[0.9fr_0.9fr_1.2fr_0.9fr_auto]">
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-strong">
                              {expense.categoryName}
                            </p>
                            <p className="mt-2 text-sm text-copy-muted">
                              {budgetStatus
                                ? `${formatCurrency(budgetStatus.remaining)} left in this category`
                                : "This category is outside the active allocation plan."}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-copy-muted">
                              Date
                            </p>
                            <p className="mt-2 text-base font-medium text-foreground">
                              {formatDate(expense.spentDate)}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-copy-muted">
                              Description
                            </p>
                            <p className="mt-2 text-base leading-7 text-foreground">
                              {expense.description}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-copy-muted">
                              Amount
                            </p>
                            <p className="mt-2 text-xl font-semibold text-foreground">
                              {formatCurrency(expense.amount)}
                            </p>
                          </div>

                          <div className="flex items-start justify-end lg:items-center">
                            <ActionIcons
                              busy={isBusy}
                              onEdit={() => handleStartEdit(expense)}
                              onDelete={() => setExpensePendingDelete(expense)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
