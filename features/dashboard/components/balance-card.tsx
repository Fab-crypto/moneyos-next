import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import type { BalancePoint } from "@/types/finance";
import { BalanceSparkline } from "./balance-sparkline";

export function BalanceCard({
  totalCents,
  history,
}: {
  totalCents: number;
  history: BalancePoint[];
}) {
  const first = history[0].balanceCents;
  const changeCents = totalCents - first;
  const changePct = (changeCents / Math.abs(first)) * 100;
  const positive = changeCents >= 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-6">
        <p className="text-[13px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
          Net worth
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-[42px] leading-none text-[var(--color-ink)] tabular">
          {formatMoney(totalCents)}
        </p>
        <p
          className="mt-2 font-[family-name:var(--font-mono)] text-[13px] tabular"
          style={{ color: positive ? "var(--color-accent)" : "var(--color-negative)" }}
        >
          {positive ? "+" : ""}
          {formatMoney(changeCents)} ({changePct.toFixed(1)}%) past 6 months
        </p>

        <div className="mt-5">
          <BalanceSparkline data={history} />
        </div>
      </CardContent>
    </Card>
  );
}
