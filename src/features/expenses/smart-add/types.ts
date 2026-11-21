import type { ParsedExpense } from "@/features/expenses/smart-add/parser";
import type {
  ExpenseInputSource,
  ExpensePayload,
} from "@/features/expenses/types/expense";

/** Body of POST /expenses/parse. */
export type ParseExpenseRequest = {
  text: string;
  /** The user's local date (YYYY-MM-DD), so "yesterday" resolves in their timezone. */
  today: string;
};

/** The AI's field-by-field result: the rule parser's shape without warnings. */
export type AiParsedExpense = Omit<ParsedExpense, "warnings">;

export type ParseExpenseResponse = {
  parsed: AiParsedExpense;
};

/** What the Smart Add bar hands off, for typed text and (task 2.2) voice alike. */
export type SmartAddSubmission = {
  text: string;
  source: ExpenseInputSource;
};

/** The reviewed fields the card confirms; inputText/inputSource are added on save. */
export type SmartAddDraft = Pick<
  ExpensePayload,
  "category" | "description" | "amount" | "spentDate"
>;
