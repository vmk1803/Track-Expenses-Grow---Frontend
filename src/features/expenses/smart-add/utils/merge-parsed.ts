import type {
  FieldResult,
  ParsedExpense,
} from "@/features/expenses/smart-add/parser";
import type { AiParsedExpense } from "@/features/expenses/smart-add/types";
import type { ExpenseCategory } from "@/features/expenses/types/expense";

/** The AI field wins when it has a value and is at least as confident as the local one. */
function pickField<T>(local: FieldResult<T>, ai: FieldResult<T>): FieldResult<T> {
  if (ai.value === null) {
    return local;
  }
  if (local.value === null || ai.confidence >= local.confidence) {
    return ai;
  }
  return local;
}

/**
 * Combines the local rule-based parser's result with the AI's, field by field.
 * `rawText` and `warnings` always come from the local result. An AI category
 * outside the active income plan is ignored.
 */
export function mergeParsed(
  localResult: ParsedExpense,
  aiResult: AiParsedExpense | null,
  allowedCategories: ExpenseCategory[]
): ParsedExpense {
  if (!aiResult) {
    return localResult;
  }

  const aiCategoryAllowed = allowedCategories.some(
    (category) => category.code === aiResult.category.value
  );

  return {
    ...localResult,
    amount: pickField(localResult.amount, aiResult.amount),
    spentDate: pickField(localResult.spentDate, aiResult.spentDate),
    category: aiCategoryAllowed
      ? pickField(localResult.category, aiResult.category)
      : localResult.category,
    description: pickField(localResult.description, aiResult.description),
  };
}
