import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { moneyField, currencyFields } from "@/lib/money/persistence";
import { sumRows, moneyFromRow, moneyNumber } from "@/lib/money/read";
import { logMoneyWriteError } from "@/lib/money/log";

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

/**
 * The Financial Confidence score is a once-per-day metric keyed on
 * (user_id, snapshot_date). Rather than recomputing it and rewriting the
 * snapshot on every dashboard load / MO message (write-on-read amplification),
 * this is a read-through daily cache:
 *   - Cache hit (today's snapshot exists): return it from one cheap query — no
 *     heavy data queries, no recompute, no write.
 *   - Cache miss (first read of the day): compute from live data and persist
 *     the snapshot once.
 * The score is a daily wellness indicator, so day-granularity freshness is the
 * intended semantics. (For intraday freshness, add a computed_at column + TTL.)
 */
export async function getFinancialConfidence(
  supabase: SupabaseClient,
  userId: string
): Promise<FinancialConfidenceResult> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // Cheap cache probe: the two most recent snapshots (today's, if any, + prior).
  const { data: snapshotRows } = await supabase
    .from("financial_confidence_snapshots")
    .select("score, safe_to_spend_minor, currency_code, snapshot_date")
    .eq("user_id", userId)
    .order("snapshot_date", { ascending: false })
    .limit(2);

  const snapshots = snapshotRows ?? [];
  const todaySnapshot = snapshots.find((s) => s.snapshot_date === today);
  const priorSnapshot = snapshots.find((s) => s.snapshot_date !== today);
  const previousScore = priorSnapshot?.score ?? null;

  // ── Cache hit: today already computed. No recompute, no write. ──────────────
  if (todaySnapshot && todaySnapshot.score !== null && todaySnapshot.score !== undefined) {
    const cachedSafeToSpend = Number(
      moneyFromRow(todaySnapshot, "safe_to_spend", { fallbackCurrency: "USD" })?.toDecimalString() ?? 0
    );
    return {
      score: todaySnapshot.score,
      previousScore,
      isImproving: previousScore !== null ? todaySnapshot.score >= previousScore : false,
      isFirstReading: previousScore === null,
      safeToSpend: cachedSafeToSpend,
    };
  }

  // ── Cache miss (first read of the day): compute from live data, persist once. ─
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
  const in14Days = new Date(now.getTime() + 14 * 86_400_000).toISOString().slice(0, 10);
  const last30DaysStart = new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);

  const [accountsResult, expenseResult, recentExpenseResult, billsResult] = await Promise.all([
    supabase
      .from("accounts")
      .select("current_balance_minor, currency_code, type, subtype")
      .eq("user_id", userId)
      .eq("is_active", true),
    supabase
      .from("transactions")
      .select("amount_minor, currency_code, date")
      .eq("user_id", userId)
      .eq("is_removed", false)
      .eq("type", "expense")
      .gte("date", startOfLastMonth),
    supabase
      .from("transactions")
      .select("amount_minor, currency_code, date")
      .eq("user_id", userId)
      .eq("is_removed", false)
      .eq("type", "expense")
      .gte("date", last30DaysStart),
    supabase
      .from("recurring_transactions")
      .select("amount_minor, currency_code, next_due_date")
      .eq("user_id", userId)
      .eq("is_active", true)
      .gte("next_due_date", today)
      .lte("next_due_date", in14Days),
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

  const { error: snapshotError } = await supabase.from("financial_confidence_snapshots").upsert(
    {
      user_id: userId,
      score,
      ...moneyField("safe_to_spend", safeToSpend, "USD"),
      ...currencyFields("USD"),
      snapshot_date: today,
    },
    { onConflict: "user_id,snapshot_date" }
  );
  if (snapshotError) {
    logMoneyWriteError({
      op: "financial_confidence_snapshots.upsert",
      table: "financial_confidence_snapshots",
      userId,
      error: snapshotError,
    });
  }

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
    .select("snapshot_date, safe_to_spend_minor, currency_code")
    .eq("user_id", userId)
    .not("safe_to_spend_minor", "is", null)
    .order("snapshot_date", { ascending: false })
    .limit(days);

  return (data ?? [])
    .map((row) => ({ date: row.snapshot_date as string, value: moneyNumber(row, "safe_to_spend") ?? 0 }))
    .reverse();
}
