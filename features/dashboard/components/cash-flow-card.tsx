"use client";

import { formatMoney } from "@/lib/utils";

export function CashFlowCard({ flow }: { flow: any }) {
  return (
    <div className="card-premium p-6">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Cash Flow
      </p>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">In</span>
          <span className="font-semibold">{formatMoney(flow.income ?? 0)}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Out</span>
          <span className="font-semibold">{formatMoney(flow.expenses ?? 0)}</span>
        </div>
      </div>

      <p className="mt-3 text-xs text-success">
        +{formatMoney(flow.net ?? 0)} net this month
      </p>
    </div>
  );
}
