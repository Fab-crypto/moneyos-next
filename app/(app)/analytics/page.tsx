import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { daysAgo } from "@/lib/date";
import { getFinancialConfidence, getSafeToSpendHistory } from "@/lib/financial-confidence";
import { sumRows, moneyFromRow } from "@/lib/money/read";
import { Money } from "@/lib/money/money";
import { AnalyticsClient } from "./AnalyticsClient";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/welcome");
  }

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);

  const [profileResult, txResult, confidence] = await Promise.all([
    supabase.from("profiles").select("monthly_income").eq("id", user.id).maybeSingle(),
    supabase
      .from("transactions")
      .select("amount, amount_minor, currency_code, category, merchant_name, name, date")
      .eq("user_id", user.id)
      .eq("is_removed", false)
      .eq("type", "expense")
      .gte("date", startOfLastMonth)
      .order("date", { ascending: false }),
    getFinancialConfidence(supabase, user.id),
  ]);

  const safeToSpendHistory = await getSafeToSpendHistory(supabase, user.id, 7);

  const hasRealBudget = profileResult.data?.monthly_income != null;
  const monthlyBudget = profileResult.data?.monthly_income || 3200;

  const safeToSpendToday = confidence.safeToSpend;

  const allTx = txResult.data ?? [];
  const thisMonthTx = allTx.filter((t) => t.date >= startOfThisMonth);
  const lastMonthTx = allTx.filter((t) => t.date < startOfThisMonth);

  // All money aggregations sum in exact integer minor units, converted to a
  // dollar number once for the client.
  const spendThisMonth = Number(sumRows(thisMonthTx, "amount", "USD").toDecimalString());
  const spendLastMonth = Number(sumRows(lastMonthTx, "amount", "USD").toDecimalString());

  const byCategory = new Map<string, Money>();
  for (const t of thisMonthTx) {
    const cat = ((t.category as string) ?? "other").toLowerCase();
    const money = moneyFromRow(t, "amount", { fallbackCurrency: "USD" });
    if (!money) continue;
    byCategory.set(cat, (byCategory.get(cat) ?? Money.zero("USD")).add(money));
  }
  const topCategories = [...byCategory.entries()]
    .sort((a, b) => b[1].compare(a[1]))
    .slice(0, 5)
    .map(([name, money]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      amount: Number(money.toDecimalString()),
    }));

  const weeklyTrend = Array.from({ length: 7 }, (_, i) => {
    const day = daysAgo(6 - i);
    return Number(sumRows(allTx, "amount", "USD", { filter: (t) => t.date === day }).toDecimalString());
  });

  const sourceForBiggest = thisMonthTx.length > 0 ? thisMonthTx : allTx;
  const biggestPurchase =
    sourceForBiggest.length > 0
      ? (() => {
          const biggest = sourceForBiggest.reduce((max, t) => (Math.abs(t.amount) > Math.abs(max.amount) ? t : max));
          return {
            merchant: biggest.merchant_name || biggest.name,
            category: (biggest.category ?? "other").toLowerCase(),
            amount: Number(moneyFromRow(biggest, "amount", { fallbackCurrency: "USD" })?.toDecimalString() ?? 0),
            date: biggest.date,
          };
        })()
      : null;

  const isFood = (cat: string | null) => {
    const c = (cat ?? "").toLowerCase();
    return c === "food" || c === "groceries";
  };
  const thisWeekFood = Number(
    sumRows(allTx, "amount", "USD", { filter: (t) => (t.date as string) >= daysAgo(6) && isFood(t.category as string | null) }).toDecimalString()
  );
  const lastWeekFood = Number(
    sumRows(allTx, "amount", "USD", {
      filter: (t) => (t.date as string) >= daysAgo(13) && (t.date as string) < daysAgo(6) && isFood(t.category as string | null),
    }).toDecimalString()
  );

  let smartInsight: string;
  if (lastWeekFood > 0) {
    const change = thisWeekFood - lastWeekFood;
    const pctChange = Math.round((change / lastWeekFood) * 100);
    smartInsight =
      change > 0
        ? `Food spending increased ${pctChange}% this week, but you're still comfortably within budget.`
        : change < 0
          ? `Food spending is down ${Math.abs(pctChange)}% this week — a steady, comfortable pace.`
          : "Your food spending held steady this week.";
  } else if (thisWeekFood > 0) {
    smartInsight = "You've spent on food this week, with nothing unusual to flag.";
  } else {
    smartInsight = "Your spending has been calm and steady this week.";
  }

  return (
    <AnalyticsClient
      spendThisMonth={spendThisMonth}
      spendLastMonth={spendLastMonth}
      monthlyBudget={monthlyBudget}
      hasRealBudget={hasRealBudget}
      topCategories={topCategories}
      weeklyTrend={weeklyTrend}
      biggestPurchase={biggestPurchase}
      smartInsight={smartInsight}
      safeToSpendToday={safeToSpendToday}
      safeToSpendHistory={safeToSpendHistory}
      confidence={confidence}
    />
  );
}
