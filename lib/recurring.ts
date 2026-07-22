import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const RECURRING_WINDOW_DAYS = 90;

interface TxInput {
  merchant_name: string | null;
  name: string;
  amount: number;
  date: string;
  account_id: string;
  type: string;
  category: string | null;
}

export interface RecurringBillResult {
  name: string;
  accountId: string;
  amount: number;
  frequency: "weekly" | "biweekly" | "monthly";
  nextDueDate: string;
  category: string | null;
}

export function normalizeMerchant(description: string): string {
  return (description || "")
    .toLowerCase()
    .replace(/[#*].*$/g, "")
    .replace(/\d{2,}/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CADENCES = [
  { name: "weekly" as const, days: 7, tolerance: 2 },
  { name: "biweekly" as const, days: 14, tolerance: 3 },
  { name: "monthly" as const, days: 30, tolerance: 4 },
];

function classifyCadence(avgGapDays: number) {
  return CADENCES.find((c) => Math.abs(avgGapDays - c.days) <= c.tolerance) ?? null;
}

function daysBetween(a: string, b: string): number {
  return (new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86_400_000;
}

export function detectRecurringBills(transactions: TxInput[]): RecurringBillResult[] {
  const groups = new Map<string, TxInput[]>();

  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const label = t.merchant_name || t.name;
    if (!label || t.amount == null || !t.date) continue;
    const key = `${normalizeMerchant(label)}|${t.account_id}`;
    const list = groups.get(key) ?? [];
    list.push(t);
    groups.set(key, list);
  }

  const results: RecurringBillResult[] = [];

  for (const list of groups.values()) {
    if (list.length < 3) continue;
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));

    const amounts = sorted.map((t) => Math.abs(t.amount));
    const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    if (avgAmount === 0) continue;
    const amountsMatch = amounts.every((a) => Math.abs(a - avgAmount) / avgAmount <= 0.12);
    if (!amountsMatch) continue;

    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(daysBetween(sorted[i - 1].date, sorted[i].date));
    }
    const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const cadence = classifyCadence(avgGap);
    if (!cadence) continue;

    const gapsConsistent = gaps.every((g) => Math.abs(g - cadence.days) <= cadence.tolerance + 2);
    if (!gapsConsistent) continue;

    const last = sorted[sorted.length - 1];
    const today = new Date().toISOString().slice(0, 10);
    const lastIsFuture = last.date >= today;

    const nextDueDate = lastIsFuture
      ? last.date
      : new Date(new Date(last.date + "T00:00:00").getTime() + cadence.days * 86_400_000)
          .toISOString()
          .slice(0, 10);

    results.push({
      name: last.merchant_name || last.name,
      accountId: last.account_id,
      amount: avgAmount,
      frequency: cadence.name,
      nextDueDate,
      category: last.category,
    });
  }

  return results;
}

export async function refreshRecurringBills(
  admin: SupabaseClient,
  userId: string
): Promise<void> {
  const windowStart = new Date(Date.now() - RECURRING_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);

  const { data: transactions, error: txError } = await admin
    .from("transactions")
    .select("merchant_name, name, amount, date, account_id, type, category")
    .eq("user_id", userId)
    .eq("is_removed", false)
    .gte("date", windowStart);

  if (txError) {
    console.error(`[recurring] failed to fetch transactions for user=${userId}:`, txError);
    return;
  }

  const detected = detectRecurringBills(transactions ?? []);

  const { data: manualOverrides, error: manualError } = await admin
    .from("recurring_transactions")
    .select("name, account_id")
    .eq("user_id", userId)
    .eq("source", "manual");

  if (manualError) {
    console.error(`[recurring] failed to fetch manual overrides for user=${userId}:`, manualError);
    return;
  }

  const manualKeys = new Set((manualOverrides ?? []).map((m) => `${m.name}|${m.account_id}`));
  const autoDetected = detected.filter((b) => !manualKeys.has(`${b.name}|${b.accountId}`));

  const { data: existingDetected } = await admin
    .from("recurring_transactions")
    .select("id, name, account_id, amount")
    .eq("user_id", userId)
    .eq("source", "detected");

  const existingByKey = new Map(
    (existingDetected ?? []).map((r) => [`${r.name}|${r.account_id}`, { id: r.id, amount: r.amount }])
  );

  if (autoDetected.length > 0) {
    const rows = autoDetected.map((bill) => {
      const key = `${bill.name}|${bill.accountId}`;
      const isNew = !existingByKey.has(key);
      return {
        user_id: userId,
        account_id: bill.accountId,
        name: bill.name,
        amount: bill.amount,
        frequency: bill.frequency,
        next_due_date: bill.nextDueDate,
        category: bill.category,
        is_active: true,
        ...(isNew ? { review_status: "pending" as const } : {}),
      };
    });

    const { error: upsertError } = await admin
      .from("recurring_transactions")
      .upsert(rows, { onConflict: "user_id,name,account_id" });

    if (upsertError) {
      console.error(`[recurring] failed to upsert detected bills for user=${userId}:`, upsertError);
      return;
    }

    const historyRows = autoDetected
      .map((bill) => {
        const key = `${bill.name}|${bill.accountId}`;
        const existing = existingByKey.get(key);
        const isNew = !existing;
        const amountChanged = existing && Math.abs(existing.amount - bill.amount) > 0.005;
        if (!isNew && !amountChanged) return null;
        return { name: bill.name, accountId: bill.accountId, amount: bill.amount };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (historyRows.length > 0) {
      const { data: freshRows } = await admin
        .from("recurring_transactions")
        .select("id, name, account_id")
        .eq("user_id", userId)
        .in(
          "name",
          historyRows.map((r) => r.name)
        );

      const idByKey = new Map((freshRows ?? []).map((r) => [`${r.name}|${r.account_id}`, r.id]));

      const priceHistoryInserts = historyRows
        .map((r) => {
          const id = idByKey.get(`${r.name}|${r.accountId}`);
          if (!id) return null;
          return { recurring_transaction_id: id, user_id: userId, amount: r.amount };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (priceHistoryInserts.length > 0) {
        const { error: historyError } = await admin
          .from("subscription_price_history")
          .insert(priceHistoryInserts);

        if (historyError) {
          console.error(`[recurring] failed to record price history for user=${userId}:`, historyError);
        }
      }
    }
  }

  const detectedKeys = new Set(autoDetected.map((b) => `${b.name}|${b.accountId}`));

  const { data: existingActive, error: existingError } = await admin
    .from("recurring_transactions")
    .select("id, name, account_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("source", "detected");

  if (existingError) {
    console.error(`[recurring] failed to fetch existing bills for user=${userId}:`, existingError);
  } else {
    const staleIds = (existingActive ?? [])
      .filter((b) => !detectedKeys.has(`${b.name}|${b.account_id}`))
      .map((b) => b.id);

    if (staleIds.length > 0) {
      const { error: deactivateError } = await admin
        .from("recurring_transactions")
        .update({ is_active: false })
        .in("id", staleIds);

      if (deactivateError) {
        console.error(`[recurring] failed to deactivate stale bills for user=${userId}:`, deactivateError);
      }
    }
  }

  console.log(
    `[recurring] user=${userId} detected ${detected.length} pattern(s), ${autoDetected.length} auto-managed (${manualKeys.size} excluded as manually-touched)`
  );
}
