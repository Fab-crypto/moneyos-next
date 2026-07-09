import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import type { Account } from "@/types/finance";

const TYPE_LABEL: Record<Account["type"], string> = {
  checking: "Checking",
  savings: "Savings",
  credit: "Credit",
  investment: "Investment",
};

export function AccountsSummary({ accounts }: { accounts: Account[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Accounts</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {accounts.map((a) => (
          <div key={a.id} className="ledger-row flex items-center justify-between px-6 py-3.5">
            <div>
              <p className="text-[14px] text-[var(--color-ink)]">{a.name}</p>
              <p className="text-[12px] text-[var(--color-faint)]">
                {a.institution} · {TYPE_LABEL[a.type]} ···{a.last4}
              </p>
            </div>
            <p
              className="font-[family-name:var(--font-mono)] text-[14px] tabular"
              style={{ color: a.balanceCents < 0 ? "var(--color-negative)" : "var(--color-ink)" }}
            >
              {formatMoney(a.balanceCents)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
