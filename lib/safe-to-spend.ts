import type { Transaction } from "@/types/finance";

export function computeSafeToSpend(transactions: Transaction[], settings: any) {
  const monthlyBudget = settings?.monthlyBudget ?? 320000;

  const spentThisMonth = transactions
    .filter((t: any) => t.type === "expense" || t.amountCents < 0)
    .reduce((sum: number, t: any) => sum + Math.abs(t.amountCents ?? t.amount ?? 0), 0);

  const safeToSpend = Math.max(0, monthlyBudget - spentThisMonth);
  const pctUsed = monthlyBudget > 0 ? spentThisMonth / monthlyBudget : 0;

  return {
    safeToSpend,
    status: pctUsed < 0.7 ? "excellent" : pctUsed < 0.9 ? "good" : pctUsed < 1 ? "watch" : "risk",
    confidence: pctUsed < 0.7 ? 99 : pctUsed < 0.9 ? 82 : pctUsed < 1 ? 64 : 35,
    message: pctUsed < 1 ? "You are ahead of budget." : "You are over budget this month.",
    spentThisMonth,
    monthlyBudget,
  };
}
