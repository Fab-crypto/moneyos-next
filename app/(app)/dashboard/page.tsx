import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatWeekdayDate, getDaysUntilDue, formatDueLabel, daysAgo } from "@/lib/date";
import { formatMoney } from "@/lib/formatters";
import { getFinancialConfidence } from "@/lib/financial-confidence";
import { sumRows, moneyNumber } from "@/lib/money/read";
import { getOrCreateWeeklyReview, getOrCreateMonthlyStory } from "@/lib/reviews";
import { DashboardClient } from "./DashboardClient";

// Real, computed replacements for what used to be hardcoded copy on the
// dashboard ("You saved $42..." / "Your Month So Far"). Built server-side,
// same convention as the smartInsight logic in analytics/page.tsx.
function buildWeeklyHeadline(hasAccounts: boolean, thisWeekSpend: number, lastWeekSpend: number): string {
  if (!hasAccounts) {
    return "Connect a bank account to start tracking your spending.";
  }
  if (lastWeekSpend <= 0 && thisWeekSpend <= 0) {
    return "No spending recorded yet this week.";
  }
  if (lastWeekSpend <= 0) {
    return `You've spent $${formatMoney(thisWeekSpend)} this week.`;
  }
  const diff = lastWeekSpend - thisWeekSpend;
  if (Math.abs(diff) < 1) {
    return "Your spending is on par with last week.";
  }
  return diff > 0
    ? `You spent $${formatMoney(diff)} less than last week.`
    : `You spent $${formatMoney(Math.abs(diff))} more than last week.`;
}

