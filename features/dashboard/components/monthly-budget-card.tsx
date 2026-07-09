"use client";

import { motion } from "framer-motion";
import { formatMoney } from "@/lib/utils";

export function MonthlyBudgetCard({ spent, budget }: { spent: number; budget: number }) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

  return (
    <motion.div className="card-premium p-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Monthly Budget
      </p>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="tabular font-heading text-2xl font-bold text-foreground">
          {formatMoney(spent)}
        </span>
        <span className="tabular text-sm text-muted-foreground/70">
          of {formatMoney(budget)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground/90">{Math.round(pct)}%</span> used this month
      </p>
    </motion.div>
  );
}
