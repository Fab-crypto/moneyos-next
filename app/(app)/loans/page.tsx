import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoansClient } from "./LoansClient";

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

  const { data: loanDetailsRows } =
    accountIds.length > 0
      ? await supabase.from("loan_details").select("*").in("account_id", accountIds)
      : { data: [] };

  const institutionNameById = new Map((institutionsResult.data ?? []).map((i) => [i.id, i.name]));
  const detailsByAccountId = new Map((loanDetailsRows ?? []).map((d) => [d.account_id, d]));

  const loans = accounts.map((account) => {
    const details = detailsByAccountId.get(account.id) ?? null;
    return {
      id: account.id,
      name: account.official_name || account.name,
      mask: account.mask,
      institutionName: institutionNameById.get(account.institution_id) ?? "Account",
      balance: account.current_balance ?? 0,
      loanType: (details?.loan_type as "credit" | "mortgage" | "student" | undefined) ?? (account.subtype === "credit card" ? "credit" : null),
      interestRate: details?.interest_rate_percentage ?? null,
      nextPaymentDueDate: details?.next_payment_due_date ?? null,
      minimumPaymentAmount: details?.minimum_payment_amount ?? null,
      isOverdue: details?.is_overdue ?? false,
      lastPaymentAmount: details?.last_payment_amount ?? null,
      lastPaymentDate: details?.last_payment_date ?? null,
      details: (details?.details as Record<string, unknown>) ?? null,
    };
  });

  return <LoansClient loans={loans} />;
}
