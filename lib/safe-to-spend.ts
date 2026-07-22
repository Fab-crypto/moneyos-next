import type { Transaction } from "@/types/finance";

// Accepts the app Transaction shape plus the legacy fields (type/amount) some
// older payloads still carry.
type SafeToSpendTransaction = Transaction & { type?: string; amount?: number };

interface SafeToSpendSettings {
  monthlyBudget?: number | null;
}

export function computeSafeToSpend(
  transactions: SafeToSpendTransaction[],
  settings: SafeToSpendSettings | null | undefined
) {
  const monthlyBudget = settings?.monthlyBudget ?? 320000;

  const spentThisMonth = transactions
    .filter((t) => t.type === "expense" || t.amountCents < 0)
    .reduce((sum, t) => sum + Math.abs(t.amountCents ?? t.amount ?? 0), 0);

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
