import type { IncomeView } from "@/features/income/types/income";

export type OverviewSummary = {
  totalIncome: number;
  totalAllocated: number;
  remainingIncome: number;
  totalSpent: number;
  remainingAfterSpending: number;
};

export type OverviewCategoryMetric = {
  category: string;
  categoryName: string;
  allocated: number;
  spent: number;
  remaining: number;
};

export type OverviewResponse = {
  summary: OverviewSummary;
  categories: OverviewCategoryMetric[];
  activeIncome: IncomeView | null;
};
