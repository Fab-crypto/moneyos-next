"use client";

import { formatMoney } from "@/lib/utils";

export function RecentTransactions({ transactions }: { transactions: any[] }) {
  return (
    <div className="card-premium overflow-hidden">
      <div className="px-6 pb-3 pt-5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Recent Activity
        </span>
      </div>

      <div className="divide-y divide-border/50">
        {transactions.slice(0, 5).map((t) => (
          <div key={t.id} className="flex items-center justify-between px-6 py-3.5">
            <div>
              <p className="text-[15px] font-medium text-foreground">
                {t.merchant || t.description || "Transaction"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t.category || "General"}
              </p>
            </div>
            <p className="tabular text-[15px] font-semibold text-foreground/90">
              {formatMoney(t.amountCents ?? t.amount ?? 0)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
