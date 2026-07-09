"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, animate, useReducedMotion, type Variants } from "framer-motion";
import { Calendar, BookOpen, Trophy, CheckCircle2, LineChart, ArrowRight } from "lucide-react";
import { MoneyCard } from "@/components/ui/MoneyCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MoodBadge } from "@/components/ui/MoodBadge";
import { BottomNav } from "@/components/layout/BottomNav";
import { EASE, SHELL_WIDTH, SAFE_TO_SPEND_TODAY } from "@/lib/constants";
import { formatWeekdayDate } from "@/lib/date";
import { useFinancialConfidence } from "@/hooks/useFinancialConfidence";

const UPCOMING_BILLS = [
  { name: "Rent", due: "Due in 2 days", amount: "$2,400.00" },
  { name: "Netflix", due: "Due in 4 days", amount: "$17.99" },
  { name: "Internet", due: "Due in 9 days", amount: "$79.00" },
];

const EMERGENCY_FUND_PCT = 71;

export default function DashboardPage() {
  const reduceMotion = useReducedMotion();
  const confidence = useFinancialConfidence();
  const today = formatWeekdayDate();

  const pageContainer: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0 : 0.08 } },
  };

  const item: Variants = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduceMotion ? 0.2 : 0.5, ease: EASE },
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <div
        className={`mx-auto ${SHELL_WIDTH} min-h-screen bg-background sm:border-x sm:border-border/40`}
      >
        <motion.main
          variants={pageContainer}
          initial="hidden"
          animate="show"
          className="px-6 pb-32 pt-[max(3.75rem,env(safe-area-inset-top))]"
        >
          <motion.section variants={item}>
            <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-foreground">
              Fabian
            </h1>
            <p className="mt-2 text-[14px] text-muted-foreground">{today}</p>
            <p className="mt-5 text-[15px] font-medium leading-relaxed text-foreground">
              You saved <span className="text-success">$42</span> more than expected this week.
            </p>
          </motion.section>

          <motion.div variants={item} whileTap={reduceMotion ? {} : { scale: 0.985 }}>
            <MoneyCard glow className="mt-8 p-7">
              <div className="flex items-center justify-between">
                <SectionHeader>Financial Confidence</SectionHeader>
                <MoodBadge label={`${confidence.score}% ${confidence.label}`} tone="success" showDot />
              </div>

              <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Safe to Spend Today
              </p>

              <HeroAmount value={SAFE_TO_SPEND_TODAY} reduceMotion={!!reduceMotion} />

              <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-foreground">
                <CheckCircle2 size={16} className="text-success" />
                You're on track
              </div>

              <p className="mt-3 max-w-[85%] text-[15px] leading-relaxed text-muted-foreground/85">
                Spend comfortably today without dipping into tomorrow's budget.
              </p>
            </MoneyCard>
          </motion.div>

          <motion.div variants={item} whileTap={{ scale: 0.985 }}>
            <MoneyCard className="mt-5">
              <SectionHeader icon={BookOpen} iconClassName="gold-text">
                Your Month So Far
              </SectionHeader>
              <p className="mt-4 text-[15px] font-medium leading-relaxed text-foreground">
                You're under budget in 3 of your top 4 categories. Groceries are slightly higher than
                usual.
              </p>
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

              <div className="mt-5 space-y-5">
                {UPCOMING_BILLS.map((bill) => (
                  <div key={bill.name} className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[16px] font-semibold text-foreground">{bill.name}</p>
                      <p className="mt-1 text-[13px] font-medium text-muted-foreground">{bill.due}</p>
                    </div>
                    <p className="tabular text-[16px] font-semibold text-foreground">{bill.amount}</p>
                  </div>
                ))}
              </div>
            </MoneyCard>
          </motion.div>

          <motion.div variants={item} whileTap={{ scale: 0.985 }}>
            <MoneyCard className="mt-5">
              <div className="mb-4 flex items-center justify-between">
                <SectionHeader icon={Trophy} iconClassName="gold-text">
                  Emergency Fund
                </SectionHeader>
                <span className="text-sm font-semibold text-foreground">{EMERGENCY_FUND_PCT}%</span>
              </div>

              <div className="mb-3 flex items-center justify-between text-sm font-semibold text-foreground">
                <span>$10,650</span>
                <span>$15,000</span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${EMERGENCY_FUND_PCT}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: reduceMotion ? 0 : 0.8, ease: EASE }}
                  className="h-full rounded-full bg-foreground"
                />
              </div>
            </MoneyCard>
          </motion.div>
        </motion.main>
      </div>

      <BottomNav />
    </div>
  );
}

function HeroAmount({ value, reduceMotion }: { value: number; reduceMotion: boolean }) {
  const [display, setDisplay] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) return;

    const controls = animate(0, value, {
      duration: 0.9,
      ease: EASE,
      onUpdate: setDisplay,
    });

    return controls.stop;
  }, [value, reduceMotion]);

  return (
    <p className="tabular mt-4 font-heading text-[76px] font-bold leading-none tracking-[-0.03em] text-foreground">
      ${display.toFixed(2)}
    </p>
  );
}