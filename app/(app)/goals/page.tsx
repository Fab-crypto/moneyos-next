"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Target, Sparkles } from "lucide-react";
import { MoneyCard } from "@/components/ui/MoneyCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MoodBadge } from "@/components/ui/MoodBadge";
import { MoneyButton } from "@/components/ui/MoneyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { BottomNav } from "@/components/layout/BottomNav";
import { EASE, SHELL_WIDTH } from "@/lib/constants";
import { formatMoney } from "@/lib/formatters";
import type { Goal } from "@/types/goal";

const FEATURED_GOAL: Goal = { name: "Emergency Fund", current: 8200, target: 10000, status: "On pace" };

const OTHER_GOALS: Goal[] = [
  { name: "Kenya Trip", current: 1420, target: 2500, status: "Ahead of schedule" },
  { name: "Car Payoff", current: 3100, target: 12000, status: "On pace" },
  { name: "Investment Starter", current: 950, target: 5000, status: "Getting started" },
];

const MO_OBSERVATION = "You're closer than you were last week.";

function pct(current: number, target: number) {
  return target > 0 ? Math.min((current / target) * 100, 100) : 0;
}

export default function GoalsPage() {
  const reduceMotion = useReducedMotion();
  const goals = [FEATURED_GOAL, ...OTHER_GOALS];
  const totalSaved = goals.reduce((sum, g) => sum + g.current, 0);

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
          <motion.div variants={item}>
            <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-foreground">
              Goals
            </h1>
            <p className="mt-2 text-[14px] text-muted-foreground">
              Your progress, without the pressure.
            </p>
          </motion.div>

          {goals.length === 0 ? (
            <motion.div variants={item} className="mt-8">
              <EmptyState
                icon={Target}
                title="Your future starts with one goal."
                description="Create your first savings goal."
                action={<MoneyButton size="md">Create Goal</MoneyButton>}
              />
            </motion.div>
          ) : (
            <>
              <motion.div variants={item}>
                <TotalSavedCard total={totalSaved} />
              </motion.div>

              <motion.div variants={item}>
                <GoalHeroCard goal={FEATURED_GOAL} />
              </motion.div>

              {OTHER_GOALS.length > 0 && (
                <div className="mt-5 space-y-3">
                  {OTHER_GOALS.map((goal) => (
                    <motion.div key={goal.name} variants={item}>
                      <GoalCard goal={goal} />
                    </motion.div>
                  ))}
                </div>
              )}

              <motion.div variants={item} className="mt-8">
                <MoneyCard>
                  <SectionHeader icon={Sparkles} iconClassName="text-muted-foreground/70" className="mb-2">
                    MO noticed
                  </SectionHeader>
                  <p className="text-[15px] leading-relaxed text-foreground/90">{MO_OBSERVATION}</p>
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

function TotalSavedCard({ total }: { total: number }) {
  return (
    <MoneyCard className="mt-8 gold-bg">
      <SectionHeader icon={Target} iconClassName="gold-text" className="mb-1">
        Total Saved
      </SectionHeader>
      <p className="tabular mt-3 font-heading text-[32px] font-bold tracking-tight text-foreground">
        ${formatMoney(total, { decimals: 0 })}
      </p>
    </MoneyCard>
  );
}

function GoalHeroCard({ goal }: { goal: Goal }) {
  const percent = pct(goal.current, goal.target);
  const isPositive = goal.status === "Ahead of schedule";

  return (
    <MoneyCard glow className="mt-8 p-7">
      <SectionHeader>{goal.name}</SectionHeader>

      <p className="tabular relative z-10 mt-4 font-heading text-[52px] font-bold leading-none tracking-[-0.02em] text-foreground">
        ${formatMoney(goal.current, { decimals: 0 })}
      </p>
      <p className="mt-2 text-[14px] text-muted-foreground">of ${formatMoney(goal.target, { decimals: 0 })}</p>

      <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${percent}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE }}
          className="h-full rounded-full bg-foreground"
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="tabular text-sm font-semibold text-foreground">{Math.round(percent)}%</span>
        <MoodBadge label={goal.status} tone={isPositive ? "success" : "neutral"} />
      </div>
    </MoneyCard>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const percent = pct(goal.current, goal.target);
  const isPositive = goal.status === "Ahead of schedule";

  return (
    <MoneyCard>
      <p className="text-[15px] font-medium text-foreground">{goal.name}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        ${formatMoney(goal.current, { decimals: 0 })} of ${formatMoney(goal.target, { decimals: 0 })}
      </p>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${percent}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE }}
          className="h-full rounded-full bg-foreground"
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="tabular text-xs font-semibold text-foreground">{Math.round(percent)}%</span>
        <MoodBadge label={goal.status} tone={isPositive ? "success" : "neutral"} />
      </div>
    </MoneyCard>
  );
}