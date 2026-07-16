import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountsClient } from "./AccountsClient";
import { formatDueLabel } from "@/lib/date";

export default async function AccountsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/welcome");
  }

  const [institutionsResult, accountsResult, billsResult] = await Promise.all([
    supabase.from("institutions").select("id, name, status, last_synced_at, logo_url"),
    supabase
      .from("accounts")
      .select("id, name, current_balance, type, subtype,institution_id")
      .eq("is_active", true),
    supabase
      .from("recurring_transactions")
      .select("id, name, amount, next_due_date")
      .eq("is_active", true)
      .order("next_due_date", { ascending: true })
      .limit(2),
  ]);

  const rawAccounts = accountsResult.data ?? [];
  const rawInstitutions = institutionsResult.data ?? [];

  const DEBT_TYPES = new Set(["credit", "loan"]);
  const signedBalance = (type: string, balance: number) => (DEBT_TYPES.has(type) ? -balance : balance);

  let cash = 0;
  let savings = 0;
  let investments = 0;
  let debt = 0;

  for (const a of rawAccounts) {
    const balance = a.current_balance ?? 0;
    if (a.type === "depository" && a.subtype === "checking") {
      cash += balance;
    } else if (a.type === "depository") {
      savings += balance;
    } else if (a.type === "investment") {
      investments += balance;
    } else if (DEBT_TYPES.has(a.type)) {
      debt += balance;
    }
  }

  const institutions = rawInstitutions
    .map((inst) => {
      const accountsForInst = rawAccounts
        .filter((a) => a.institution_id === inst.id)
        .map((a) => ({
          id: a.id,
          name: a.name,
          balance: signedBalance(a.type, a.current_balance ?? 0),
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

  const totalBalance = institutions.reduce(
    (sum, inst) => sum + inst.accounts.reduce((s, a) => s + a.balance, 0),
    0
  );

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
