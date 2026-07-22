"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
import { MoneyButton } from "@/components/ui/MoneyButton";
import { MoneyCard } from "@/components/ui/MoneyCard";
import { Chip } from "@/components/ui/Chip";
import { EASE, SHELL_WIDTH, FINANCIAL_CONFIDENCE } from "@/lib/constants";
import { enablePushNotifications } from "@/lib/push-client";

const FEELINGS = [
  { id: "heavy", label: "Heavy", detail: "It’s on my mind more than I’d like" },
  { id: "foggy", label: "Foggy", detail: "I mostly avoid looking" },
  { id: "fragile", label: "Fine, but fragile", detail: "Okay until something unexpected happens" },
  { id: "calm", label: "Mostly calm", detail: "I’d just like a clearer picture" },
];

const GOALS = [
  { id: "safe-to-spend", label: "Knowing what’s safe to spend" },
  { id: "no-surprise-bills", label: "No more surprise bills" },
  { id: "debt-shrinking", label: "Watching debt get smaller" },
  { id: "effortless-saving", label: "Saving without thinking about it" },
  { id: "open-app-calmly", label: "Opening my banking app calmly" },
  { id: "clear-monthly-picture", label: "A clear picture each month" },
];

const GOAL_PHRASES: Record<string, string> = {
  "safe-to-spend": "knowing what’s safe to spend",
  "no-surprise-bills": "no more surprise bills",
  "debt-shrinking": "watching your debt get smaller",
  "effortless-saving": "saving without thinking about it",
  "open-app-calmly": "opening your banking app calmly",
  "clear-monthly-picture": "a clear picture each month",
};

const PRICES = [8, 10, 12];
const TOTAL_STEPS = 7;

function persist(data: { moneyFeeling?: string; calmGoals?: string[]; completed?: boolean }) {
  return fetch("/api/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).catch((err) => {
    console.error("[onboarding] save failed:", err);
    return null;
  });
}

interface OnboardingClientProps {
  firstName: string | null;
  initialFeeling: string | null;
  initialGoals: string[];
  checkout: "success" | "cancelled" | null;
}

