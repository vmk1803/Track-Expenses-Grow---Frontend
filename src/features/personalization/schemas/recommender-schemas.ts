import { z } from "zod";
import type { RecommenderInputs } from "@/features/personalization/types/personalization";

export const recommenderInputsSchema = z.object({
  monthlyTakeHome: z
    .number({ error: "Enter your monthly take-home." })
    .finite("Enter a valid amount.")
    .positive("Take-home must be greater than zero.")
    .max(10_000_000, "Take-home looks too large — double-check the amount."),
  cityTier: z.enum(["metro", "tier2", "tier3"], {
    error: "Choose your city tier.",
  }),
  dependents: z
    .number({ error: "Enter the number of dependents." })
    .int("Dependents must be a whole number.")
    .min(0, "Dependents cannot be negative.")
    .max(10, "Cap dependents at 10 for this calculation."),
  monthlyEmi: z
    .number({ error: "Enter your monthly EMI (use 0 if none)." })
    .finite("Enter a valid amount.")
    .min(0, "EMI cannot be negative.")
    .max(10_000_000, "EMI looks too large — double-check the amount."),
  age: z
    .number({ error: "Enter your age." })
    .int("Age must be a whole number.")
    .min(18, "You must be at least 18.")
    .max(70, "Cap age at 70 for this calculation."),
});

function toFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  return Object.fromEntries(
    issues.map((issue) => [String(issue.path[0] ?? "form"), issue.message])
  );
}

export function validateRecommenderInputs(values: RecommenderInputs) {
  const result = recommenderInputsSchema.safeParse(values);

  if (result.success) {
    return { success: true as const, fieldErrors: {} };
  }

  return {
    success: false as const,
    fieldErrors: toFieldErrors(result.error.issues),
  };
}
