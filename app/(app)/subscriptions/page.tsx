import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  detectDuplicateSubscriptions,
  findLongRunningSubscriptions,
  computeHealthScore,
} from "@/lib/subscription-health";
import { SubscriptionsClient } from "./SubscriptionsClient";

function monthlyEquivalent(amount: number, frequency: string): number {
  if (frequency === "weekly") return amount * 4.33;
  if (frequency === "biweekly") return amount * 2.17;
  return amount;
}

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/welcome");
  }

  const { data: subsData } = await supabase
    .from("recurring_transactions")
    .select(
      "id, name, amount, frequency, next_due_date, category, review_status, source, account_id, created_at, is_trial, trial_end_date"
    )
    .eq("user_id", user.id)
    .eq("is_active", true)
    .is("merged_into_id", null)
    .order("next_due_date", { ascending: true });

  const subs = subsData ?? [];
  const subIds = subs.map((s) => s.id);

  const { data: historyData } =
    subIds.length > 0
      ? await supabase
          .from("subscription_price_history")
          .select("recurring_transaction_id, amount, effective_date")
          .in("recurring_transaction_id", subIds)
          .order("effective_date", { ascending: true })
      : { data: [] };

  const historyBySubId = new Map<string, { amount: number; date: string }[]>();
  for (const h of historyData ?? []) {
    const list = historyBySubId.get(h.recurring_transaction_id) ?? [];
    list.push({ amount: h.amount, date: h.effective_date });
    historyBySubId.set(h.recurring_transaction_id, list);
  }

  const subscriptions = subs.map((s) => ({
    id: s.id,
    name: s.name,
    amount: s.amount,
    frequency: s.frequency as "weekly" | "biweekly" | "monthly",
    nextDueDate: s.next_due_date,
    category: s.category,
    reviewStatus: s.review_status as "pending" | "confirmed" | "ignored",
    source: s.source as "detected" | "manual",
    accountId: s.account_id,
    createdAt: s.created_at,
    isTrial: s.is_trial,
    trialEndDate: s.trial_end_date,
    priceHistory: historyBySubId.get(s.id) ?? [],
  }));

  const billable = subscriptions.filter((s) => s.reviewStatus !== "ignored");
  const monthlyTotal = billable.reduce((sum, s) => sum + monthlyEquivalent(s.amount, s.frequency), 0);
  const annualTotal = monthlyTotal * 12;

  const analysisInput = subscriptions.map((s) => ({
    id: s.id,
    name: s.name,
    accountId: s.accountId,
    amount: s.amount,
    reviewStatus: s.reviewStatus,
    createdAt: s.createdAt,
    priceHistory: s.priceHistory,
  }));

  const duplicates = detectDuplicateSubscriptions(analysisInput);
  const longRunning = findLongRunningSubscriptions(analysisInput);
  const healthScore = computeHealthScore(analysisInput, duplicates);

  return (
    <SubscriptionsClient
      subscriptions={subscriptions}
      monthlyTotal={monthlyTotal}
      annualTotal={annualTotal}
      duplicates={duplicates}
      longRunningIds={longRunning.map((s) => s.id)}
      healthScore={healthScore}
    />
  );
}
