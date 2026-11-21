import type { ExpenseCategory } from "@/features/expenses/types/expense";
import type { IncomeCategoryCode } from "@/features/income/types/income";

export type ParseContext = {
  /** Local calendar date, "YYYY-MM-DD". Passed in so parsing stays pure. */
  today: string;
  /** Categories from the active income plan; the only codes the parser may return. */
  allowedCategories: ExpenseCategory[];
};

export type FieldResult<T> = {
  value: T | null;
  /** 0..1. ≥0.8 ok, 0.5–0.8 "check this", <0.5 or null "needs your input". */
  confidence: number;
  /** The part of the input that produced this value, when there is one. */
  matchedText?: string;
};

export type ParseWarningCode =
  | "NO_AMOUNT"
  | "MULTIPLE_AMOUNTS"
  | "PAST_MONTH"
  | "FUTURE_DATE";

export type ParseWarning = {
  code: ParseWarningCode;
  message: string;
};

export type ParsedExpense = {
  rawText: string;
  amount: FieldResult<number>;
  spentDate: FieldResult<string>;
  category: FieldResult<IncomeCategoryCode>;
  description: FieldResult<string>;
  warnings: ParseWarning[];
};
