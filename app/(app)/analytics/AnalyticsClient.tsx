"use client";

import { useMemo } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Utensils,
  Receipt,
  ShoppingBag,
  Car,
  Film,
  Sparkles,
  CreditCard,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { MoneyCard } from "@/components/ui/MoneyCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MoodBadge } from "@/components/ui/MoodBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { BottomNav } from "@/components/layout/BottomNav";
import { EASE, SHELL_WIDTH } from "@/lib/constants";
import { formatMoney } from "@/lib/formatters";
import { useFinancialConfidence } from "@/hooks/useFinancialConfidence";
import { useMoneyMood } from "@/hooks/useMoneyMood";

const CATEGORY_ICON: Record<string, LucideIcon> = {
  food: Utensils,
  groceries: Utensils,
  bills: Receipt,
  housing: Receipt,
  utilities: Receipt,
  streaming: Receipt,
  shopping: ShoppingBag,
  transport: Car,
  transportation: Car,
  entertainment: Film,
};

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function buildSparklinePath(values: number[], width: number, height: number, padY: number): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - padY - ((v - min) / range) * (height - padY * 2);
    return [x, y] as const;
  });
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
}

function getSparklinePoints(values: number[], width: number, height: number, padY: number) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - padY - ((v - min) / range) * (height - padY * 2);
    return { x, y };
  });
}

function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso + "T00:00:00"));
}

interface AnalyticsClientProps {
  spendThisMonth: number;
  spendLastMonth: number;
  monthlyBudget: number;
  topCategories: { name: string; amount: number }[];
  weeklyTrend: number[];
  biggestPurchase: { merchant: string; category: string; amount: number; date: string } | null;
  smartInsight: string;
  safeToSpendToday: number;
  safeToSpendHistory: number[];
}

