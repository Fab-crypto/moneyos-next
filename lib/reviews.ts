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

export interface WeeklyReviewData {
  totalSpent: number;
  previousWeekTotal: number;
  topCategory: string | null;
  topCategoryAmount: number;
  insight: string;
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

  const { data: txs } = await supabase
    .from("transactions")
    .select("amount, category, date")
    .eq("user_id", userId)
    .eq("is_removed", false)
    .eq("type", "expense")
    .gte("date", priorStart)
    .lte("date", end);

  const thisWeekTx = (txs ?? []).filter((t) => t.date >= start && t.date <= end);
  const lastWeekTx = (txs ?? []).filter((t) => t.date >= priorStart && t.date < start);

  if (thisWeekTx.length === 0) return null;

  const totalSpent = thisWeekTx.reduce((s, t) => s + Math.abs(t.amount), 0);
  const previousWeekTotal = lastWeekTx.reduce((s, t) => s + Math.abs(t.amount), 0);

  const byCategory = new Map<string, number>();
  for (const t of thisWeekTx) {
    const cat = (t.category ?? "other").toLowerCase();
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + Math.abs(t.amount));
  }
  const topEntry = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  let insight: string;
  if (previousWeekTotal > 0) {
    const change = totalSpent - previousWeekTotal;
    const pct = Math.round((Math.abs(change) / previousWeekTotal) * 100);
    insight =
      change > 0
        ? `Spending was ${pct}% higher than the week before.`
        : change < 0
          ? `Spending was ${pct}% lower than the week before.`
          : "Spending held steady compared to the week before.";
  } else {
    insight = "This is your first full week of spending history.";
  }

  const reviewData: WeeklyReviewData = {
    totalSpent,
    previousWeekTotal,
    topCategory: topEntry ? topEntry[0].charAt(0).toUpperCase() + topEntry[0].slice(1) : null,
    topCategoryAmount: topEntry ? topEntry[1] : 0,
    insight,
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
