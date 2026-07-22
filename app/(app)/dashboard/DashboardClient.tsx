"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, animate, useReducedMotion, type Variants } from "framer-motion";
import { Calendar, BookOpen, Trophy, CheckCircle2, LineChart, ArrowRight, Bell, Sparkles } from "lucide-react";
import { MoneyCard } from "@/components/ui/MoneyCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MoodBadge } from "@/components/ui/MoodBadge";
import { BottomNav } from "@/components/layout/BottomNav";
import { WeeklyReviewModal } from "./WeeklyReviewModal";
import { ReviewStory } from "./ReviewStory";
import { buildMonthlyStorySlides } from "./MonthlyStorySlides";
import { DailyGreeting } from "./DailyGreeting";
import { EASE, SHELL_WIDTH } from "@/lib/constants";
import { formatMoney, getConfidenceLabel } from "@/lib/formatters";
import type { FinancialConfidenceResult } from "@/lib/financial-confidence";
import type { ReviewSnapshot, WeeklyReviewData, MonthlyStoryData } from "@/lib/reviews";

function formatReviewDateRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(s)} – ${fmt(e)}, ${e.getFullYear()}`;
}

interface UpcomingBill {
  id: string;
  name: string;
  due: string;
  amount: number;
}

interface DueSoonBill {
  name: string;
  amount: number;
  isToday: boolean;
  canCover: boolean;
}

interface GoalFocus {
  name: string;
  remaining: number;
}

interface PrimaryGoal {
  name: string;
  currentAmount: number;
  targetAmount: number;
  percent: number;
}

interface DashboardClientProps {
  firstName: string;
  today: string;
  safeToSpend: number;
  hasAccounts: boolean;
  upcomingBills: UpcomingBill[];
  dueSoonBill: DueSoonBill | null;
  monthlyStory: ReviewSnapshot<MonthlyStoryData> | null;
  weeklyReview: ReviewSnapshot<WeeklyReviewData> | null;
  confidence: FinancialConfidenceResult;
  showGreeting: boolean;
  goalFocus: GoalFocus | null;
  monthlySavings: number;
  weeklyHeadline: string;
  monthSoFarInsight: string;
  primaryGoal: PrimaryGoal | null;
}

export function DashboardClient({
  firstName,
  today,
  safeToSpend,
  hasAccounts,
  upcomingBills,
  dueSoonBill,
  monthlyStory,
  weeklyReview,
  confidence,
  showGreeting,
  goalFocus,
  monthlySavings,
  weeklyHeadline,
  monthSoFarInsight,
  primaryGoal,
}: DashboardClientProps) {
  const reduceMotion = useReducedMotion();
  const [greetingDismissed, setGreetingDismissed] = useState(false);
  const [reviewDismissed, setReviewDismissed] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [monthlyStoryOpen, setMonthlyStoryOpen] = useState(false);

  const pageContainer: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0 : 0.08 } },
  };
  const item: Variants = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0.2 : 0.5, ease: EASE } },
  };

  return (
    <div className="min-h-screen bg-background">
      <div className={`mx-auto ${SHELL_WIDTH} min-h-screen bg-background sm:border-x sm:border-border/40`}>
        <motion.main
          variants={pageContainer}
          initial="hidden"
          animate="show"
          className="px-6 pb-32 pt-[max(3.75rem,env(safe-area-inset-top))]"
        >
          <motion.section variants={item}>
            <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-foreground">
              {firstName}
            </h1>
            <p className="mt-2 text-[14px] text-muted-foreground">{today}</p>
            <p className="mt-5 text-[15px] font-medium leading-relaxed text-foreground">{weeklyHeadline}</p>
          </motion.section>

          {dueSoonBill && (
            <motion.div variants={item}>
              <MoneyCard className="mt-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Bell size={14} className="text-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium leading-relaxed text-foreground">
                      {dueSoonBill.name} is due {dueSoonBill.isToday ? "today" : "tomorrow"}
                      {dueSoonBill.canCover ? " — you're all set to cover it." : "."}
                    </p>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      ${formatMoney(dueSoonBill.amount)}
                    </p>
                  </div>
                </div>
              </MoneyCard>
            </motion.div>
          )}

          {!reviewDismissed && monthlyStory && (
            <motion.div variants={item}>
              <button type="button" onClick={() => setMonthlyStoryOpen(true)} className="block w-full text-left">
                <MoneyCard className="mt-5">
                  <div className="flex items-center gap-3">
                    <div className="gold-bg flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                      <BookOpen size={18} className="gold-text" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium text-foreground">
                        Your {monthlyStory.data.monthLabel} Story is ready
                      </p>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">Tap to relive the month</p>
                    </div>
                    <ArrowRight size={16} className="shrink-0 text-muted-foreground" />
                  </div>
                </MoneyCard>
              </button>
            </motion.div>
          )}

          {!reviewDismissed && !monthlyStory && weeklyReview && (
            <motion.div variants={item}>
              <button type="button" onClick={() => setReviewModalOpen(true)} className="block w-full text-left">
                <MoneyCard className="mt-5">
                  <div className="flex items-center gap-3">
                    <div className="gold-bg flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                      <Sparkles size={18} className="gold-text" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium text-foreground">Your Weekly Review is ready</p>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {formatReviewDateRange(weeklyReview.periodStart, weeklyReview.periodEnd)}
                      </p>
                    </div>
                    <ArrowRight size={16} className="shrink-0 text-muted-foreground" />
                  </div>
                </MoneyCard>
              </button>
            </motion.div>
          )}

          <motion.div variants={item} whileTap={reduceMotion ? {} : { scale: 0.985 }}>
            <MoneyCard glow className="mt-8 p-7">
              <div className="flex items-center justify-between">
                <SectionHeader>Financial Confidence</SectionHeader>
                <MoodBadge
                  label={`${confidence.score}% ${getConfidenceLabel(confidence.score)}`}
                  tone="success"
                  showDot
                />
              </div>

              <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Safe to Spend Today
              </p>

              <HeroAmount value={safeToSpend} reduceMotion={!!reduceMotion} />

              {hasAccounts ? (
                <>
                  <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <CheckCircle2 size={16} className="text-success" />
                    You&apos;re on track
                  </div>
                  <p className="mt-3 max-w-[85%] text-[15px] leading-relaxed text-muted-foreground/85">
                    Spend comfortably today without dipping into tomorrow&apos;s budget.
                  </p>
                </>
              ) : (
                <p className="mt-5 max-w-[85%] text-[15px] leading-relaxed text-muted-foreground/85">
                  Connect a bank account to see your real Safe to Spend number.
                </p>
              )}
            </MoneyCard>
          </motion.div>

          <motion.div variants={item} whileTap={{ scale: 0.985 }}>
            <MoneyCard className="mt-5">
              <SectionHeader icon={BookOpen} iconClassName="gold-text">
                Your Month So Far
              </SectionHeader>
              <p className="mt-4 text-[15px] font-medium leading-relaxed text-foreground">{monthSoFarInsight}</p>
            </MoneyCard>
          </motion.div>

          <motion.div variants={item} whileTap={{ scale: 0.985 }}>
            <Link href="/analytics" className="block">
              <MoneyCard className="mt-5">
                <SectionHeader icon={LineChart} iconClassName="gold-text">
                  Your Analytics
                </SectionHeader>
                <p className="mt-4 text-[15px] font-medium leading-relaxed text-foreground">
                  See your spending patterns and money insights.
                </p>
                <div className="mt-4 flex items-center gap-1 text-[14px] font-medium gold-text">
                  View Analytics
                  <ArrowRight size={14} />
                </div>
              </MoneyCard>
            </Link>
          </motion.div>

          <motion.div variants={item} whileTap={{ scale: 0.985 }}>
            <MoneyCard className="mt-5">
              <SectionHeader icon={Calendar} iconClassName="text-muted-foreground">
                Upcoming Bills
              </SectionHeader>

              {upcomingBills.length > 0 ? (
                <div className="mt-5 space-y-5">
                  {upcomingBills.map((bill) => (
                    <div key={bill.id} className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[16px] font-semibold text-foreground">{bill.name}</p>
                        <p className="mt-1 text-[13px] font-medium text-muted-foreground">{bill.due}</p>
                      </div>
                      <p className="tabular text-[16px] font-semibold text-foreground">
                        ${formatMoney(bill.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                  No upcoming bills right now.
                </p>
              )}
            </MoneyCard>
          </motion.div>

          <motion.div variants={item} whileTap={{ scale: 0.985 }}>
            {primaryGoal ? (
              <MoneyCard className="mt-5">
                <div className="mb-4 flex items-center justify-between">
                  <SectionHeader icon={Trophy} iconClassName="gold-text">
                    {primaryGoal.name}
                  </SectionHeader>
                  <span className="text-sm font-semibold text-foreground">{primaryGoal.percent}%</span>
                </div>

                <div className="mb-3 flex items-center justify-between text-sm font-semibold text-foreground">
                  <span>${formatMoney(primaryGoal.currentAmount)}</span>
                  <span>${formatMoney(primaryGoal.targetAmount)}</span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${primaryGoal.percent}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE }}
                    className="h-full rounded-full bg-foreground"
                  />
                </div>
              </MoneyCard>
            ) : (
              <Link href="/goals" className="block">
                <MoneyCard className="mt-5">
                  <SectionHeader icon={Trophy} iconClassName="text-muted-foreground">
                    Goals
                  </SectionHeader>
                  <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                    You haven&apos;t set up a savings goal yet — like an emergency fund. Create one to track
                    your progress here.
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-[14px] font-medium gold-text">
                    Create a Goal
                    <ArrowRight size={14} />
                  </div>
                </MoneyCard>
              </Link>
            )}
          </motion.div>
        </motion.main>
      </div>

      <BottomNav />

      {reviewModalOpen && weeklyReview && (
        <WeeklyReviewModal
          review={weeklyReview}
          onClose={() => {
            setReviewModalOpen(false);
            setReviewDismissed(true);
          }}
        />
      )}

      {monthlyStoryOpen && monthlyStory && (
        <ReviewStory
          snapshot={{ id: monthlyStory.id, type: "monthly" }}
          slides={buildMonthlyStorySlides(monthlyStory.data)}
          onDismissed={() => {
            setMonthlyStoryOpen(false);
            setReviewDismissed(true);
          }}
          onClose={() => setMonthlyStoryOpen(false)}
        />
      )}

      {showGreeting && !greetingDismissed && (
        <DailyGreeting
          firstName={firstName}
          confidenceScore={confidence.score}
          safeToSpend={safeToSpend}
          goalFocus={goalFocus}
          monthlySavings={monthlySavings}
          onDismiss={() => setGreetingDismissed(true)}
        />
      )}
    </div>
  );
}

function HeroAmount({ value, reduceMotion }: { value: number; reduceMotion: boolean }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    const controls = animate(0, value, { duration: 0.9, ease: EASE, onUpdate: setDisplay });
    return controls.stop;
  }, [value, reduceMotion]);

  const shown = reduceMotion ? value : display;

  return (
    <p className="tabular mt-4 font-heading text-[76px] font-bold leading-none tracking-[-0.03em] text-foreground">
      ${shown.toFixed(2)}
    </p>
  );
}
