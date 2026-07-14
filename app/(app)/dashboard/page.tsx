import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatWeekdayDate } from "@/lib/date";
import { getFinancialConfidence } from "@/lib/financial-confidence";
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

  const [profileResult, accountsResult, billsResult, confidence] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase.from("accounts").select("current_balance, type, subtype").eq("is_active", true),
    supabase
      .from("recurring_transactions")
      .select("id, name, amount, next_due_date")
      .eq("is_active", true)
      .order("next_due_date", { ascending: true })
      .limit(3),
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

  return (
    <DashboardClient
      firstName={firstName}
      today={formatWeekdayDate()}
      safeToSpend={safeToSpend}
      hasAccounts={hasAccounts}
      upcomingBills={upcomingBills}
      dueSoonBill={dueSoonBill}
      confidence={confidence}
    />
  );
}
