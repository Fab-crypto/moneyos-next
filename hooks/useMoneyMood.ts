"use client";

import { useMemo } from "react";
import type { Mood } from "@/types/finance";

export function useMoneyMood(spendToday: number, safeToSpend: number): Mood {
  return useMemo(() => {
    const ratio = safeToSpend > 0 ? spendToday / safeToSpend : 0;

    if (ratio < 0.4) return { emoji: "🟢", label: "Calm", tone: "success" };
    if (ratio < 0.7) return { emoji: "🟡", label: "Balanced", tone: "warning" };
    if (ratio < 1.0) return { emoji: "🟠", label: "Cautious", tone: "warning" };

    return { emoji: "🔴", label: "Tight Today", tone: "danger" };
  }, [spendToday, safeToSpend]);
}
