import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatMoney } from "@/lib/utils";
import type { Budget } from "@/types/finance";

export function BudgetSummary({ budgets }: { budgets: Budget[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Budgets this month</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {budgets.map((b) => (
          <div key={b.id}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[14px] text-[var(--color-ink)]">{b.label}</span>
              <span className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-muted)] tabular">
                {formatMoney(b.spentCents)} / {formatMoney(b.limitCents)}
              </span>
            </div>
            <ProgressBar value={b.spentCents} max={b.limitCents} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