function buildMonthSoFarInsight(
  hasAccounts: boolean,
  monthSpent: number,
  monthlyIncome: number | null,
  lastMonthSpent: number
): string {
  if (!hasAccounts) {
    return "Connect a bank account to see how this month is going.";
  }
  if (monthlyIncome) {
    const pctUsed = Math.round((monthSpent / monthlyIncome) * 100);
    return `You've spent $${formatMoney(monthSpent)} of your $${formatMoney(monthlyIncome)} monthly budget so far (${pctUsed}% used).`;
  }
  if (lastMonthSpent > 0) {
    return `You've spent $${formatMoney(monthSpent)} so far this month — you spent $${formatMoney(lastMonthSpent)} in all of last month.`;
  }
  if (monthSpent > 0) {
    return `You've spent $${formatMoney(monthSpent)} so far this month.`;
  }
  return "No spending recorded yet this month.";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/welcome");
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  const firstOfMonthIso = firstOfMonth.toISOString().slice(0, 10);
  const startOfLastMonth = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth() - 1, 1)
    .toISOString()
    .slice(0, 10);

  const [
    profileResult,
    accountsResult,
    billsResult,
    goalResult,
    monthTxResult,
    lastMonthTxResult,
    weekTxResult,
    confidence,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, last_greeting_shown_date, monthly_income_minor, currency_code, onboarding_completed_at")
      .eq("id", user.id)
      .single(),
    supabase
      .from("accounts")
      .select("current_balance_minor, currency_code, type, subtype")
      .eq("user_id", user.id)
      .eq("is_active", true),
    supabase
      .from("recurring_transactions")
      .select("id, name, amount_minor, currency_code, next_due_date")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("next_due_date", { ascending: true })
      .limit(3),
    supabase
      .from("goals")
      .select("name, current_amount_minor, target_amount_minor, currency_code, is_primary")
      .eq("user_id", user.id)
      .order("is_primary", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("amount_minor, currency_code, type")
      .eq("user_id", user.id)
      .eq("is_removed", false)
      .gte("date", firstOfMonthIso),
    supabase
      .from("transactions")
      .select("amount_minor, currency_code")
      .eq("user_id", user.id)
      .eq("is_removed", false)
      .eq("type", "expense")
      .gte("date", startOfLastMonth)
      .lt("date", firstOfMonthIso),
    supabase
      .from("transactions")
      .select("amount_minor, currency_code, date")
      .eq("user_id", user.id)
      .eq("is_removed", false)
      .eq("type", "expense")
      .gte("date", daysAgo(13)),
    getFinancialConfidence(supabase, user.id),
  ]);

  // Route anyone who hasn't finished onboarding (including accounts that
  // predate it) through the flow once; it marks completion and comes back.
  if (!profileResult.data?.onboarding_completed_at) {
    redirect("/onboarding");
  }

  const name = profileResult.data?.full_name?.trim().split(" ")[0];
  const firstName = name || user.email?.split("@")[0] || "there";

  const accounts = accountsResult.data ?? [];
  const hasAccounts = accounts.length > 0;

  // Money totals sum in exact integer minor units (sumRows), converted to a
  // dollar number once for the client. No float accumulation drift.
  const safeToSpend = Number(
    sumRows(accounts, "current_balance", "USD", {
      filter: (a) => a.type === "depository" && a.subtype === "checking",
    }).toDecimalString()
  );

  const upcomingBills = (billsResult.data ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    due: formatDueLabel(b.next_due_date),
    amount: moneyNumber(b, "amount") ?? 0,
  }));

  const soonestBill = billsResult.data?.[0] ?? null;
  const soonestBillAmount = moneyNumber(soonestBill, "amount") ?? 0;
  const soonestDays = soonestBill ? getDaysUntilDue(soonestBill.next_due_date) : null;
  const dueSoonBill =
    soonestBill && soonestDays !== null && soonestDays >= 0 && soonestDays <= 1
      ? {
          name: soonestBill.name,
          amount: soonestBillAmount,
          isToday: soonestDays === 0,
          canCover: safeToSpend >= soonestBillAmount,
        }
      : null;

  const monthlyStory = await getOrCreateMonthlyStory(supabase, user.id);
  const weeklyReview = monthlyStory ? null : await getOrCreateWeeklyReview(supabase, user.id);

  const goal = goalResult.data;
  const goalCurrent = moneyNumber(goal, "current_amount") ?? 0;
  const goalTarget = moneyNumber(goal, "target_amount") ?? 0;
  const goalFocus =
    goal && goalCurrent < goalTarget
      ? { name: goal.name, remaining: goalTarget - goalCurrent }
      : null;

  // Feeds the "Emergency Fund" card - previously hardcoded to a fixed 71% /
  // $10,650 of $15,000 regardless of the account. Now the user's real
  // top-priority Goal (whatever they named it, not necessarily "Emergency
  // Fund" specifically), or null if they haven't created one yet.
  const primaryGoal = goal
    ? {
        name: goal.name,
        currentAmount: goalCurrent,
        targetAmount: goalTarget,
        percent: goalTarget > 0 ? Math.min(100, Math.round((goalCurrent / goalTarget) * 100)) : 0,
      }
    : null;

  const monthTx = monthTxResult.data ?? [];
  const monthEarned = Number(
    sumRows(monthTx, "amount", "USD", { filter: (t) => t.type === "income" }).toDecimalString()
  );
  const monthSpent = Number(
    sumRows(monthTx, "amount", "USD", { filter: (t) => t.type === "expense" }).toDecimalString()
  );
  const monthlySavings = monthEarned - monthSpent;

  const lastMonthSpent = Number(sumRows(lastMonthTxResult.data ?? [], "amount", "USD").toDecimalString());

  const weekTx = weekTxResult.data ?? [];
  const oneWeekAgo = daysAgo(6);
  const thisWeekSpend = Number(
    sumRows(weekTx, "amount", "USD", { filter: (t) => (t.date as string) >= oneWeekAgo }).toDecimalString()
  );
  const lastWeekSpend = Number(
    sumRows(weekTx, "amount", "USD", { filter: (t) => (t.date as string) < oneWeekAgo }).toDecimalString()
  );

  const weeklyHeadline = buildWeeklyHeadline(hasAccounts, thisWeekSpend, lastWeekSpend);
  const monthSoFarInsight = buildMonthSoFarInsight(
    hasAccounts,
    monthSpent,
    moneyNumber(profileResult.data, "monthly_income"),
    lastMonthSpent
  );

  const showGreeting = profileResult.data?.last_greeting_shown_date !== todayIso;

  return (
    <DashboardClient
      firstName={firstName}
      today={formatWeekdayDate()}
      safeToSpend={safeToSpend}
      hasAccounts={hasAccounts}
      upcomingBills={upcomingBills}
      dueSoonBill={dueSoonBill}
      monthlyStory={monthlyStory}
      weeklyReview={weeklyReview}
      confidence={confidence}
      showGreeting={showGreeting}
      goalFocus={goalFocus}
      monthlySavings={monthlySavings}
      weeklyHeadline={weeklyHeadline}
      monthSoFarInsight={monthSoFarInsight}
      primaryGoal={primaryGoal}
    />
  );
}
