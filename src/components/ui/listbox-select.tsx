"use client";

import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { cn } from "@/lib/utils/cn";

export type ListboxSelectOption<T extends string | number> = {
  value: T;
  label: string;
};

type ListboxSelectProps<T extends string | number> = {
  value: T;
  options: ListboxSelectOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  anchor?: "bottom start" | "bottom end" | "top start" | "top end";
  size?: "sm" | "md";
  className?: string;
};

/**
 * Compact single-select dropdown built on Headless UI Listbox, styled with
 * the app's theme tokens. Keyboard navigation, focus management and ARIA come
 * from Headless UI.
 */
export function ListboxSelect<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  anchor = "bottom end",
  size = "md",
  className,
}: ListboxSelectProps<T>) {
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? String(value);

  return (
    <Listbox value={value} onChange={onChange}>
      <ListboxButton
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center justify-between gap-2 border border-border bg-surface font-medium text-foreground transition focus:outline-none data-focus:ring-2 data-focus:ring-brand/30 data-hover:border-brand/40",
          size === "sm"
            ? "h-8 rounded-xl px-2.5 text-sm"
            : "h-11 rounded-2xl px-4 text-sm",
          className
        )}
      >
        <span className="truncate">{selectedLabel}</span>
        <svg
          viewBox="0 0 20 20"
          className="h-4 w-4 shrink-0 text-copy-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </ListboxButton>
      <ListboxOptions
        anchor={anchor}
        className="z-50 max-h-72 min-w-(--button-width) overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-[0_16px_40px_rgba(13,20,33,0.14)] [--anchor-gap:6px] focus:outline-none"
      >
        {options.map((option) => (
          <ListboxOption
            key={option.value}
            value={option.value}
            className="cursor-pointer rounded-lg px-2.5 py-1.5 text-sm text-foreground data-focus:bg-brand/10 data-selected:font-semibold data-selected:text-brand-strong"
          >
            {option.label}
          </ListboxOption>
        ))}
      </ListboxOptions>
    </Listbox>
  );
}
