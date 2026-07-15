import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getLastCompletedWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const thisMonday = new Date(now);
  thisMonday.setHours(0, 0, 0, 0);
  thisMonday.setDate(now.getDate() - daysSinceMonday);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);
  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(thisMonday.getDate() - 1);

  return { start: toISODate(lastMonday), end: toISODate(lastSunday) };
}

function getLastCompletedMonthRange(): { start: string; end: string } {
  const now = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayOfLastMonth = new Date(firstOfThisMonth.getTime() - 86_400_000);

  return { start: toISODate(firstOfLastMonth), end: toISODate(lastDayOfLastMonth) };
}

export interface GoalProgress {
  name: string;
  currentAmount: number;
  targetAmount: number;
  progressPct: number;
}

export interface WeeklyReviewData {
  earned: number;
  spent: number;
  moneySaved: number;
  largestExpense: { merchant: string; amount: number } | null;
  bestCategory: { name: string; amount: number } | null;
  safeToSpendTrend: { start: number; end: number };
  confidenceTrend: { start: number; end: number };
  goals: GoalProgress[];
  oneThingToTry: string;
}

export interface MonthlyStoryData {
  monthLabel: string;
  earned: number;
  spent: number;
  moneySaved: number;
  hasRealBudget: boolean;
  budget: number | null;
  topCategories: { name: string; amount: number }[];
  biggestPurchase: { merchant: string; amount: number; date: string } | null;
  confidenceScore: number;
  goals: GoalProgress[];
  isFirstMonthTracked: boolean;
  narrative: string;
  closingLine: string;
}

export interface ReviewSnapshot<T> {
  id: string;
  type: "weekly" | "monthly";
  periodStart: string;
  periodEnd: string;
  data: T;
}

export async function getOrCreateWeeklyReview(
  supabase: SupabaseClient<any, "public", any>,
  userId: string
): Promise<ReviewSnapshot<WeeklyReviewData> | null> {
  const { start, end } = getLastCompletedWeekRange();

  const { data: existing } = await supabase
    .from("review_snapshots")
    .select("id, period_start, period_end, data, dismissed")
    .eq("user_id", userId)
    .eq("type", "weekly")
    .eq("period_start", start)
    .maybeSingle();

  if (existing) {
    if (existing.dismissed) return null;
    return { id: existing.id, type: "weekly", periodStart: existing.period_start, periodEnd: existing.period_end, data: existing.data };
  }

  const priorStart = toISODate(new Date(new Date(start + "T00:00:00").getTime() - 7 * 86_400_000));

  const [txResult, snapshotsResult, goalsResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, category, merchant_name, name, date, type")
      .eq("user_id", userId)
      .eq("is_removed", false)
      .gte("date", priorStart)
      .lte("date", end),
    supabase
      .from("financial_confidence_snapshots")
      .select("snapshot_date, score, safe_to_spend")
      .eq("user_id", userId)
      .gte("snapshot_date", start)
      .lte("snapshot_date", end)
      .order("snapshot_date", { ascending: true }),
    supabase.from("goals").select("name, current_amount, target_amount").eq("user_id", userId),
  ]);

  const allTx = txResult.data ?? [];
  const thisWeekExpenses = allTx.filter((t) => t.date >= start && t.date <= end && t.type === "expense");
  const thisWeekIncome = allTx.filter((t) => t.date >= start && t.date <= end && t.type === "income");

  if (thisWeekExpenses.length === 0 && thisWeekIncome.length === 0) return null;

  const spent = thisWeekExpenses.reduce((s, t) => s + Math.abs(t.amount), 0);
  const earned = thisWeekIncome.reduce((s, t) => s + Math.abs(t.amount), 0);
  const moneySaved = earned - spent;

  const largest = thisWeekExpenses.length > 0 ? thisWeekExpenses.reduce((max, t) => (Math.abs(t.amount) > Math.abs(max.amount) ? t : max)) : null;
  const largestExpense = largest ? { merchant: largest.merchant_name || largest.name, amount: Math.abs(largest.amount) } : null;

  const byCategory = new Map<string, number>();
  for (const t of thisWeekExpenses) {
    const cat = (t.category ?? "other").toLowerCase();
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + Math.abs(t.amount));
  }
  const topEntry = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const bestCategory = topEntry ? { name: topEntry[0].charAt(0).toUpperCase() + topEntry[0].slice(1), amount: topEntry[1] } : null;

  const snapshots = snapshotsResult.data ?? [];
  const safeToSpendTrend = {
    start: snapshots[0]?.safe_to_spend ?? 0,
    end: snapshots[snapshots.length - 1]?.safe_to_spend ?? snapshots[0]?.safe_to_spend ?? 0,
  };
  const confidenceTrend = {
    start: snapshots[0]?.score ?? 0,
    end: snapshots[snapshots.length - 1]?.score ?? snapshots[0]?.score ?? 0,
  };

  const goals: GoalProgress[] = (goalsResult.data ?? []).map((g) => ({
    name: g.name,
    currentAmount: g.current_amount,
    targetAmount: g.target_amount,
    progressPct: g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0,
  }));

  let oneThingToTry: string;
  if (moneySaved < 0 && bestCategory) {
    oneThingToTry = `You spent more than you earned this week — ${bestCategory.name.toLowerCase()} was the biggest piece of it, worth a look before next week.`;
  } else if (moneySaved < 0) {
    oneThingToTry = "You spent more than you earned this week — worth a look before next week.";
  } else if (bestCategory) {
    oneThingToTry = `${bestCategory.name} was where most of your spending went this week — nothing urgent, just worth noticing.`;
  } else {
    oneThingToTry = "A steady week — nothing here needs your attention.";
  }

  const reviewData: WeeklyReviewData = {
    earned,
    spent,
    moneySaved,
    largestExpense,
    bestCategory,
    safeToSpendTrend,
    confidenceTrend,
    goals,
    oneThingToTry,
  };

  const { data: inserted, error } = await supabase
    .from("review_snapshots")
    .upsert(
      { user_id: userId, type: "weekly", period_start: start, period_end: end, data: reviewData },
      { onConflict: "user_id,type,period_start" }
    )
    .select("id, period_start, period_end, data")
    .single();

  if (error || !inserted) {
    console.error(`[reviews] failed to create weekly review for user=${userId}:`, error);
    return null;
  }

  return { id: inserted.id, type: "weekly", periodStart: inserted.period_start, periodEnd: inserted.period_end, data: inserted.data };
}

