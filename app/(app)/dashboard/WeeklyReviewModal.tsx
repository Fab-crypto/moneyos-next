"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, TrendingDown, Minus, Share2 } from "lucide-react";
import { MoneyCard } from "@/components/ui/MoneyCard";
import { formatMoney } from "@/lib/formatters";
import { EASE } from "@/lib/constants";
import type { ReviewSnapshot, WeeklyReviewData } from "@/lib/reviews";

interface WeeklyReviewModalProps {
  review: ReviewSnapshot<WeeklyReviewData>;
  onClose: () => void;
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(s)} – ${fmt(e)}, ${e.getFullYear()}`;
}

function TrendRow({ label, start, end, suffix = "" }: { label: string; start: number; end: number; suffix?: string }) {
  const Icon = end > start ? TrendingUp : end < start ? TrendingDown : Minus;
  const color = end > start ? "text-success" : end < start ? "text-muted-foreground" : "text-muted-foreground";
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[14px] text-muted-foreground">{label}</span>
      <div className={`flex items-center gap-1.5 text-[14px] font-medium ${color}`}>
        <Icon size={13} />
        <span className="tabular">
          {suffix === "%" ? `${start}%` : `$${formatMoney(start)}`} → {suffix === "%" ? `${end}%` : `$${formatMoney(end)}`}
        </span>
      </div>
    </div>
  );
}

export function WeeklyReviewModal({ review, onClose }: WeeklyReviewModalProps) {
  const { data } = review;
  const isNegative = data.moneySaved < 0;

  async function handleShare() {
    const text = `MoneyOS Weekly Review — ${formatDateRange(review.periodStart, review.periodEnd)}\nMoney saved: ${
      isNegative ? "-" : ""
    }$${formatMoney(Math.abs(data.moneySaved))}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        // user canceled — no action needed
      }
    } else {
      await navigator.clipboard.writeText(text);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 overflow-y-auto bg-background"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="mx-auto max-w-[430px] px-6 pb-16 pt-[max(2rem,env(safe-area-inset-top))]"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Weekly Review
              </p>
              <p className="mt-1 text-[15px] text-muted-foreground">
                {formatDateRange(review.periodStart, review.periodEnd)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-opacity hover:opacity-80"
            >
              <X size={16} />
            </button>
          </div>

          <MoneyCard className="mt-6">
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Money Saved
            </p>
            <p
              className={`font-heading mt-2 text-center text-[48px] font-bold leading-none tracking-[-0.02em] ${
                isNegative ? "text-danger" : "text-success"
              }`}
            >
              {isNegative ? "-" : ""}${formatMoney(Math.abs(data.moneySaved))}
            </p>
            <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-5">
              <div className="text-center flex-1">
                <p className="text-[12px] text-muted-foreground">Earned</p>
                <p className="tabular mt-1 text-[16px] font-semibold text-foreground">${formatMoney(data.earned)}</p>
              </div>
              <div className="text-center flex-1">
                <p className="text-[12px] text-muted-foreground">Spent</p>
                <p className="tabular mt-1 text-[16px] font-semibold text-foreground">${formatMoney(data.spent)}</p>
              </div>
            </div>
          </MoneyCard>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <MoneyCard>
              <p className="text-[12px] text-muted-foreground">Largest Expense</p>
              {data.largestExpense ? (
                <>
                  <p className="mt-1.5 truncate text-[15px] font-semibold text-foreground">
                    {data.largestExpense.merchant}
                  </p>
                  <p className="tabular mt-0.5 text-[13px] text-muted-foreground">
                    ${formatMoney(data.largestExpense.amount)}
                  </p>
                </>
              ) : (
                <p className="mt-1.5 text-[14px] text-muted-foreground">None</p>
              )}
            </MoneyCard>
            <MoneyCard>
              <p className="text-[12px] text-muted-foreground">Best Category</p>
              {data.bestCategory ? (
                <>
                  <p className="mt-1.5 truncate text-[15px] font-semibold text-foreground">{data.bestCategory.name}</p>
                  <p className="tabular mt-0.5 text-[13px] text-muted-foreground">
                    ${formatMoney(data.bestCategory.amount)}
                  </p>
                </>
              ) : (
                <p className="mt-1.5 text-[14px] text-muted-foreground">None</p>
              )}
            </MoneyCard>
          </div>

          <MoneyCard className="mt-4 divide-y divide-border/50 py-1">
            <TrendRow label="Safe to Spend Trend" start={data.safeToSpendTrend.start} end={data.safeToSpendTrend.end} />
            <TrendRow
              label="Financial Confidence Trend"
              start={data.confidenceTrend.start}
              end={data.confidenceTrend.end}
              suffix="%"
            />
          </MoneyCard>

          {data.goals.length > 0 && (
            <MoneyCard className="mt-4">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Goal Progress
              </p>
              <div className="mt-4 space-y-4">
                {data.goals.map((goal) => (
                  <div key={goal.name}>
                    <div className="mb-1.5 flex items-center justify-between text-[14px]">
                      <span className="text-foreground">{goal.name}</span>
                      <span className="tabular font-medium text-muted-foreground">{goal.progressPct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-foreground"
                        style={{ width: `${goal.progressPct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </MoneyCard>
          )}

          <MoneyCard className="mt-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              One Thing to Try
            </p>
            <p className="mt-2.5 text-[15px] leading-relaxed text-foreground/90">{data.oneThingToTry}</p>
          </MoneyCard>

          <button
            type="button"
            onClick={handleShare}
            className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-foreground text-[15px] font-medium text-background transition-opacity hover:opacity-90"
          >
            <Share2 size={16} />
            Share this week
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
