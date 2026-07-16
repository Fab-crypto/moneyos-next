"use client";

import { useState } from "react";
import { formatMoney, getConfidenceLabel } from "@/lib/formatters";

interface DailyGreetingProps {
  firstName: string;
  confidenceScore: number;
  safeToSpend: number;
  goalFocus: { name: string; remaining: number } | null;
  monthlySavings: number;
  onDismiss: () => void;
}

function getGreetingWord(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export function DailyGreeting({
  firstName,
  confidenceScore,
  safeToSpend,
  goalFocus,
  monthlySavings,
  onDismiss,
}: DailyGreetingProps) {
  const [dismissing, setDismissing] = useState(false);

  async function handleDismiss() {
    if (dismissing) return;
    setDismissing(true);
    onDismiss();
    try {
      await fetch("/api/profile/dismiss-greeting", { method: "POST" });
    } catch (err) {
      console.error("[daily-greeting] dismiss failed:", err);
    }
  }

  const isPositiveSavings = monthlySavings >= 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Daily greeting"
      onClick={handleDismiss}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black px-8 text-center text-white"
    >
      <p className="font-heading text-[32px] font-semibold">
        {getGreetingWord()} {firstName} 👋
      </p>

      <div className="mt-4 flex items-center gap-2 text-[14px] text-white/70">
        <span className="h-2 w-2 rounded-full bg-success" />
        Today&apos;s Financial Status · {getConfidenceLabel(confidenceScore)}
      </div>

      <p className="mt-12 text-[13px] font-semibold uppercase tracking-[0.14em] text-white/50">
        Safe to Spend
      </p>
      <p className="font-heading mt-3 text-[64px] font-bold leading-none">${formatMoney(safeToSpend)}</p>

      {goalFocus && (
        <div className="mt-12">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-white/50">Today&apos;s Focus</p>
          <p className="mt-3 max-w-[300px] text-[16px] leading-relaxed text-white/90">
            You&apos;re only ${formatMoney(goalFocus.remaining, { decimals: 0 })} away from your{" "}
            {goalFocus.name} goal. Keep going!
          </p>
        </div>
      )}

      <div className="mt-10 rounded-2xl border border-white/15 bg-white/5 px-6 py-4">
        <p className="text-[12px] text-white/50">Estimated Savings This Month</p>
        <p className={`font-heading mt-1 text-[24px] font-bold ${isPositiveSavings ? "gold-text" : "text-danger"}`}>
          {isPositiveSavings ? "+" : "-"}${formatMoney(Math.abs(monthlySavings), { decimals: 0 })}
        </p>
      </div>

      <p className="mt-16 text-[13px] text-white/40">Tap anywhere to continue</p>
    </div>
  );
}
