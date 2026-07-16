import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatWeekdayDate } from "@/lib/date";
import { getFinancialConfidence } from "@/lib/financial-confidence";
import { getOrCreateWeeklyReview, getOrCreateMonthlyStory } from "@/lib/reviews";
import { DashboardClient } from "./DashboardClient";

function getDaysUntilDue(nextDueDate: string | null): number | null {
  if (!nextDueDate) return null;
  const due = new Date(nextDueDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function formatDueLabel(nextDueDate: string | null): string {
  const diffDays = getDaysUntilDue(nextDueDate);
  if (diffDays === null) return "Due date not set";
  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  return `Due in ${diffDays} days`;
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

  const [profileResult, accountsResult, billsResult, goalResult, monthTxResult, confidence] = await Promise.all([
    supabase.from("profiles").select("full_name, last_greeting_shown_date").eq("id", user.id).single(),
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

  const monthTx = monthTxResult.data ?? [];
  const monthEarned = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + Math.abs(t.amount), 0);
  const monthSpent = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + Math.abs(t.amount), 0);
  const monthlySavings = monthEarned - monthSpent;

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
    />
  );
}
