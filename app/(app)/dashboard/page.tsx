import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatWeekdayDate, getDaysUntilDue, formatDueLabel, daysAgo } from "@/lib/date";
import { formatMoney } from "@/lib/formatters";
import { getFinancialConfidence } from "@/lib/financial-confidence";
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
      .select("full_name, last_greeting_shown_date, monthly_income")
      .eq("id", user.id)
      .single(),
    supabase.from("accounts").select("current_balance, type, subtype").eq("is_active", true),
    supabase
      .from("recurring_transactions")
      .select("id, name, amount, next_due_date")
      .eq("is_active", true)
      .order("next_due_date", { ascending: true })
      .limit(3),
    supabase
      .from("goals")
      .select("name, current_amount, target_amount, is_primary")
      .eq("user_id", user.id)
      .order("is_primary", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("amount, type")
      .eq("user_id", user.id)
      .eq("is_removed", false)
      .gte("date", firstOfMonthIso),
    supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("is_removed", false)
      .eq("type", "expense")
      .gte("date", startOfLastMonth)
      .lt("date", firstOfMonthIso),
    supabase
      .from("transactions")
      .select("amount, date")
      .eq("user_id", user.id)
      .eq("is_removed", false)
      .eq("type", "expense")
      .gte("date", daysAgo(13)),
    getFinancialConfidence(supabase, user.id),
  ]);

  const name = profileResult.data?.full_name?.trim().split(" ")[0];
  const firstName = name || user.email?.split("@")[0] || "there";

  const accounts = accountsResult.data ?? [];
  const hasAccounts = accounts.length > 0;

  const safeToSpend = accounts
    .filter((a) => a.type === "depository" && a.subtype === "checking")
    .reduce((sum, a) => sum + (a.current_balance ?? 0), 0);

  const upcomingBills = (billsResult.data ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    due: formatDueLabel(b.next_due_date),
    amount: b.amount,
  }));

  const soonestBill = billsResult.data?.[0] ?? null;
  const soonestDays = soonestBill ? getDaysUntilDue(soonestBill.next_due_date) : null;
  const dueSoonBill =
    soonestBill && soonestDays !== null && soonestDays >= 0 && soonestDays <= 1
      ? {
          name: soonestBill.name,
          amount: soonestBill.amount,
          isToday: soonestDays === 0,
          canCover: safeToSpend >= soonestBill.amount,
        }
      : null;

  const monthlyStory = await getOrCreateMonthlyStory(supabase, user.id);
  const weeklyReview = monthlyStory ? null : await getOrCreateWeeklyReview(supabase, user.id);

  const goal = goalResult.data;
  const goalFocus =
    goal && goal.current_amount < goal.target_amount
      ? { name: goal.name, remaining: goal.target_amount - goal.current_amount }
      : null;

  // Feeds the "Emergency Fund" card - previously hardcoded to a fixed 71% /
  // $10,650 of $15,000 regardless of the account. Now the user's real
  // top-priority Goal (whatever they named it, not necessarily "Emergency
  // Fund" specifically), or null if they haven't created one yet.
  const primaryGoal = goal
    ? {
        name: goal.name,
        currentAmount: goal.current_amount,
        targetAmount: goal.target_amount,
        percent:
          goal.target_amount > 0
            ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
            : 0,
      }
    : null;

  const monthTx = monthTxResult.data ?? [];
  const monthEarned = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + Math.abs(t.amount), 0);
  const monthSpent = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + Math.abs(t.amount), 0);
  const monthlySavings = monthEarned - monthSpent;

  const lastMonthSpent = (lastMonthTxResult.data ?? []).reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const weekTx = weekTxResult.data ?? [];
  const oneWeekAgo = daysAgo(6);
  const thisWeekSpend = weekTx
    .filter((t) => t.date >= oneWeekAgo)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const lastWeekSpend = weekTx
    .filter((t) => t.date < oneWeekAgo)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const weeklyHeadline = buildWeeklyHeadline(hasAccounts, thisWeekSpend, lastWeekSpend);
  const monthSoFarInsight = buildMonthSoFarInsight(
    hasAccounts,
    monthSpent,
    profileResult.data?.monthly_income ?? null,
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
