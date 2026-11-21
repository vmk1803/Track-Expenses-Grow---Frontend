// Date helpers shared by the expenses screen and Smart Add.
// All work on local calendar dates (YYYY-MM-DD), never UTC.

const monthLabelFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
});

export function padTwo(value: number) {
  return String(value).padStart(2, "0");
}

// Local calendar date (not toISOString, which is UTC and can be a day behind).
export function getTodayDateInputValue() {
  const now = new Date();
  return `${now.getFullYear()}-${padTwo(now.getMonth() + 1)}-${padTwo(now.getDate())}`;
}

/** "2026-11-10" → "2026-11" */
export function toMonthKey(dateValue: string) {
  return dateValue.slice(0, 7);
}

export function getCurrentMonthKey() {
  return toMonthKey(getTodayDateInputValue());
}

/** "2026-11" → "November 2026" */
export function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return monthLabelFormatter.format(new Date(year, month - 1, 1));
}
