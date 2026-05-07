"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api/http-client";
import { useAppSelector } from "@/lib/store/hooks";
import { cn } from "@/lib/utils/cn";
import { incomeService } from "@/features/income/services/income-service";
import type {
  IncomeAllocation,
  IncomeCategory,
  IncomeCategoryCode,
  IncomeView,
} from "@/features/income/types/income";

type AllocationDraft = {
  category: string;
  limit: string;
};

type DraftErrors = {
  category?: string;
  limit?: string;
  totalIncome?: string;
};

const defaultDraft: AllocationDraft = {
  category: "",
  limit: "",
};

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

  return "Unable to complete the income request right now.";
}

function parsePositiveAmount(rawValue: string) {
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
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
  onEdit?: () => void;
  onDelete?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  editing?: boolean;
  busy?: boolean;
}) {
  if (props.editing) {
    return (
      <div className="flex items-center gap-2">
        <IconButton
          title="Cancel edit"
          onClick={() => props.onCancel?.()}
          disabled={props.busy}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
          </svg>
        </IconButton>
        <IconButton
          title="Save entry"
          tone="success"
          onClick={() => props.onSave?.()}
          disabled={props.busy}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4.5 10.5l3.2 3.2L15.5 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </IconButton>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <IconButton
        title="Edit entry"
        onClick={() => props.onEdit?.()}
        disabled={props.busy}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 14.75V16h1.25L14 7.25l-1.25-1.25L4 14.75Z" />
          <path d="M11.75 7.25 13 6a1.77 1.77 0 1 1 2.5 2.5l-1.25 1.25" strokeLinecap="round" />
        </svg>
      </IconButton>
      <IconButton
        title="Delete entry"
        tone="danger"
        onClick={() => props.onDelete?.()}
        disabled={props.busy}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5.75 6.25h8.5" strokeLinecap="round" />
          <path d="M8 6.25V4.75h4v1.5" strokeLinecap="round" />
          <path d="M7 8.5v5.25M10 8.5v5.25M13 8.5v5.25" strokeLinecap="round" />
          <path d="M6.25 6.25 7 15a1 1 0 0 0 1 .92h4a1 1 0 0 0 1-.92l.75-8.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </IconButton>
    </div>
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

export function IncomeScreen() {
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const [categories, setCategories] = useState<IncomeCategory[]>([]);
  const [activeIncome, setActiveIncome] = useState<IncomeView | null>(null);
  const [totalIncomeInput, setTotalIncomeInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isSavingTotal, setIsSavingTotal] = useState(false);
  const [pendingRowAction, setPendingRowAction] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [draftErrors, setDraftErrors] = useState<DraftErrors>({});
  const [newDraft, setNewDraft] = useState<AllocationDraft>(defaultDraft);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<AllocationDraft>(defaultDraft);
  const [editErrors, setEditErrors] = useState<DraftErrors>({});

  const loadIncomeData = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setPageError(null);

    try {
      const [categoriesResponse, incomeResponse] = await Promise.all([
        incomeService.getIncomeCategories(accessToken),
        incomeService.listIncome(accessToken),
      ]);

      const nextCategories = categoriesResponse.categories;
      const newestIncome = incomeResponse.incomes[0] ?? null;

      setCategories(nextCategories);
      setActiveIncome(newestIncome);
      setTotalIncomeInput(newestIncome ? String(newestIncome.totalIncome) : "");
    } catch (error) {
      setPageError(normalizeApiError(error));
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
        const [categoriesResponse, incomeResponse] = await Promise.all([
          incomeService.getIncomeCategories(token),
          incomeService.listIncome(token),
        ]);

        if (!isMounted) {
          return;
        }

        const newestIncome = incomeResponse.incomes[0] ?? null;
        setCategories(categoriesResponse.categories);
        setActiveIncome(newestIncome);
        setTotalIncomeInput(newestIncome ? String(newestIncome.totalIncome) : "");
        setPageError(null);
      } catch (error) {
        if (isMounted) {
          setPageError(normalizeApiError(error));
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

  const totalIncomeDirty = useMemo(() => {
    if (!activeIncome) {
      return false;
    }

    return totalIncomeInput !== String(activeIncome.totalIncome);
  }, [activeIncome, totalIncomeInput]);

  const availableNewCategories = useMemo(() => {
    const usedCategories = new Set(activeIncome?.allocations.map((allocation) => allocation.category) ?? []);

    return categories.filter((category) => !usedCategories.has(category.code));
  }, [activeIncome, categories]);

  const availableEditCategories = useMemo(() => {
    const usedCategories = new Set(
      activeIncome?.allocations
        .filter((allocation) => allocation.category !== editingCategory)
        .map((allocation) => allocation.category) ?? []
    );

    return categories.filter((category) => !usedCategories.has(category.code));
  }, [activeIncome, categories, editingCategory]);

  const resetComposer = () => {
    setIsAdding(false);
    setNewDraft(defaultDraft);
    setDraftErrors({});
  };

  const validateDraft = ({
    draft,
    existingAllocations,
    duplicateIgnoreCategory,
  }: {
    draft: AllocationDraft;
    existingAllocations: IncomeAllocation[];
    duplicateIgnoreCategory?: string | null;
  }) => {
    const nextErrors: DraftErrors = {};
    const parsedTotalIncome = parsePositiveAmount(totalIncomeInput);
    const parsedLimit = parsePositiveAmount(draft.limit);
    const nextCategory = draft.category as IncomeCategoryCode;

    if (!parsedTotalIncome) {
      nextErrors.totalIncome = "Enter a valid total income before saving entries.";
    }

    if (!draft.category) {
      nextErrors.category = "Choose a category.";
    }

    if (!parsedLimit) {
      nextErrors.limit = "Enter an amount greater than zero.";
    }

    const duplicateExists = existingAllocations.some(
      (allocation) =>
        allocation.category === nextCategory &&
        allocation.category !== duplicateIgnoreCategory
    );

    if (draft.category && duplicateExists) {
      nextErrors.category = "This category already exists in the income plan.";
    }

    if (parsedTotalIncome && parsedLimit) {
      const totalAllocated = existingAllocations.reduce(
        (sum, allocation) => sum + allocation.limit,
        0
      );

      if (totalAllocated + parsedLimit > parsedTotalIncome) {
        nextErrors.limit =
          "The sum of allocation limits cannot exceed total income.";
      }
    }

    return {
      parsedTotalIncome,
      parsedLimit,
      nextErrors,
    };
  };

  const submitPayload = async (payload: {
    totalIncome: number;
    allocations: IncomeAllocation[];
  }) => {
    if (!accessToken) {
      throw new Error("Missing access token.");
    }

    if (!activeIncome) {
      const response = await incomeService.createIncome(payload, accessToken);
      return response.income;
    }

    const response = await incomeService.updateIncome(
      activeIncome.id,
      payload,
      accessToken
    );
    return response.income;
  };

  const handleRefresh = async () => {
    if (!accessToken) {
      return;
    }

    setIsRefreshing(true);

    try {
      await loadIncomeData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSaveTotalIncome = async () => {
    if (!activeIncome) {
      return;
    }

    const parsedTotalIncome = parsePositiveAmount(totalIncomeInput);

    if (!parsedTotalIncome) {
      setDraftErrors((current) => ({
        ...current,
        totalIncome: "Enter a valid total income before saving.",
      }));
      return;
    }

    if (activeIncome.totalAllocated > parsedTotalIncome) {
      setDraftErrors((current) => ({
        ...current,
        totalIncome:
          "Total income must stay greater than or equal to allocated entries.",
      }));
      return;
    }

    setIsSavingTotal(true);
    setPageError(null);

    try {
      const response = await submitPayload({
        totalIncome: parsedTotalIncome,
        allocations: activeIncome.allocations.map(({ category, limit }) => ({
          category,
          limit,
        })),
      });

      setActiveIncome(response);
      setTotalIncomeInput(String(response.totalIncome));
      setDraftErrors((current) => ({ ...current, totalIncome: undefined }));
    } catch (error) {
      setPageError(normalizeApiError(error));
    } finally {
      setIsSavingTotal(false);
    }
  };

  const handleAddEntry = async () => {
    const existingAllocations =
      activeIncome?.allocations.map(({ category, limit }) => ({ category, limit })) ??
      [];
    const { parsedTotalIncome, parsedLimit, nextErrors } = validateDraft({
      draft: newDraft,
      existingAllocations,
    });

    setDraftErrors(nextErrors);

    if (!parsedTotalIncome || !parsedLimit || Object.keys(nextErrors).length > 0) {
      return;
    }

    setPendingRowAction("create");
    setPageError(null);

    try {
      const nextAllocations = [
        ...existingAllocations,
        {
          category: newDraft.category as IncomeCategoryCode,
          limit: parsedLimit,
        },
      ];
      const response = await submitPayload({
        totalIncome: parsedTotalIncome,
        allocations: nextAllocations,
      });

      setActiveIncome(response);
      setTotalIncomeInput(String(response.totalIncome));
      resetComposer();
    } catch (error) {
      setPageError(normalizeApiError(error));
    } finally {
      setPendingRowAction(null);
    }
  };

  const handleStartEdit = (allocation: IncomeView["allocations"][number]) => {
    setEditingCategory(allocation.category);
    setEditDraft({
      category: allocation.category,
      limit: String(allocation.limit),
    });
    setEditErrors({});
  };

  const handleSaveEdit = async () => {
    if (!activeIncome || !editingCategory) {
      return;
    }

    const remainingAllocations = activeIncome.allocations
      .filter((allocation) => allocation.category !== editingCategory)
      .map(({ category, limit }) => ({ category, limit }));

    const { parsedTotalIncome, parsedLimit, nextErrors } = validateDraft({
      draft: editDraft,
      existingAllocations: remainingAllocations,
      duplicateIgnoreCategory: editingCategory,
    });

    setEditErrors(nextErrors);

    if (!parsedTotalIncome || !parsedLimit || Object.keys(nextErrors).length > 0) {
      return;
    }

    setPendingRowAction(editingCategory);
    setPageError(null);

    try {
      const nextAllocations = activeIncome.allocations.map((allocation) =>
        allocation.category === editingCategory
          ? {
              category: editDraft.category as IncomeCategoryCode,
              limit: parsedLimit,
            }
          : {
              category: allocation.category,
              limit: allocation.limit,
            }
      );

      const response = await submitPayload({
        totalIncome: parsedTotalIncome,
        allocations: nextAllocations,
      });

      setActiveIncome(response);
      setTotalIncomeInput(String(response.totalIncome));
      setEditingCategory(null);
      setEditDraft(defaultDraft);
      setEditErrors({});
    } catch (error) {
      setPageError(normalizeApiError(error));
    } finally {
      setPendingRowAction(null);
    }
  };

  const handleDeleteEntry = async (category: IncomeCategoryCode) => {
    if (!activeIncome || !accessToken) {
      return;
    }

    setPendingRowAction(category);
    setPageError(null);

    try {
      const nextAllocations = activeIncome.allocations
        .filter((allocation) => allocation.category !== category)
        .map(({ category: allocationCategory, limit }) => ({
          category: allocationCategory,
          limit,
        }));

      if (nextAllocations.length === 0) {
        await incomeService.deleteIncome(activeIncome.id, accessToken);
        setActiveIncome(null);
        setIsAdding(false);
        setEditingCategory(null);
        setDraftErrors({});
        setEditErrors({});
        return;
      }

      const response = await submitPayload({
        totalIncome: activeIncome.totalIncome,
        allocations: nextAllocations,
      });
      setActiveIncome(response);

      if (editingCategory === category) {
        setEditingCategory(null);
        setEditDraft(defaultDraft);
        setEditErrors({});
      }
    } catch (error) {
      setPageError(normalizeApiError(error));
    } finally {
      setPendingRowAction(null);
    }
  };

  if (isLoading) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-[28px] border border-border bg-surface px-8 py-10 text-center shadow-[0_20px_50px_rgba(13,20,33,0.08)]">
          <div className="mx-auto mb-5 h-11 w-11 animate-spin rounded-full border-4 border-brand/15 border-t-brand" />
          <p className="text-sm font-medium text-copy-muted">
            Loading your income plan...
          </p>
        </div>
      </section>
    );
  }

  const currentIncome = activeIncome;

  return (
    <div className="space-y-8">
      <SectionLabel
        eyebrow="Income"
        title="Manage your active income plan"
        description="Set your total income, assign category limits, and keep the plan in sync with the backend. The newest backend record is treated as your active working plan."
      />

      {pageError ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {pageError}
        </div>
      ) : null}

      <section className="mx-auto w-full max-w-5xl rounded-[30px] border border-border bg-surface p-6 shadow-[0_24px_70px_rgba(13,20,33,0.08)] sm:p-8">
        <div className="flex flex-col gap-5 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-brand-strong">
              Active plan
            </p>
            <h2 className="text-2xl font-semibold text-foreground">
              Income allocation board
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-copy-muted">
              Add category allocations one by one, keep them under your total income,
              and edit rows inline without leaving the page.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex min-w-[220px] flex-col gap-2">
              <span className="text-sm font-medium text-foreground">
                Total income
              </span>
              <input
                type="number"
                min="1"
                step="0.01"
                value={totalIncomeInput}
                onChange={(event) =>
                  setTotalIncomeInput(event.target.value)
                }
                placeholder="Enter total income"
                className={cn(
                  "h-12 rounded-2xl border bg-background px-4 text-sm text-foreground outline-none transition",
                  draftErrors.totalIncome
                    ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                    : "border-border focus:border-brand focus:ring-2 focus:ring-brand/20"
                )}
              />
              {draftErrors.totalIncome ? (
                <span className="text-sm text-rose-600">
                  {draftErrors.totalIncome}
                </span>
              ) : null}
            </label>

            {currentIncome ? (
              <button
                type="button"
                onClick={handleSaveTotalIncome}
                disabled={!totalIncomeDirty || isSavingTotal || pendingRowAction !== null}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingTotal ? "Saving..." : "Save total"}
              </button>
            ) : null}
          </div>
        </div>

            {currentIncome ? (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-border bg-background px-5 py-5">
                <p className="text-sm font-medium text-copy-muted">Total income</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">
                  {formatCurrency(currentIncome.totalIncome)}
                </p>
              </div>
              <div className="rounded-[24px] border border-border bg-background px-5 py-5">
                <p className="text-sm font-medium text-copy-muted">Allocated</p>
                <p className="mt-3 text-2xl font-semibold text-foreground">
                  {formatCurrency(currentIncome.totalAllocated)}
                </p>
              </div>
              <div className="rounded-[24px] border border-border bg-background px-5 py-5">
                <p className="text-sm font-medium text-copy-muted">Remaining</p>
                <p className="mt-3 text-2xl font-semibold text-brand-strong">
                  {formatCurrency(currentIncome.remainingIncome)}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Allocation entries
                  </h3>
                  <p className="text-sm text-copy-muted">
                    Category limits are persisted as a single active income plan.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isRefreshing || pendingRowAction !== null}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-background px-4 text-sm font-medium text-copy-muted transition hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isRefreshing ? "Refreshing..." : "Refresh"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(true);
                      setDraftErrors({});
                    }}
                    disabled={isAdding || currentIncome.allocations.length >= 10}
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-brand px-4 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(0,120,97,0.24)] transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Add entry
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {currentIncome.allocations.map((allocation) => {
                  const isEditing = editingCategory === allocation.category;
                  const isBusy = pendingRowAction === allocation.category;

                  return (
                    <div
                      key={allocation.category}
                      className="grid gap-4 rounded-[24px] border border-border bg-background px-5 py-5 lg:grid-cols-[1.2fr_0.9fr_auto]"
                    >
                      {isEditing ? (
                        <>
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
                              {availableEditCategories.map((category) => (
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
                              Amount
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="0.01"
                              value={editDraft.limit}
                              onChange={(event) =>
                                setEditDraft((current) => ({
                                  ...current,
                                  limit: event.target.value,
                                }))
                              }
                              className={cn(
                                "h-12 w-full rounded-2xl border bg-surface px-4 text-sm text-foreground outline-none transition",
                                editErrors.limit
                                  ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                                  : "border-border focus:border-brand focus:ring-2 focus:ring-brand/20"
                              )}
                            />
                            {editErrors.limit ? (
                              <p className="text-sm text-rose-600">
                                {editErrors.limit}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex items-start justify-end lg:items-end">
                            <ActionIcons
                              editing
                              busy={isBusy}
                              onCancel={() => {
                                setEditingCategory(null);
                                setEditDraft(defaultDraft);
                                setEditErrors({});
                              }}
                              onSave={() => {
                                void handleSaveEdit();
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="text-sm font-medium uppercase tracking-[0.08em] text-brand-strong">
                              {allocation.categoryName}
                            </p>
                            <p className="mt-2 text-sm text-copy-muted">
                              Category code: {allocation.category}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-copy-muted">
                              Allocation limit
                            </p>
                            <p className="mt-2 text-xl font-semibold text-foreground">
                              {formatCurrency(allocation.limit)}
                            </p>
                          </div>

                          <div className="flex items-start justify-end lg:items-center">
                            <ActionIcons
                              busy={isBusy}
                              onEdit={() => handleStartEdit(allocation)}
                              onDelete={() => {
                                void handleDeleteEntry(allocation.category);
                              }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}

                {isAdding ? (
                  <div className="grid gap-4 rounded-[24px] border border-dashed border-brand/35 bg-brand/5 px-5 py-5 lg:grid-cols-[1.2fr_0.9fr_auto]">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-foreground">
                        Category
                      </label>
                      <select
                        value={newDraft.category}
                        onChange={(event) =>
                          setNewDraft((current) => ({
                            ...current,
                            category: event.target.value,
                          }))
                        }
                        className={cn(
                          "h-12 w-full rounded-2xl border bg-surface px-4 text-sm text-foreground outline-none transition",
                          draftErrors.category
                            ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                            : "border-border focus:border-brand focus:ring-2 focus:ring-brand/20"
                        )}
                      >
                        <option value="">Select category</option>
                        {availableNewCategories.map((category) => (
                          <option key={category.code} value={category.code}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      {draftErrors.category ? (
                        <p className="text-sm text-rose-600">
                          {draftErrors.category}
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
                        value={newDraft.limit}
                        onChange={(event) =>
                          setNewDraft((current) => ({
                            ...current,
                            limit: event.target.value,
                          }))
                        }
                        placeholder="Enter amount"
                        className={cn(
                          "h-12 w-full rounded-2xl border bg-surface px-4 text-sm text-foreground outline-none transition",
                          draftErrors.limit
                            ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                            : "border-border focus:border-brand focus:ring-2 focus:ring-brand/20"
                        )}
                      />
                      {draftErrors.limit ? (
                        <p className="text-sm text-rose-600">
                          {draftErrors.limit}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-start justify-end lg:items-end">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={resetComposer}
                          disabled={pendingRowAction === "create"}
                          className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-surface px-4 text-sm font-medium text-copy-muted transition hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleAddEntry();
                          }}
                          disabled={pendingRowAction === "create"}
                          className="inline-flex h-11 items-center justify-center rounded-2xl bg-foreground px-4 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {pendingRowAction === "create" ? "Saving..." : "Add"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center justify-center rounded-[28px] border border-dashed border-border bg-background px-6 py-16 text-center">
            <div className="max-w-xl space-y-4">
              <h3 className="text-2xl font-semibold text-foreground">
                Start your income plan with one intentional entry
              </h3>
              <p className="text-base leading-7 text-copy-muted">
                “A budget works best when every rupee is given a purpose before it
                disappears.” Add your first category allocation and this empty state
                will step aside for the live list.
              </p>
              <div className="flex flex-col items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(true);
                    setDraftErrors({});
                  }}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-brand px-5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(0,120,97,0.24)] transition hover:bg-brand-strong"
                >
                  Add income
                </button>
                <p className="text-sm text-copy-muted">
                  Set your total income above, then choose a category and amount below.
                </p>
              </div>
            </div>

            {isAdding ? (
              <div className="mt-8 grid w-full max-w-3xl gap-4 rounded-[24px] border border-dashed border-brand/35 bg-brand/5 px-5 py-5 lg:grid-cols-[1.2fr_0.9fr_auto]">
                <div className="space-y-2 text-left">
                  <label className="block text-sm font-medium text-foreground">
                    Category
                  </label>
                  <select
                    value={newDraft.category}
                    onChange={(event) =>
                      setNewDraft((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    className={cn(
                      "h-12 w-full rounded-2xl border bg-surface px-4 text-sm text-foreground outline-none transition",
                      draftErrors.category
                        ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                        : "border-border focus:border-brand focus:ring-2 focus:ring-brand/20"
                    )}
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.code} value={category.code}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {draftErrors.category ? (
                    <p className="text-sm text-rose-600">
                      {draftErrors.category}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2 text-left">
                  <label className="block text-sm font-medium text-foreground">
                    Amount
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={newDraft.limit}
                    onChange={(event) =>
                      setNewDraft((current) => ({
                        ...current,
                        limit: event.target.value,
                      }))
                    }
                    placeholder="Enter amount"
                    className={cn(
                      "h-12 w-full rounded-2xl border bg-surface px-4 text-sm text-foreground outline-none transition",
                      draftErrors.limit
                        ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
                        : "border-border focus:border-brand focus:ring-2 focus:ring-brand/20"
                    )}
                  />
                  {draftErrors.limit ? (
                    <p className="text-sm text-rose-600">
                      {draftErrors.limit}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-start justify-end lg:items-end">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={resetComposer}
                      disabled={pendingRowAction === "create"}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-border bg-surface px-4 text-sm font-medium text-copy-muted transition hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleAddEntry();
                      }}
                      disabled={pendingRowAction === "create"}
                      className="inline-flex h-11 items-center justify-center rounded-2xl bg-foreground px-4 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pendingRowAction === "create" ? "Saving..." : "Add"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
