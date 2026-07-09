"use client";

import { useMemo } from "react";
import { FINANCIAL_CONFIDENCE, FINANCIAL_CONFIDENCE_LAST_WEEK } from "@/lib/constants";
import type { FinancialConfidence } from "@/types/finance";

export function useFinancialConfidence(): FinancialConfidence {
  return useMemo(() => {
    const isImproving = FINANCIAL_CONFIDENCE > FINANCIAL_CONFIDENCE_LAST_WEEK;
    const label =
      FINANCIAL_CONFIDENCE >= 80
        ? "Excellent"
        : FINANCIAL_CONFIDENCE >= 60
        ? "Good"
        : "Needs Attention";

    return {
      score: FINANCIAL_CONFIDENCE,
      previousScore: FINANCIAL_CONFIDENCE_LAST_WEEK,
      label,
      isImproving,
    };
  }, []);
}
