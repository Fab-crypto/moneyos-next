"use client";

import { motion } from "framer-motion";
import { formatMoney } from "@/lib/utils";

export function NetWorthCard({ netWorth, changePct }: { netWorth: number; changePct: number }) {
  const positive = changePct >= 0;

  return (
    <motion.div className="card-premium p-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Net Worth
      </p>
      <p className="tabular font-heading text-xl font-bold tracking-[-0.01em] text-foreground">
        {formatMoney(netWorth)}
      </p>
      <p className={`mt-2 text-xs font-medium ${positive ? "text-success" : "text-danger"}`}>
        {positive ? "↑" : "↓"} {Math.abs(changePct).toFixed(1)}% this month
      </p>
    </motion.div>
  );
}
