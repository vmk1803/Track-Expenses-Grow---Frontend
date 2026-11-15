"use client";

import { Button } from "@headlessui/react";
import { ListboxSelect } from "@/components/ui/listbox-select";
import { cn } from "@/lib/utils/cn";

type PageItem = number | "gap";

type PaginationProps = {
  page: number;
  pageCount: number;
  pageSize: number;
  pageSizeOptions: readonly number[];
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  label?: string;
};

/**
 * First, last and current ±1 pages, with "gap" markers where pages are skipped.
 * e.g. current=6, count=12 → [1, gap, 5, 6, 7, gap, 12]
 */
function getPageItems(current: number, count: number): PageItem[] {
  const pages = [...new Set([1, current - 1, current, current + 1, count])]
    .filter((value) => value >= 1 && value <= count)
    .sort((left, right) => left - right);

  const items: PageItem[] = [];

  pages.forEach((value, index) => {
    if (index > 0 && value - pages[index - 1] > 1) {
      items.push("gap");
    }
    items.push(value);
  });

  return items;
}

const pageButtonClass =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-xl px-2 text-sm font-medium tabular-nums transition focus:outline-none data-focus:ring-2 data-focus:ring-brand/30 data-disabled:cursor-not-allowed data-disabled:opacity-40";

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  const path = direction === "left" ? "M12 5l-5 5 5 5" : "M8 5l5 5-5 5";

  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Pagination({
  page,
  pageCount,
  pageSize,
  pageSizeOptions,
  totalItems,
  onPageChange,
  onPageSizeChange,
  label = "Pagination",
}: PaginationProps) {
  const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  return (
    <nav
      aria-label={label}
      className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
    >
      <div className="flex items-center gap-3 text-sm text-copy-muted">
        <span>
          Showing{" "}
          <span className="font-medium tabular-nums text-foreground">
            {firstItem}–{lastItem}
          </span>{" "}
          of <span className="tabular-nums">{totalItems}</span>
        </span>

        <ListboxSelect
          ariaLabel="Rows per page"
          size="sm"
          anchor="top start"
          value={pageSize}
          options={pageSizeOptions.map((option) => ({
            value: option,
            label: `${option} / page`,
          }))}
          onChange={onPageSizeChange}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1">
        <Button
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={cn(
            pageButtonClass,
            "gap-1 text-copy-muted data-hover:bg-brand/10 data-hover:text-brand"
          )}
        >
          <ChevronIcon direction="left" />
          <span className="hidden pr-1 sm:inline">Prev</span>
        </Button>

        {getPageItems(page, pageCount).map((item, index) =>
          item === "gap" ? (
            <span
              key={`gap-${index}`}
              aria-hidden="true"
              className="inline-flex h-8 w-5 items-center justify-center text-sm text-copy-muted"
            >
              …
            </span>
          ) : (
            <Button
              key={item}
              aria-label={`Page ${item}`}
              aria-current={item === page ? "page" : undefined}
              onClick={() => onPageChange(item)}
              className={cn(
                pageButtonClass,
                item === page
                  ? "bg-brand text-white"
                  : "text-foreground data-hover:bg-brand/10 data-hover:text-brand"
              )}
            >
              {item}
            </Button>
          )
        )}

        <Button
          aria-label="Next page"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className={cn(
            pageButtonClass,
            "gap-1 text-copy-muted data-hover:bg-brand/10 data-hover:text-brand"
          )}
        >
          <span className="hidden pl-1 sm:inline">Next</span>
          <ChevronIcon direction="right" />
        </Button>
      </div>
    </nav>
  );
}
