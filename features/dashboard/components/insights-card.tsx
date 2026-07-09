"use client";

import { motion } from "framer-motion";

export function InsightsCard({ insights }: { insights: any[] }) {
  if (!insights?.length) return null;
  const [primary] = insights;

  return (
    <motion.div className="card-premium p-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Today's Insight
      </p>
      <div className="border-l-2 border-gold/40 pl-3.5">
        <p className="text-[15px] font-medium leading-relaxed text-foreground">
          {primary.text}
        </p>
      </div>
    </motion.div>
  );
}
