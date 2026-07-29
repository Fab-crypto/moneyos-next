import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getInstitutionInfo } from "@/lib/plaid";
import { moneyFromRow } from "@/lib/money/read";
import { Money } from "@/lib/money/money";
import { AccountsClient } from "./AccountsClient";

function formatDueLabel(nextDueDate: string | null): string {
  if (!nextDueDate) return "Due date not set";
  const due = new Date(nextDueDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  return `Due in ${diffDays} days`;
}

export default async function AccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/welcome");
  }

  const [institutionsResult, accountsResult, billsResult] = await Promise.all([
    supabase
      .from("institutions")
      .select("id, name, status, last_synced_at, logo_url, plaid_institution_id")
      .eq("user_id", user.id),
    supabase
      .from("accounts")
      .select("id, name, current_balance, current_balance_minor, currency_code, type, subtype,institution_id")
      .eq("user_id", user.id)
      .eq("is_active", true),
    supabase
      .from("recurring_transactions")
      .select("id, name, amount, next_due_date")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("next_due_date", { ascending: true })
      .limit(2),
  ]);

  const rawAccounts = accountsResult.data ?? [];
  let rawInstitutions = institutionsResult.data ?? [];

  const missingLogo = rawInstitutions.filter((inst) => !inst.logo_url && inst.plaid_institution_id);

  if (missingLogo.length > 0) {
    const admin = createAdminClient();

    const backfillResults = await Promise.all(
      missingLogo.map(async (inst) => {
        const info = await getInstitutionInfo(inst.plaid_institution_id as string);
        return { id: inst.id, logoUrl: info?.logoUrl ?? null };
      })
    );

    const found = backfillResults.filter((r) => r.logoUrl);

    if (found.length > 0) {
      await Promise.all(
        found.map((r) => admin.from("institutions").update({ logo_url: r.logoUrl }).eq("id", r.id))
      );

      const logoById = new Map(found.map((r) => [r.id, r.logoUrl]));
      rawInstitutions = rawInstitutions.map((inst) =>
        logoById.has(inst.id) ? { ...inst, logo_url: logoById.get(inst.id)! } : inst
      );
    }
  }

  const DEBT_TYPES = new Set(["credit", "loan"]);
  // Net-worth buckets accumulate in exact integer minor units. Debt-type
  // balances are signed negative. Each bucket and per-account balance is
  // converted to a dollar number once, at the client boundary.
  const balanceMoney = (a: Record<string, unknown>): Money =>
    moneyFromRow(a, "current_balance", { fallbackCurrency: "USD" }) ?? Money.zero("USD");
  const signedMoney = (type: string, money: Money): Money => (DEBT_TYPES.has(type) ? money.negate() : money);

  let cashM = Money.zero("USD");
  let savingsM = Money.zero("USD");
  let investmentsM = Money.zero("USD");
  let debtM = Money.zero("USD");

  for (const a of rawAccounts) {
    const money = balanceMoney(a);
    if (a.type === "depository" && a.subtype === "checking") cashM = cashM.add(money);
    else if (a.type === "depository") savingsM = savingsM.add(money);
    else if (a.type === "investment") investmentsM = investmentsM.add(money);
    else if (DEBT_TYPES.has(a.type)) debtM = debtM.add(money);
  }

  const cash = Number(cashM.toDecimalString());
  const savings = Number(savingsM.toDecimalString());
  const investments = Number(investmentsM.toDecimalString());
  const debt = Number(debtM.toDecimalString());

  let totalBalanceM = Money.zero("USD");
  for (const a of rawAccounts) totalBalanceM = totalBalanceM.add(signedMoney(a.type, balanceMoney(a)));
  const totalBalance = Number(totalBalanceM.toDecimalString());

  const institutions = rawInstitutions
    .map((inst) => {
      const accountsForInst = rawAccounts
        .filter((a) => a.institution_id === inst.id)
        .map((a) => ({
          id: a.id,
          name: a.name,
          balance: Number(signedMoney(a.type, balanceMoney(a)).toDecimalString()),
        }));
      return {
        id: inst.id,
        name: inst.name,
        status: inst.status,
        lastSyncedAt: inst.last_synced_at,
        logoUrl: inst.logo_url,
        accounts: accountsForInst,
      };
    })
    .filter((inst) => inst.accounts.length > 0);

  const mostRecentSync =
    rawInstitutions
      .map((i) => i.last_synced_at)
      .filter((d): d is string => !!d)
      .sort()
      .at(-1) ?? null;

  const upcomingBills = (billsResult.data ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    amount: b.amount,
    due: formatDueLabel(b.next_due_date),
  }));

  return (
    <AccountsClient
      institutions={institutions}
      totalBalance={totalBalance}
      mostRecentSync={mostRecentSync}
      upcomingBills={upcomingBills}
      cash={cash}
      savings={savings}
      investments={investments}
      debt={debt}
    />
  );
}
