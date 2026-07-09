"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { LayoutGrid, Wallet, Target, Sparkles, User } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;
const SHELL_WIDTH = "max-w-[430px]";

const NAV_TABS = [
  { href: "/dashboard", icon: LayoutGrid, label: "Home" },
  { href: "/accounts", icon: Wallet, label: "Accounts" },
  { href: "/goals", icon: Target, label: "Goals" },
  { href: "/mo", icon: Sparkles, label: "MO" },
  { href: "/profile", icon: User, label: "Profile" },
];

interface Goal {
  name: string;
  current: number;
  target: number;
  status: string;
}

// The one goal given the hero treatment. In the real product this is
// whichever goal the person has marked as primary, or the one closest
// to completion — not necessarily the largest.
const FEATURED_GOAL: Goal = { name: "Emergency Fund", current: 8200, target: 10000, status: "On pace" };

const OTHER_GOALS: Goal[] = [
  { name: "Kenya Trip", current: 1420, target: 2500, status: "Ahead of schedule" },
  { name: "Car Payoff", current: 3100, target: 12000, status: "On pace" },
  { name: "Investment Starter", current: 950, target: 5000, status: "Getting started" },
];

// MO's one observation for this screen — later swapped for a real,
// data-derived line the same way Dashboard's is.
const MO_OBSERVATION = "You're closer than you were last week.";

function pct(current: number, target: number) {
  return target > 0 ? Math.min((current / target) * 100, 100) : 0;
}

function money(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function GoalsPage() {
  const reduceMotion = useReducedMotion();
  // NOTE: goals is built from the hardcoded constants above, so
  // `goals.length === 0` can never be true yet — the empty-state branch
  // below is unreachable until this comes from real data/state.
  const goals = [FEATURED_GOAL, ...OTHER_GOALS];

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
            <motion.div variants={item}>
              <EmptyGoalsState />
            </motion.div>
          ) : (
            <>
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

              <motion.div
                variants={item}
                className="card-premium mt-8 p-6"
              >
                <div className="mb-2 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-muted-foreground/70" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    MO noticed
                  </span>
                </div>
                <p className="text-[15px] leading-relaxed text-foreground/90">{MO_OBSERVATION}</p>
              </motion.div>
            </>
          )}
        </motion.main>
      </div>

      <BottomNav />
    </div>
  );
}

/** The featured goal — large number, minimal words, the screen's answer at a glance. */
function GoalHeroCard({ goal }: { goal: Goal }) {
  const percent = pct(goal.current, goal.target);

  return (
    <div className="card-premium hero-glow mt-8 p-7">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {goal.name}
      </span>

      <p className="tabular relative z-10 mt-4 font-heading text-[52px] font-bold leading-none tracking-[-0.02em] text-foreground">
        ${money(goal.current)}
      </p>
      <p className="mt-2 text-[14px] text-muted-foreground">of ${money(goal.target)}</p>

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
        <ProgressPill status={goal.status} />
      </div>
    </div>
  );
}

/** A single goal: name, current, target, percent, status — nothing else. */
function GoalCard({ goal }: { goal: Goal }) {
  const percent = pct(goal.current, goal.target);

  return (
    <div className="card-premium p-6">
      <p className="text-[15px] font-medium text-foreground">{goal.name}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        ${money(goal.current)} of ${money(goal.target)}
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
        <ProgressPill status={goal.status} />
      </div>
    </div>
  );
}

/** A short status word — the source of the screen's optimism, not a number. */
function ProgressPill({ status }: { status: string }) {
  const isPositive = status === "Ahead of schedule";
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
        isPositive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
      }`}
    >
      {status}
    </span>
  );
}

function EmptyGoalsState() {
  return (
    <div className="card-premium mt-8 p-10 text-center">
      <p className="text-[17px] font-medium text-foreground">Your future starts with one goal.</p>
      <p className="mx-auto mt-2 max-w-[240px] text-[14px] leading-relaxed text-muted-foreground">
        Create your first savings goal.
      </p>
      <button
        type="button"
        className="mx-auto mt-6 flex h-12 items-center justify-center rounded-xl bg-foreground px-6 text-[14px] font-medium text-background transition-opacity hover:opacity-90 active:opacity-80"
      >
        Create Goal
      </button>
    </div>
  );
}

function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        className={`glass flex w-full ${SHELL_WIDTH} items-center justify-around rounded-full border border-border/60 px-3 py-3 shadow-2xl`}
      >
        {NAV_TABS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className="relative flex flex-col items-center gap-1 px-2">
              <motion.div
                animate={{ scale: active ? 1.08 : 1 }}
                transition={{ duration: 0.2, ease: EASE }}
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  active ? "bg-foreground/10 text-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.3 : 1.7} />
              </motion.div>
              <span className={`text-[10px] ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}