import { cn } from "@/lib/utils/cn";

/** Shared input styling for expense forms (Add/Edit modal, Smart Add card). */
export function fieldClass(hasError: boolean, sizing = "h-12") {
  return cn(
    "w-full rounded-2xl border bg-background px-4 text-sm text-foreground outline-none transition",
    sizing,
    hasError
      ? "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-200"
      : "border-border focus:border-brand focus:ring-2 focus:ring-brand/20"
  );
}