export function OnboardingClient({ firstName, initialFeeling, initialGoals, checkout }: OnboardingClientProps) {
  const router = useRouter();

  const [step, setStep] = useState(checkout === "success" ? 5 : checkout === "cancelled" ? 4 : 0);
  const [feeling, setFeeling] = useState<string | null>(initialFeeling);
  const [goals, setGoals] = useState<string[]>(initialGoals);
  const [price, setPrice] = useState(10);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [notifState, setNotifState] = useState<"idle" | "loading" | "blocked">("idle");
  const [notifMessage, setNotifMessage] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  const plusJoined = checkout === "success";
  const goalPhrase = goals.length > 0 ? GOAL_PHRASES[goals[0]] : null;

  function toggleGoal(id: string) {
    setGoals((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  }

  async function startCheckout() {
    setCheckoutLoading(true);
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: price, returnTo: "/onboarding" }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) {
        console.error("[onboarding] checkout session failed:", data.error);
        setCheckoutLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      console.error("[onboarding] checkout request failed:", err);
      setCheckoutLoading(false);
    }
  }

  async function enableReminders() {
    setNotifState("loading");
    setNotifMessage(null);
    const result = await enablePushNotifications();
    if (result.ok || result.reason === "dismissed") {
      setNotifState("idle");
      if (result.ok) setStep(6);
      return;
    }
    setNotifState("blocked");
    setNotifMessage(result.message);
  }

  async function finish() {
    setFinishing(true);
    await persist({ completed: true });
    router.push("/dashboard");
  }

  const showBack = step > 0 && step < 6;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className={`mx-auto flex w-full ${SHELL_WIDTH} flex-1 flex-col px-6`}>
        <div className="flex items-center gap-4 pt-[max(3.5rem,env(safe-area-inset-top))]">
          <button
            type="button"
            aria-label="Back"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className={`-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-opacity hover:text-foreground ${
              showBack ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-foreground"
              animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
              transition={{ duration: 0.4, ease: EASE }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="flex flex-1 flex-col"
          >
            {step === 0 && (
              <StepShell
                title={firstName ? `Welcome, ${firstName}.` : "Welcome."}
                subtitle="A few quiet questions, so MoneyOS can meet you where you are. There are no wrong answers, and nothing here is a test."
              >
                <MoneyButton onClick={() => setStep(1)}>Begin</MoneyButton>
              </StepShell>
            )}

            {step === 1 && (
              <StepShell
                title="How does money feel right now?"
                subtitle="However it feels is okay. This just helps MoneyOS speak your language."
              >
                <div className="mb-8 flex flex-col gap-3">
                  {FEELINGS.map((f) => {
                    const active = feeling === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFeeling(f.id)}
                        className={`w-full rounded-xl p-4 text-left transition-colors ${
                          active ? "bg-foreground" : "bg-muted hover:bg-secondary"
                        }`}
                      >
                        <span className={`block text-[15px] font-medium ${active ? "text-background" : "text-foreground"}`}>
                          {f.label}
                        </span>
                        <span className={`mt-0.5 block text-[13px] ${active ? "text-background/70" : "text-muted-foreground"}`}>
                          {f.detail}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <MoneyButton
                  disabled={!feeling}
                  onClick={() => {
                    if (feeling) persist({ moneyFeeling: feeling });
                    setStep(2);
                  }}
                >
                  Continue
                </MoneyButton>
              </StepShell>
            )}

            {step === 2 && (
              <StepShell
                title="What would calm look like?"
                subtitle="Pick anything that resonates. You can change these anytime."
              >
                <div className="mb-8 flex flex-wrap gap-2">
                  {GOALS.map((g) => (
                    <Chip
                      key={g.id}
                      label={g.label}
                      active={goals.includes(g.id)}
                      onClick={() => toggleGoal(g.id)}
                      layoutGroup={`goal-${g.id}`}
                    />
                  ))}
                </div>
                <MoneyButton
                  disabled={goals.length === 0}
                  onClick={() => {
                    persist({ calmGoals: goals });
                    setStep(3);
                  }}
                >
                  Continue
                </MoneyButton>
              </StepShell>
            )}

            {step === 3 && (
              <StepShell
                title="Your Financial Confidence"
                subtitle="One quiet number that reflects how steady things are — your cushion, your bills, your trend."
              >
                <MoneyCard glow className="mb-8 text-center">
                  <p className="font-heading text-[64px] font-bold leading-none text-foreground">{FINANCIAL_CONFIDENCE}</p>
                  <p className="mt-2 text-[13px] text-muted-foreground">An example score</p>
                </MoneyCard>
                <p className="mb-8 text-[14px] leading-relaxed text-muted-foreground">
                  Once you connect a bank, this becomes yours — real, private, and updated gently in the background.
                </p>
                <MoneyButton onClick={() => setStep(4)}>Continue</MoneyButton>
              </StepShell>
            )}

            {step === 4 && (
              <StepShell
                title="MoneyOS Plus"
                subtitle={
                  goalPhrase
                    ? `You said calm looks like ${goalPhrase}. Plus keeps that in view every day, with MO alongside you.`
                    : "Plus keeps your whole picture current every day, with MO alongside you."
                }
              >
                <ul className="mb-6 flex flex-col gap-2.5">
                  {[
                    "Free-form chat with MO, your money companion",
                    "Your Financial Confidence, refreshed daily",
                    "Weekly and monthly reviews, ready when you are",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-foreground">
                      <Check size={16} className="mt-0.5 shrink-0 text-success" />
                      {line}
                    </li>
                  ))}
                </ul>

                <p className="mb-3 text-[13px] font-medium text-muted-foreground">
                  Pay what feels fair. Same Plus, whichever you choose.
                </p>
                <div className="mb-8 grid grid-cols-3 gap-2">
                  {PRICES.map((p) => {
                    const active = price === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPrice(p)}
                        className={`flex h-16 flex-col items-center justify-center rounded-xl transition-colors ${
                          active ? "bg-foreground" : "bg-muted hover:bg-secondary"
                        }`}
                      >
                        <span className={`text-[17px] font-semibold ${active ? "text-background" : "text-foreground"}`}>
                          ${p}
                        </span>
                        <span className={`text-[11px] ${active ? "text-background/70" : "text-muted-foreground"}`}>
                          / month
                        </span>
                      </button>
                    );
                  })}
                </div>

                <MoneyButton onClick={startCheckout} disabled={checkoutLoading}>
                  {checkoutLoading ? "One moment…" : `Continue with Plus — $${price}/mo`}
                </MoneyButton>
                <MoneyButton variant="secondary" size="md" onClick={() => setStep(5)}>
                  Not now
                </MoneyButton>
              </StepShell>
            )}

            {step === 5 && (
              <StepShell
                title="Gentle reminders, only when they help"
                subtitle={
                  plusJoined
                    ? "Plus is active — welcome. One last thing: MoneyOS can nudge you softly, and never more than that."
                    : "MoneyOS can nudge you softly, and never more than that."
                }
              >
                <ul className="mb-8 flex flex-col gap-2.5">
                  {["A quiet heads-up before a bill is due", "Your weekly review, when it’s ready"].map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-foreground">
                      <Check size={16} className="mt-0.5 shrink-0 text-success" />
                      {line}
                    </li>
                  ))}
                </ul>
                {notifMessage && (
                  <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">{notifMessage}</p>
                )}
                <MoneyButton onClick={enableReminders} disabled={notifState === "loading"}>
                  {notifState === "loading" ? "One moment…" : "Turn on gentle reminders"}
                </MoneyButton>
                <MoneyButton variant="secondary" size="md" onClick={() => setStep(6)}>
                  {notifState === "blocked" ? "Continue without reminders" : "Maybe later"}
                </MoneyButton>
              </StepShell>
            )}

            {step === 6 && (
              <StepShell
                title={firstName ? `You’re set, ${firstName}.` : "You’re set."}
                subtitle="Your dashboard is ready whenever you are. Connect a bank there when it feels right — no rush."
              >
                <MoneyButton onClick={finish} disabled={finishing}>
                  {finishing ? "One moment…" : "Go to my dashboard"}
                </MoneyButton>
              </StepShell>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex flex-1 flex-col justify-center py-10">
        <h1 className="font-heading text-[32px] font-semibold leading-[1.2] tracking-[-0.01em] text-foreground">
          {title}
        </h1>
        <p className="mt-4 max-w-[92%] text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-3 pb-[max(2.5rem,env(safe-area-inset-bottom))]">{children}</div>
    </>
  );
}
