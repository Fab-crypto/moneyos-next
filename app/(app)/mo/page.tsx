import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { daysAgo } from "@/lib/date";
import { FINANCIAL_CONFIDENCE } from "@/lib/constants";
import { MOClient } from "./MOClient";

export default async function MoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/welcome");
  }

  const [subResult, checkingResult, txResult, billsResult] = await Promise.all([
    supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle(),
    supabase.from("accounts").select("current_balance, type, subtype").eq("is_active", true),
    supabase
      .from("transactions")
      .select("amount, category, date")
      .eq("is_removed", false)
      .eq("type", "expense")
      .gte("date", daysAgo(13)),
    supabase
      .from("recurring_transactions")
      .select("name, amount, next_due_date")
      .eq("is_active", true)
      .order("next_due_date", { ascending: true })
      .limit(3),
  ]);

  const isSubscribed = subResult.data?.status === "active" || subResult.data?.status === "trialing";

  const safeToSpendToday = (checkingResult.data ?? [])
    .filter((a) => a.type === "depository" && a.subtype === "checking")
    .reduce((sum, a) => sum + (a.current_balance ?? 0), 0);

  const allTx = txResult.data ?? [];
  const today = daysAgo(0);
  const todaySpend = allTx.filter((t) => t.date === today).reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const isFood = (cat: string | null) => {
    const c = (cat ?? "").toLowerCase();
    return c === "food" || c === "groceries" || c.includes("food");
  };
  const thisWeekFood = allTx
    .filter((t) => t.date >= daysAgo(6) && isFood(t.category))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const lastWeekFood = allTx
    .filter((t) => t.date >= daysAgo(13) && t.date < daysAgo(6) && isFood(t.category))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const upcomingBills = (billsResult.data ?? []).map((b) => ({
    name: b.name,
    amount: b.amount,
    dueDate: b.next_due_date,
  }));

  return (
    <MOClient
      isSubscribed={isSubscribed}
      safeToSpendToday={safeToSpendToday}
      todaySpend={todaySpend}
      thisWeekFood={thisWeekFood}
      lastWeekFood={lastWeekFood}
      upcomingBills={upcomingBills}
      financialConfidence={FINANCIAL_CONFIDENCE}
    />
  );
}
