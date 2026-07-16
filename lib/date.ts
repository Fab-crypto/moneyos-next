import type { Transaction } from "@/types/transaction";

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function formatFullDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso + "T00:00:00"));
}

export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(iso + "T00:00:00"));
}

export function formatWeekdayDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function getDaysUntilDue(nextDueDate: string | null): number | null {
  if (!nextDueDate) return null;
  const due = new Date(nextDueDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export function formatDueLabel(nextDueDate: string | null): string {
  const diffDays = getDaysUntilDue(nextDueDate);
  if (diffDays === null) return "Due date not set";
  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  return `Due in ${diffDays} days`;
}

const BUCKET_LABELS = ["Today", "Yesterday", "Earlier This Week", "Last Week", "Earlier"] as const;

export function groupTransactionsByDate(transactions: Transaction[]): [string, Transaction[]][] {
  const buckets: Record<(typeof BUCKET_LABELS)[number], Transaction[]> = {
    Today: [],
    Yesterday: [],
    "Earlier This Week": [],
    "Last Week": [],
    Earlier: [],
  };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const t of transactions) {
    const txDate = new Date(t.date + "T00:00:00");
    const diffDays = Math.round((today.getTime() - txDate.getTime()) / 86_400_000);
    if (diffDays <= 0) buckets.Today.push(t);
    else if (diffDays === 1) buckets.Yesterday.push(t);
    else if (diffDays <= 6) buckets["Earlier This Week"].push(t);
    else if (diffDays <= 13) buckets["Last Week"].push(t);
    else buckets.Earlier.push(t);
  }
  return BUCKET_LABELS
    .filter((label) => buckets[label].length > 0)
    .map((label) => [label, buckets[label]]);
}
