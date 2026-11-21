// Public entry point: import from "@/features/expenses/smart-add/parser" only,
// so the parser's internal files can change freely.
export { parseExpense } from "./parse-expense";
export type {
  FieldResult,
  ParseContext,
  ParsedExpense,
  ParseWarning,
  ParseWarningCode,
} from "./types";
