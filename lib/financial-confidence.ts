import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { moneyField, currencyFields } from "@/lib/money/persistence";
import { sumRows } from "@/lib/money/read";

export interface FinancialConfidenceResult {
  score: number;
  previousScore: number | null;
  isImproving: boolean;
  isFirstReading: boolean;
  safeToSpend: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function computeScore({
  safeToSpend,
  avgDailySpendLast30Days,
  billsDueNext14Days,
  spendThisMonth,
  spendLastMonth,
}: {
  safeToSpend: number;
  avgDailySpendLast30Days: number;
  billsDueNext14Days: number;
  spendThisMonth: number;
  spendLastMonth: number;
}): number {
  const weeklySpend = avgDailySpendLast30Days * 7;
  const cushionRatio = weeklySpend > 0 ? safeToSpend / weeklySpend : safeToSpend > 0 ? 1 : 0;
  const cushionScore = clamp(cushionRatio, 0, 1) * 100;

  const coverageRatio = billsDueNext14Days > 0 ? clamp(safeToSpend / billsDueNext14Days, 0, 1) : 1;
  const coverageScore = coverageRatio * 100;

  let trendScore = 100;
  if (spendLastMonth > 0) {
    const percentChange = (spendThisMonth - spendLastMonth) / spendLastMonth;
    trendScore = percentChange <= 0 ? 100 : clamp(100 - percentChange * 100, 0, 100);
  }

  const weighted = cushionScore * 0.4 + coverageScore * 0.3 + trendScore * 0.3;
  return Math.round(clamp(weighted, 0, 100));
}

export async function getFinancialConfidence(
  supabase: SupabaseClient,
  userId: string
): Promise<FinancialConfidenceResult> {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  const in14Days = new Date(now.getTime() + 14 * 86_400_000).toISOString().slice(0, 10);
  const last30DaysStart = new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);

  const [accountsResult, expenseResult, recentExpenseResult, billsResult, snapshotsResult] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("current_balance, current_balance_minor, currency_code, type, subtype")
        .eq("is_active", true),
      supabase
        .from("transactions")
        .select("amount, amount_minor, currency_code, date")
        .eq("is_removed", false)
        .eq("type", "expense")
        .gte("date", startOfLastMonth),
      supabase
        .from("transactions")
        .select("amount, amount_minor, currency_code, date")
        .eq("is_removed", false)
        .eq("type", "expense")
        .gte("date", last30DaysStart),
      supabase
        .from("recurring_transactions")
        .select("amount, amount_minor, currency_code, next_due_date")
        .eq("is_active", true)
        .gte("next_due_date", today)
        .lte("next_due_date", in14Days),
      supabase
        .from("financial_confidence_snapshots")
        .select("score, snapshot_date")
        .eq("user_id", userId)
        .order("snapshot_date", { ascending: false })
        .limit(2),
    ]);

  // Money aggregations run in exact integer minor units (sumRows), then convert
  // to a dollar number once for the score math below — which is ratio-based and
  // inherently floating point. The float drift the old per-row `sum + amount`
  // reduces introduced is gone; each total is exact to the cent.
  const safeToSpend = Number(
    sumRows(accountsResult.data ?? [], "current_balance", "USD", {
      filter: (a) => a.type === "depository" && a.subtype === "checking",
    }).toDecimalString()
  );

  const allExpenses = expenseResult.data ?? [];
  const spendThisMonth = Number(
    sumRows(allExpenses, "amount", "USD", { filter: (t) => (t.date as string) >= startOfThisMonth }).toDecimalString()
  );
  const spendLastMonth = Number(
    sumRows(allExpenses, "amount", "USD", { filter: (t) => (t.date as string) < startOfThisMonth }).toDecimalString()
  );

  const totalRecentSpend = Number(sumRows(recentExpenseResult.data ?? [], "amount", "USD").toDecimalString());
  const avgDailySpendLast30Days = totalRecentSpend / 30;

  const billsDueNext14Days = Number(sumRows(billsResult.data ?? [], "amount", "USD").toDecimalString());

  const score = computeScore({
    safeToSpend,
    avgDailySpendLast30Days,
    billsDueNext14Days,
    spendThisMonth,
    spendLastMonth,
  });

  const snapshots = snapshotsResult.data ?? [];
  const priorSnapshot = snapshots.find((s) => s.snapshot_date !== today);

  await supabase.from("financial_confidence_snapshots").upsert(
    {
      user_id: userId,
      score,
      ...moneyField("safe_to_spend", safeToSpend, "USD"),
      ...currencyFields("USD"),
      snapshot_date: today,
    },
    { onConflict: "user_id,snapshot_date" }
  );

  const previousScore = priorSnapshot?.score ?? null;

  return {
    score,
    previousScore,
    isImproving: previousScore !== null ? score >= previousScore : false,
    isFirstReading: previousScore === null,
    safeToSpend,
  };
}

export interface SafeToSpendHistoryPoint {
  date: string;
  value: number;
}

export async function getSafeToSpendHistory(
  supabase: SupabaseClient,
  userId: string,
  days: number = 7
): Promise<SafeToSpendHistoryPoint[]> {
  const { data } = await supabase
    .from("financial_confidence_snapshots")
    .select("snapshot_date, safe_to_spend")
    .eq("user_id", userId)
    .not("safe_to_spend", "is", null)
    .order("snapshot_date", { ascending: false })
    .limit(days);

  return (data ?? [])
    .map((row) => ({ date: row.snapshot_date as string, value: (row.safe_to_spend as number) ?? 0 }))
    .reverse();
}
