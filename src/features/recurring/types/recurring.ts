import type { IncomeCategoryCode } from "@/features/income/types/income";

export type RecurringExpenseView = {
  id: string;
  userId: string;
  category: IncomeCategoryCode;
  categoryName: string;
  description: string;
  amount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RecurringExpensePayload = {
  category: IncomeCategoryCode;
  description: string;
  amount: number;
};

export type RecurringListResponse = {
  recurring: RecurringExpenseView[];
};

export type RecurringRecordResponse = {
  recurring: RecurringExpenseView;
};