export function AnalyticsClient({
  spendThisMonth,
  spendLastMonth,
  monthlyBudget,
  topCategories,
  weeklyTrend,
  biggestPurchase,
  smartInsight,
  safeToSpendToday,
  safeToSpendHistory,
}: AnalyticsClientProps) {
  const reduceMotion = useReducedMotion();
  const confidence = useFinancialConfidence();
  const monthMood = useMoneyMood(spendThisMonth, monthlyBudget);

  const monthChangePct = useMemo(() => {
    if (spendLastMonth === 0) return 0;
    return Math.round(((spendThisMonth - spendLastMonth) / spendLastMonth) * 100);
  }, [spendThisMonth, spendLastMonth]);

  const categoryTotal = useMemo(() => topCategories.reduce((sum, c) => sum + c.amount, 0), [topCategories]);
  const maxWeeklySpend = Math.max(...weeklyTrend, 1);

  const safeToSpendTrend = useMemo(() => [...safeToSpendHistory, safeToSpendToday], [safeToSpendHistory, safeToSpendToday]);

  const sparklineWidth = 300;
  const sparklineHeight = 90;
  const sparklinePad = 10;
  const sparklinePath = useMemo(
    () => buildSparklinePath(safeToSpendTrend, sparklineWidth, sparklineHeight, sparklinePad),
    [safeToSpendTrend]
  );
  const sparklinePoints = useMemo(
    () => getSparklinePoints(safeToSpendTrend, sparklineWidth, sparklineHeight, sparklinePad),
    [safeToSpendTrend]
  );

  const pageContainer: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0 : 0.07 } },
  };
  const item: Variants = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0.2 : 0.45, ease: EASE } },
  };

  const hasAnyData = spendThisMonth > 0 || spendLastMonth > 0 || topCategories.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className={`mx-auto ${SHELL_WIDTH} min-h-screen bg-background sm:border-x sm:border-border/40`}>
        <motion.main
          variants={pageContainer}
          initial="hidden"
          animate="show"
          className="px-6 pb-32 pt-[max(3.75rem,env(safe-area-inset-top))]"
        >
          <motion.div variants={item}>
            <h1 className="font-heading text-[36px] font-semibold leading-tight tracking-tight text-foreground">
              Analytics
            </h1>
            <p className="mt-2 text-[14px] text-muted-foreground">Patterns, not pressure.</p>
          </motion.div>

          {!hasAnyData ? (
            <motion.div variants={item} className="mt-8">
              <EmptyState
                icon={Sparkles}
                title="Nothing to show yet"
                description="Once you have some transaction history, your spending patterns will show up here."
              />
            </motion.div>
          ) : (
            <>
              <motion.div variants={item}>
                <MoneyCard glow className="mt-6 p-7">
                  <div className="flex items-center justify-between">
                    <SectionHeader>Spending This Month</SectionHeader>
                    <MoodBadge label={monthMood.label} tone={monthMood.tone} emoji={monthMood.emoji} />
                  </div>
                  <p className="tabular relative z-10 mt-4 font-heading text-[44px] font-bold leading-none tracking-[-0.02em] text-foreground">
                    ${formatMoney(spendThisMonth)}
                  </p>
                  {spendLastMonth > 0 && (
                    <div className="mt-2 flex items-center gap-1.5">
                      {monthChangePct >= 0 ? (
                        <TrendingUp size={13} className="text-muted-foreground" />
                      ) : (
                        <TrendingDown size={13} className="text-success" />
                      )}
                      <span className="text-[14px] text-muted-foreground">
                        {Math.abs(monthChangePct)}% {monthChangePct >= 0 ? "more" : "less"} than last month
                      </span>
                    </div>
                  )}
                </MoneyCard>
              </motion.div>

              {topCategories.length > 0 && (
                <motion.div variants={item} className="mt-5">
                  <MoneyCard>
                    <SectionHeader className="mb-4">Top Categories</SectionHeader>
                    <div className="space-y-5">
                      {topCategories.map((category) => {
                        const pct = categoryTotal > 0 ? (category.amount / categoryTotal) * 100 : 0;
                        const Icon = CATEGORY_ICON[category.name.toLowerCase()] ?? Receipt;
                        return (
                          <div key={category.name}>
                            <div className="mb-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Icon size={14} className="text-muted-foreground" />
                                <span className="text-[14px] font-medium text-foreground">{category.name}</span>
                              </div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="tabular text-[14px] font-semibold text-foreground/90">
                                  ${formatMoney(category.amount)}
                                </span>
                                <span className="tabular text-[12px] text-muted-foreground">{Math.round(pct)}%</span>
                              </div>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <motion.div
                                initial={{ width: 0 }}
                                whileInView={{ width: `${pct}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: reduceMotion ? 0 : 0.7, ease: EASE }}
                                className="h-full rounded-full bg-foreground"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </MoneyCard>
                </motion.div>
              )}

              <motion.div variants={item} className="mt-5">
                <MoneyCard>
                  <SectionHeader className="mb-5">Weekly Spending Trend</SectionHeader>
                  <div className="flex h-24 items-end justify-between gap-2.5">
                    {weeklyTrend.map((amount, i) => (
                      <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                        <motion.div
                          initial={{ height: 0 }}
                          whileInView={{ height: `${Math.max((amount / maxWeeklySpend) * 100, 6)}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: reduceMotion ? 0 : 0.5, delay: i * 0.05, ease: EASE }}
                          className={`w-full rounded-full ${i === weeklyTrend.length - 1 ? "bg-gold" : "bg-muted-foreground/20"}`}
                          style={{ minHeight: 6 }}
                        />
                        <span className="text-[10px] text-muted-foreground/70">{WEEKDAY_LABELS[i]}</span>
                      </div>
                    ))}
                  </div>
                </MoneyCard>
              </motion.div>

              <motion.div variants={item} className="mt-5">
                <MoneyCard>
                  <div className="flex items-center justify-between">
                    <SectionHeader>Financial Confidence</SectionHeader>
                    <MoodBadge label={`${confidence.score}% ${confidence.label}`} tone="success" showDot />
                  </div>
                  <p className="mt-3 text-[14px] text-muted-foreground">
                    {confidence.isImproving
                      ? `Up from ${confidence.previousScore}% last week.`
                      : `Steady compared to ${confidence.previousScore}% last week.`}
                  </p>
                </MoneyCard>
              </motion.div>

              {biggestPurchase && (
                <motion.div variants={item} className="mt-5">
                  <MoneyCard>
                    <SectionHeader icon={CreditCard} iconClassName="text-muted-foreground" className="mb-4">
                      Biggest Purchase
                    </SectionHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[15px] font-medium text-foreground">{biggestPurchase.merchant}</p>
                        <p className="mt-0.5 text-[13px] capitalize text-muted-foreground">
                          {biggestPurchase.category} · {formatShortDate(biggestPurchase.date)}
                        </p>
                      </div>
                      <p className="tabular text-[17px] font-semibold text-foreground">
                        ${formatMoney(biggestPurchase.amount)}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-1 border-t border-border/50 pt-4 text-[13px] font-medium text-muted-foreground">
                      View transaction
                      <ArrowRight size={12} />
                    </div>
                  </MoneyCard>
                </motion.div>
              )}

              <motion.div variants={item} className="mt-5">
                <MoneyCard>
                  <SectionHeader icon={Sparkles} iconClassName="gold-text" className="mb-2.5">
                    Smart Insight
                  </SectionHeader>
                  <p className="text-[15px] leading-relaxed text-foreground/90">{smartInsight}</p>
                </MoneyCard>
              </motion.div>

              <motion.div variants={item} className="mt-5">
                <MoneyCard>
                  <SectionHeader className="mb-5">Safe to Spend Trend</SectionHeader>
                  <svg viewBox={`0 0 ${sparklineWidth} ${sparklineHeight}`} className="w-full" style={{ height: sparklineHeight }}>
                    <defs>
                      <linearGradient id="sparklineFade" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--gold))" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <motion.path
                      d={`${sparklinePath} L ${sparklineWidth} ${sparklineHeight} L 0 ${sparklineHeight} Z`}
                      fill="url(#sparklineFade)"
                      stroke="none"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, ease: EASE, delay: 0.3 }}
                    />
                    <motion.path
                      d={sparklinePath}
                      fill="none"
                      stroke="hsl(var(--gold))"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: reduceMotion ? 0 : 0.9, ease: EASE }}
                    />
                    {sparklinePoints.map((p, i) => {
                      const isToday = i === sparklinePoints.length - 1;
                      return (
                        <motion.circle
                          key={i}
                          cx={p.x}
                          cy={p.y}
                          r={isToday ? 4.5 : 2.5}
                          fill={isToday ? "hsl(var(--gold))" : "hsl(var(--background))"}
                          stroke="hsl(var(--gold))"
                          strokeWidth={isToday ? 0 : 1.5}
                          initial={{ opacity: 0, scale: 0 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: 0.6 + i * 0.05, ease: EASE }}
                        />
                      );
                    })}
                  </svg>
                  <div className="mt-1 flex items-center justify-between">
                    {WEEKDAY_LABELS.map((label, i) => (
                      <span key={i} className="flex-1 text-center text-[10px] text-muted-foreground/70">
                        {label}
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 border-t border-border/50 pt-4 text-[13px] text-muted-foreground">
                    Today: <span className="tabular font-medium text-foreground/90">${formatMoney(safeToSpendToday)}</span>
                  </p>
                </MoneyCard>
              </motion.div>
            </>
          )}
        </motion.main>
      </div>

      <BottomNav />
    </div>
  );
}
