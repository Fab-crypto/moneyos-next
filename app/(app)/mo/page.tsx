"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { LayoutGrid, Wallet, Target, Sparkles, User, BookOpen, MessageCircle, Home, ShoppingCart } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;
const SHELL_WIDTH = "max-w-[430px]";

const NAV_TABS = [
  { href: "/dashboard", icon: LayoutGrid, label: "Home" },
  { href: "/accounts", icon: Wallet, label: "Accounts" },
  { href: "/goals", icon: Target, label: "Goals" },
  { href: "/mo", icon: Sparkles, label: "MO" },
  { href: "/profile", icon: User, label: "Profile" },
];

const SAFE_TO_SPEND_TODAY = 99.74;

const TODAY_SPEND = 81.0;
const EMERGENCY_FUND_PCT = 82;

const TODAYS_INSIGHT = "You're okay to spend today.";
const TODAYS_FOCUS = "You're in a good place today. No action needed.";

const OBSERVATIONS = [
  { text: "Rent is due Friday.", icon: Home },
  { text: "Groceries are lower than last week.", icon: ShoppingCart },
  { text: "Emergency Fund is 82% complete.", icon: Target },
];

const WEEKLY_STORY =
  "This week leaned a little heavier on food, but you stayed ahead on your Emergency Fund. Overall, a steady week — nothing here needs your attention.";

const MO_GREETING =
  "You're doing okay. Food spending is a little higher this week, but your essentials are covered.";

const SUGGESTED_QUESTIONS = [
  "Can I spend tonight?",
  "Why was food high this week?",
  "How am I doing?",
  "What should I focus on?",
];

const QA_RESPONSES: Record<string, string> = {
  "Can I spend tonight?": `You have $${SAFE_TO_SPEND_TODAY.toFixed(
    2
  )} safe to spend today. A modest dinner would keep you comfortably on track.`,
  "Why was food high this week?":
    "Food made up a larger share of your spending than usual this week. You may want to consider a lighter grocery trip to balance it out — no action needed right away.",
  "How am I doing?": `You're doing okay overall. Your essentials are covered, and your Emergency Fund is ${EMERGENCY_FUND_PCT}% of the way there.`,
  "What should I focus on?":
    "Consider reviewing your subscriptions when you have a moment. Otherwise, you're on a steady path — no rush.",
};

interface MoneyMood {
  emoji: string;
  label: string;
  colorClass: string;
}

function getMoneyMood(ratio: number): MoneyMood {
  if (ratio < 0.4) return { emoji: "🟢", label: "Calm", colorClass: "text-success" };
  if (ratio < 0.7) return { emoji: "🟡", label: "Balanced", colorClass: "text-warning" };
  if (ratio < 1.0) return { emoji: "🟠", label: "Cautious", colorClass: "text-warning" };
  return { emoji: "🔴", label: "Tight Today", colorClass: "text-danger" };
}

export default function MoPage() {
  const reduceMotion = useReducedMotion();
  const hasObservations = OBSERVATIONS.length > 0;
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);

  const mood = useMemo(() => getMoneyMood(TODAY_SPEND / SAFE_TO_SPEND_TODAY), []);

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
          className="px-6 pb-40 pt-[max(3.75rem,env(safe-area-inset-top))]"
        >
          <motion.div variants={item}>
            <h1 className="font-heading text-[36px] font-semibold leading-tight tracking-tight text-foreground">
              MO
            </h1>
            <p className="mt-2 text-[15px] text-muted-foreground">Your calm money coach.</p>
          </motion.div>

          <motion.div variants={item} className="card-premium hero-glow mt-6 p-7">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Daily Check-In
              </span>
              <div className="flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1">
                <span>{mood.emoji}</span>
                <span className={`text-xs font-medium ${mood.colorClass}`}>{mood.label}</span>
              </div>
            </div>

            <p className="relative z-10 mt-5 font-heading text-[26px] font-semibold leading-[1.3] tracking-[-0.01em] text-foreground">
              {TODAYS_INSIGHT}
            </p>

            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              You have <span className="tabular font-medium text-foreground/90">${SAFE_TO_SPEND_TODAY.toFixed(2)}</span>{" "}
              to spend today, and that's a comfortable place to be.
            </p>
          </motion.div>

          <motion.div variants={item} className="card-premium mt-5 p-6">
            <div className="mb-2.5 flex items-center gap-2">
              <BookOpen size={14} className="gold-text" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Weekly Money Story
              </span>
            </div>
            <p className="text-[15px] leading-relaxed text-foreground">{WEEKLY_STORY}</p>
          </motion.div>

          {hasObservations && (
            <motion.div variants={item} className="mt-8">
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Recent Observations
              </h2>
              <div className="space-y-3">
                {OBSERVATIONS.map(({ text, icon: Icon }) => (
                  <div key={text} className="card-premium flex items-center gap-3 p-5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Icon size={14} className="text-foreground" />
                    </div>
                    <p className="text-[15px] leading-relaxed text-foreground/90">{text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div variants={item} className="card-premium mt-8 p-6">
            <div className="mb-2.5 flex items-center gap-1.5">
              <Sparkles size={13} className="gold-text" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Today's Focus
              </span>
            </div>
            <p className="text-[15px] leading-relaxed text-foreground">{TODAYS_FOCUS}</p>
          </motion.div>

          <motion.div variants={item} className="mt-8">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Ask MO
            </h2>

            <div className="card-premium p-5">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full gold-bg">
                  <Sparkles size={13} className="gold-text" />
                </div>
                <p className="rounded-2xl rounded-tl-sm bg-muted/60 px-4 py-3 text-[14px] leading-relaxed text-foreground/90">
                  {MO_GREETING}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((question) => {
                const active = activeQuestion === question;
                return (
                  <button
                    key={question}
                    type="button"
                    onClick={() => setActiveQuestion(active ? null : question)}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors ${
                      active ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <MessageCircle size={12} />
                    {question}
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              {activeQuestion && (
                <motion.div
                  key={activeQuestion}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="card-premium mt-3 p-5"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full gold-bg">
                      <Sparkles size={13} className="gold-text" />
                    </div>
                    <p className="rounded-2xl rounded-tl-sm bg-muted/60 px-4 py-3 text-[14px] leading-relaxed text-foreground/90">
                      {QA_RESPONSES[activeQuestion]}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.main>
      </div>

      <BottomNav />
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