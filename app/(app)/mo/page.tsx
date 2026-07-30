import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { daysAgo } from "@/lib/date";
import { getFinancialConfidence } from "@/lib/financial-confidence";
import { sumRows, moneyNumber } from "@/lib/money/read";
import { MOClient } from "./MOClient";

export default async function MoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/welcome");
  }

  const [subResult, checkingResult, txResult, billsResult, confidence] = await Promise.all([
    supabase.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("accounts")
      .select("current_balance_minor, currency_code, type, subtype")
      .eq("user_id", user.id)
      .eq("is_active", true),
    supabase
      .from("transactions")
      .select("amount_minor, currency_code, category, date")
      .eq("user_id", user.id)
      .eq("is_removed", false)
      .eq("type", "expense")
      .gte("date", daysAgo(13)),
    supabase
      .from("recurring_transactions")
      .select("name, amount_minor, currency_code, next_due_date")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("next_due_date", { ascending: true })
      .limit(3),
    getFinancialConfidence(supabase, user.id),
  ]);

  const isSubscribed = subResult.data?.status === "active" || subResult.data?.status === "trialing";

  const safeToSpendToday = Number(
    sumRows(checkingResult.data ?? [], "current_balance", "USD", {
      filter: (a) => a.type === "depository" && a.subtype === "checking",
    }).toDecimalString()
  );

  const allTx = txResult.data ?? [];
  const today = daysAgo(0);
  const todaySpend = Number(
    sumRows(allTx, "amount", "USD", { filter: (t) => t.date === today }).toDecimalString()
  );

  const isFood = (cat: string | null) => {
    const c = (cat ?? "").toLowerCase();
    return c === "food" || c === "groceries" || c.includes("food");
  };
  const thisWeekFood = Number(
    sumRows(allTx, "amount", "USD", { filter: (t) => (t.date as string) >= daysAgo(6) && isFood(t.category as string | null) }).toDecimalString()
  );
  const lastWeekFood = Number(
    sumRows(allTx, "amount", "USD", {
      filter: (t) => (t.date as string) >= daysAgo(13) && (t.date as string) < daysAgo(6) && isFood(t.category as string | null),
    }).toDecimalString()
  );

  const upcomingBills = (billsResult.data ?? []).map((b) => ({
    name: b.name,
    amount: moneyNumber(b, "amount") ?? 0,
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
      financialConfidence={confidence.score}
    />
  );
}
