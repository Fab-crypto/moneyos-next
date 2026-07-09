import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatDate } from "@/lib/utils";
import type { Transaction } from "@/types/finance";

const CATEGORY_LABEL: Record<Transaction["category"], string> = {
  income: "Income",
  housing: "Housing",
  food: "Food",
  transport: "Transport",
  subscriptions: "Subscriptions",
  shopping: "Shopping",
  health: "Health",
  other: "Other",
};

export function LedgerList({ transactions }: { transactions: Transaction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {transactions.map((t) => (
          <div key={t.id} className="ledger-row flex items-center justify-between px-6 py-3.5">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[14px] text-[var(--color-ink)]">{t.merchant}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge>{CATEGORY_LABEL[t.category]}</Badge>
                  <span className="text-[12px] text-[var(--color-faint)]">{formatDate(t.date)}</span>
                </div>
              </div>
            </div>
            <p
              className="font-[family-name:var(--font-mono)] text-[14px] tabular"
              style={{ color: t.amountCents < 0 ? "var(--color-negative)" : "var(--color-accent)" }}
            >
              {t.amountCents < 0 ? "" : "+"}
              {formatMoney(t.amountCents)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
