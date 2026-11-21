import type { ParseContext, ParsedExpense } from "./types";

const FIRST_NUMBER = /\d[\d,]*(?:\.\d+)?/;

/**
 * Turns one sentence ("250 for coffee yesterday") into expense fields.
 *
 * Stage 1 stub, replaced in task 3.6. The signature and return shape are
 * final; only the body below is naive: first number = amount, today = date,
 * no category, everything else = description.
 */
export function parseExpense(text: string, context: ParseContext): ParsedExpense {
  const rawText = text.trim();
  const match = rawText.match(FIRST_NUMBER);
  const amountValue = match ? Number(match[0].replace(/,/g, "")) : null;
  const hasAmount = amountValue !== null && Number.isFinite(amountValue);

  const leftover = (match ? rawText.replace(match[0], " ") : rawText)
    .replace(/\s+/g, " ")
    .trim();

  return {
    rawText,
    amount: hasAmount
      ? { value: amountValue, confidence: 0.5, matchedText: match?.[0] }
      : { value: null, confidence: 0 },
    spentDate: { value: context.today, confidence: 0.5 },
    category: { value: null, confidence: 0 },
    description: leftover
      ? { value: leftover, confidence: 0.5 }
      : { value: null, confidence: 0 },
    warnings: [],
  };
}
