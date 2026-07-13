import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFinancialConfidence } from "@/lib/financial-confidence";
import { TransactionsClient } from "./TransactionsClient";
import type { Transaction } from "@/types/transaction";

const BILL_CATEGORIES = new Set(["housing", "rent", "utilities", "streaming", "insurance", "bills"]);

export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/welcome");
  }

  const [txResult, accountsResult, institutionsResult, checkingResult, recurringResult, confidence] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("id, name, merchant_name, amount, type, category, date, account_id")
        .eq("is_removed", false)
        .order("date", { ascending: false })
        .limit(100),
      supabase.from("accounts").select("id, name, institution_id"),
      supabase.from("institutions").select("id, name"),
      supabase.from("accounts").select("current_balance, type, subtype").eq("is_active", true),
      supabase.from("recurring_transactions").select("name, account_id").eq("user_id", user.id).eq("is_active", true),
      getFinancialConfidence(supabase, user.id),
    ]);

  const institutionNameById = new Map((institutionsResult.data ?? []).map((i) => [i.id, i.name]));
  const accountLabelById = new Map(
    (accountsResult.data ?? []).map((a) => [
      a.id,
      a.institution_id && institutionNameById.has(a.institution_id)
        ? `${institutionNameById.get(a.institution_id)} ${a.name}`
        : a.name,
    ])
  );

  const activeRecurringKeys = new Set(
    (recurringResult.data ?? []).map((r) => `${r.name}|${r.account_id}`)
  );

  const transactions: Transaction[] = (txResult.data ?? []).map((t) => {
    const category = (t.category ?? "other").toLowerCase();
    const type: Transaction["type"] =
      t.type === "income" ? "income" : t.type === "transfer" ? "transfer" : BILL_CATEGORIES.has(category) ? "bill" : "spending";
    const merchant = t.merchant_name || t.name;

    return {
      id: t.id,
      merchant,
      category,
      account: accountLabelById.get(t.account_id) ?? "Account",
      accountId: t.account_id,
      type,
      date: t.date,
      amount: Math.abs(t.amount),
      notes: undefined,
      recurring: activeRecurringKeys.has(`${merchant}|${t.account_id}`),
    };
  });

  const safeToSpendToday = (checkingResult.data ?? [])
    .filter((a) => a.type === "depository" && a.subtype === "checking")
    .reduce((sum, a) => sum + (a.current_balance ?? 0), 0);

  return <TransactionsClient transactions={transactions} safeToSpendToday={safeToSpendToday} confidence={confidence} />;
}
