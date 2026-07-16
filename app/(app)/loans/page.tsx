import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeCreditPayoffProjection } from "@/lib/loans";
import { LoansClient } from "./LoansClient";

function yearsFromNow(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const years = (target.getTime() - today.getTime()) / (365.25 * 86_400_000);
  return years > 0 ? Math.round(years * 10) / 10 : 0;
}

export default async function LoansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/welcome");
  }

  const [accountsResult, institutionsResult] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, official_name, mask, type, subtype, current_balance, institution_id")
      .eq("is_active", true)
      .in("type", ["loan", "credit"]),
    supabase.from("institutions").select("id, name"),
  ]);

  const accounts = accountsResult.data ?? [];
  const accountIds = accounts.map((a) => a.id);

  const [loanDetailsResult, snapshotsResult] =
    accountIds.length > 0
      ? await Promise.all([
          supabase.from("loan_details").select("*").in("account_id", accountIds),
          supabase
            .from("loan_balance_snapshots")
            .select("account_id, balance, snapshot_date")
            .in("account_id", accountIds)
            .order("snapshot_date", { ascending: true }),
        ])
      : [{ data: [] }, { data: [] }];

  const institutionNameById = new Map((institutionsResult.data ?? []).map((i) => [i.id, i.name]));
  const detailsByAccountId = new Map((loanDetailsResult.data ?? []).map((d) => [d.account_id, d]));

  const snapshotsByAccountId = new Map<string, { date: string; balance: number }[]>();
  for (const s of snapshotsResult.data ?? []) {
    const list = snapshotsByAccountId.get(s.account_id) ?? [];
    list.push({ date: s.snapshot_date, balance: s.balance });
    snapshotsByAccountId.set(s.account_id, list);
  }

  const loans = accounts.map((account) => {
    const details = detailsByAccountId.get(account.id) ?? null;
    const loanType =
      (details?.loan_type as "credit" | "mortgage" | "student" | undefined) ??
      (account.subtype === "credit card" ? "credit" : null);
    const balance = account.current_balance ?? 0;
    const interestRate = details?.interest_rate_percentage ?? null;
    const minimumPaymentAmount = details?.minimum_payment_amount ?? null;
    const detailsJson = (details?.details as Record<string, unknown>) ?? null;

    let payoffDate: string | null = null;
    let payoffMonths: number | null = null;
    let totalInterestRemaining: number | null = null;
    let neverPaysOffAtCurrentPayment = false;

    if (loanType === "mortgage" && detailsJson?.maturity_date) {
      payoffDate = detailsJson.maturity_date as string;
    } else if (loanType === "student" && detailsJson?.expected_payoff_date) {
      payoffDate = detailsJson.expected_payoff_date as string;
    } else if (loanType === "credit" && interestRate !== null && minimumPaymentAmount !== null) {
      const projection = computeCreditPayoffProjection(balance, interestRate, minimumPaymentAmount);
      payoffDate = projection.payoffDate;
      payoffMonths = projection.monthsToPayoff;
      totalInterestRemaining = projection.totalInterest;
      neverPaysOffAtCurrentPayment = projection.monthsToPayoff === null;
    }

    return {
      id: account.id,
      name: account.official_name || account.name,
      mask: account.mask,
      institutionName: institutionNameById.get(account.institution_id) ?? "Account",
      balance,
      loanType,
      interestRate,
      nextPaymentDueDate: details?.next_payment_due_date ?? null,
      minimumPaymentAmount,
      isOverdue: details?.is_overdue ?? false,
      lastPaymentAmount: details?.last_payment_amount ?? null,
      lastPaymentDate: details?.last_payment_date ?? null,
      details: detailsJson,
      payoffDate,
      payoffYearsRemaining: yearsFromNow(payoffDate),
      payoffMonths,
      totalInterestRemaining,
      neverPaysOffAtCurrentPayment,
      balanceHistory: snapshotsByAccountId.get(account.id) ?? [],
    };
  });

  return <LoansClient loans={loans} />;
}
