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
  totalSpent: number;
  hasRealBudget: boolean;
  budget: number | null;
  topCategories: { name: string; amount: number }[];
  biggestPurchase: { merchant: string; amount: number; date: string } | null;
  narrative: string;
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

  const [txResult, profileResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, category, merchant_name, name, date")
      .eq("user_id", userId)
      .eq("is_removed", false)
      .eq("type", "expense")
      .gte("date", start)
      .lte("date", end),
    supabase.from("profiles").select("monthly_income").eq("id", userId).maybeSingle(),
  ]);

  const txs = txResult.data ?? [];
  if (txs.length === 0) return null;

  const totalSpent = txs.reduce((s, t) => s + Math.abs(t.amount), 0);
  const hasRealBudget = profileResult.data?.monthly_income != null;
  const budget = profileResult.data?.monthly_income ?? null;

  const byCategory = new Map<string, number>();
  for (const t of txs) {
    const cat = (t.category ?? "other").toLowerCase();
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + Math.abs(t.amount));
  }
  const topCategories = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, amount]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), amount }));

  const biggest = txs.reduce((max, t) => (Math.abs(t.amount) > Math.abs(max.amount) ? t : max));
  const biggestPurchase = {
    merchant: biggest.merchant_name || biggest.name,
    amount: Math.abs(biggest.amount),
    date: biggest.date,
  };

  const monthLabel = new Date(start + "T00:00:00").toLocaleDateString("en-US", { month: "long" });
  let narrative = `You spent $${totalSpent.toFixed(0)} in ${monthLabel}`;
  if (topCategories[0]) {
    narrative += `, with ${topCategories[0].name} as your biggest category.`;
  } else {
    narrative += ".";
  }

  const storyData: MonthlyStoryData = {
    totalSpent,
    hasRealBudget,
    budget,
    topCategories,
    biggestPurchase,
    narrative,
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