export async function getOrCreateMonthlyStory(
  supabase: SupabaseClient<any, "public", any>,
  userId: string
): Promise<ReviewSnapshot<MonthlyStoryData> | null> {
  const { start, end } = getLastCompletedMonthRange();

  const { data: existing } = await supabase
    .from("review_snapshots")
    .select("id, period_start, period_end, data, dismissed")
    .eq("user_id", userId)
    .eq("type", "monthly")
    .eq("period_start", start)
    .maybeSingle();

  if (existing) {
    if (existing.dismissed) return null;
    return { id: existing.id, type: "monthly", periodStart: existing.period_start, periodEnd: existing.period_end, data: existing.data };
  }

  const [txResult, profileResult, snapshotsResult, goalsResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, category, merchant_name, name, date, type")
      .eq("user_id", userId)
      .eq("is_removed", false)
      .gte("date", start)
      .lte("date", end),
    supabase.from("profiles").select("monthly_income").eq("id", userId).maybeSingle(),
    supabase
      .from("financial_confidence_snapshots")
      .select("snapshot_date, score")
      .eq("user_id", userId)
      .order("snapshot_date", { ascending: true }),
    supabase.from("goals").select("name, current_amount, target_amount, is_primary").eq("user_id", userId),
  ]);

  const allTx = txResult.data ?? [];
  const expenses = allTx.filter((t) => t.type === "expense");
  const income = allTx.filter((t) => t.type === "income");

  if (expenses.length === 0 && income.length === 0) return null;

  const spent = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
  const earned = income.reduce((s, t) => s + Math.abs(t.amount), 0);
  const moneySaved = earned - spent;

  const hasRealBudget = profileResult.data?.monthly_income != null;
  const budget = profileResult.data?.monthly_income ?? null;

  const byCategory = new Map<string, number>();
  for (const t of expenses) {
    const cat = (t.category ?? "other").toLowerCase();
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + Math.abs(t.amount));
  }
  const topCategories = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, amount]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), amount }));

  const biggestPurchase =
    expenses.length > 0
      ? (() => {
          const biggest = expenses.reduce((max, t) => (Math.abs(t.amount) > Math.abs(max.amount) ? t : max));
          return { merchant: biggest.merchant_name || biggest.name, amount: Math.abs(biggest.amount), date: biggest.date };
        })()
      : null;

  const allSnapshots = snapshotsResult.data ?? [];
  const snapshotsInMonth = allSnapshots.filter((s) => s.snapshot_date <= end);
  const confidenceScore = snapshotsInMonth[snapshotsInMonth.length - 1]?.score ?? 0;

  const isFirstMonthTracked = allSnapshots.length > 0 && allSnapshots.every((s) => s.snapshot_date >= start);

  const goals: GoalProgress[] = (goalsResult.data ?? [])
    .slice()
    .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
    .map((g) => ({
      name: g.name,
      currentAmount: g.current_amount,
      targetAmount: g.target_amount,
      progressPct: g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0,
    }));

  const monthLabel = new Date(start + "T00:00:00").toLocaleDateString("en-US", { month: "long" });

  let narrative = `You spent $${spent.toFixed(0)} in ${monthLabel}`;
  narrative += topCategories[0] ? `, with ${topCategories[0].name} as your biggest category.` : ".";

  const closingLine =
    moneySaved < 0
      ? "Not every month is perfect — what matters is the next one."
      : "A solid month — keep the momentum going into the next one.";

  const storyData: MonthlyStoryData = {
    monthLabel,
    earned,
    spent,
    moneySaved,
    hasRealBudget,
    budget,
    topCategories,
    biggestPurchase,
    confidenceScore,
    goals,
    isFirstMonthTracked,
    narrative,
    closingLine,
  };

  const { data: inserted, error } = await supabase
    .from("review_snapshots")
    .upsert(
      { user_id: userId, type: "monthly", period_start: start, period_end: end, data: storyData },
      { onConflict: "user_id,type,period_start" }
    )
    .select("id, period_start, period_end, data")
    .single();

  if (error || !inserted) {
    console.error(`[reviews] failed to create monthly story for user=${userId}:`, error);
    return null;
  }

  return { id: inserted.id, type: "monthly", periodStart: inserted.period_start, periodEnd: inserted.period_end, data: inserted.data };
}
