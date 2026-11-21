import type { IncomeCategoryCode } from "@/features/income/types/income";

/** How an expense was entered through Smart Add. */
export type ExpenseInputSource = "voice" | "text";

export type ExpenseCategory = {
  code: IncomeCategoryCode;
  name: string;
};

export type ExpensePayload = {
  category: IncomeCategoryCode;
  description: string;
  amount: number;
  spentDate: string;
  // Create only (Smart Add). The API requires both or neither.
  inputText?: string;
  inputSource?: ExpenseInputSource;
};

export type ExpenseView = {
  id: string;
  userId: string;
  category: IncomeCategoryCode;
  categoryName: string;
  description: string;
  amount: number;
  spentDate: string;
  recurringId: string | null;
  inputText: string | null;
  inputSource: ExpenseInputSource | null;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseBudgetStatus = {
  category: IncomeCategoryCode;
  categoryName: string;
  limit: number;
  spent: number;
  remaining: number;
};

export type ExpenseCategoriesResponse = {
  categories: ExpenseCategory[];
};

export type ExpenseListResponse = {
  expenses: ExpenseView[];
};

export type ExpenseRecordResponse = {
  expense: ExpenseView;
};
