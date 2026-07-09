"use client";

import { useMemo } from "react";
import { daysAgo } from "@/lib/date";
import type { Transaction } from "@/types/transaction";

/**
 * One calm, non-actionable coaching line derived from today's actual
 * spending. This is the seam a real AI-generated insight replaces later
 * — callers only ever get a string back, so swapping the implementation
 * for a model call won't touch any JSX.
 */
export function useDailyInsight(transactions: Transaction[], safeToSpend: number): string {
  return useMemo(() => {
    const today = daysAgo(0);
    const todaySpending = transactions.filter((t) => t.type === "spending" && t.date === today);
    const todayBills = transactions.filter((t) => t.type === "bill" && t.date === today);
    const totalToday = todaySpending.reduce((sum, t) => sum + t.amount, 0);

    if (totalToday === 0) {
      return "You haven't spent much today — there's room in your plan.";
    }

    const byCategory = new Map<string, number>();
    for (const t of todaySpending) {
      byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
    }
    const [topCategory, topAmount] = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];

    if ((topCategory === "food" || topCategory === "groceries") && topAmount > safeToSpend * 0.4) {
      return "Food spending is a little high today. Cooking tonight keeps you on pace.";
    }
    if (todayBills.length > 0) {
      return "Your recurring bills are covered. Nice work.";
    }
    if (totalToday < safeToSpend * 0.3) {
      return "You're spending less than usual today — a good sign.";
    }
    return "You're keeping a steady, comfortable pace today.";
  }, [transactions, safeToSpend]);
}
