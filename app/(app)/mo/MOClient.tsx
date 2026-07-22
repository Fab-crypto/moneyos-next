"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { Sparkles, BookOpen, MessageCircle, Home, ShoppingCart, Target, Lock, Send, Loader2 } from "lucide-react";
import { MoneyCard } from "@/components/ui/MoneyCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MoodBadge } from "@/components/ui/MoodBadge";
import { BottomNav } from "@/components/layout/BottomNav";
import { EASE, SHELL_WIDTH } from "@/lib/constants";
import { formatMoney } from "@/lib/formatters";
import { useMoneyMood } from "@/hooks/useMoneyMood";

interface UpcomingBill {
  name: string;
  amount: number;
  dueDate: string | null;
}

interface MOClientProps {
  isSubscribed: boolean;
  safeToSpendToday: number;
  todaySpend: number;
  thisWeekFood: number;
  lastWeekFood: number;
  upcomingBills: UpcomingBill[];
  financialConfidence: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const due = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function MoBubble({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full gold-bg">
        <Sparkles size={13} className="gold-text" />
      </div>
      <p className="rounded-2xl rounded-tl-sm bg-muted/60 px-4 py-3 text-[14px] leading-relaxed text-foreground/90">
        {text}
      </p>
    </div>
  );
}

export function MOClient({
  isSubscribed,
  safeToSpendToday,
  todaySpend,
  thisWeekFood,
  lastWeekFood,
  upcomingBills,
  financialConfidence,
}: MOClientProps) {
  const reduceMotion = useReducedMotion();
  const mood = useMoneyMood(todaySpend, safeToSpendToday);

  const observations = useMemo(() => {
    const list: { text: string; icon: typeof Home }[] = [];

    const nextBill = upcomingBills[0];
    if (nextBill) {
      const days = daysUntil(nextBill.dueDate);
      list.push({
        text:
          days !== null && days >= 0
            ? `${nextBill.name} is due in ${days} day${days === 1 ? "" : "s"}.`
            : `${nextBill.name} is due soon.`,
        icon: Home,
      });
    }

    if (lastWeekFood > 0) {
      const change = thisWeekFood - lastWeekFood;
      const pct = Math.round((Math.abs(change) / lastWeekFood) * 100);
      list.push({
        text:
          change > 0
            ? `Groceries and food are ${pct}% higher than last week.`
            : `Groceries and food are ${pct}% lower than last week.`,
        icon: ShoppingCart,
      });
    }

    list.push({ text: `Financial Confidence is ${financialConfidence}%.`, icon: Target });

    return list;
  }, [upcomingBills, thisWeekFood, lastWeekFood, financialConfidence]);

  const weeklyStory = useMemo(() => {
    if (lastWeekFood === 0 && thisWeekFood === 0) {
      return "Not much spending recorded yet this week — nothing here needs your attention.";
    }
    if (lastWeekFood > 0 && thisWeekFood > lastWeekFood) {
      return "This week leaned a little heavier on food. Everything else looks steady — nothing here needs your attention.";
    }
    return "This week's spending has been steady and comfortable. Nothing here needs your attention.";
  }, [thisWeekFood, lastWeekFood]);

  const todaysFocus = useMemo(() => {
    const nextBill = upcomingBills[0];
    if (nextBill) {
      const days = daysUntil(nextBill.dueDate);
      if (days !== null && days <= 3) {
        return `${nextBill.name} is coming up soon — you're already set up to cover it.`;
      }
    }
    return "You're in a good place today. No action needed.";
  }, [upcomingBills]);

  const moGreeting = useMemo(() => {
    if (lastWeekFood > 0 && thisWeekFood > lastWeekFood) {
      return "You're doing okay. Food spending is a little higher this week, but your essentials are covered.";
    }
    return "You're doing okay. Everything looks steady this week.";
  }, [thisWeekFood, lastWeekFood]);

  const suggestedQuestions = ["Can I spend tonight?", "Why was food high this week?", "How am I doing?", "What should I focus on?"];

  const qaResponses: Record<string, string> = useMemo(() => {
    const nextBill = upcomingBills[0];
    return {
      "Can I spend tonight?": `You have $${formatMoney(safeToSpendToday)} safe to spend today. A modest choice tonight would keep you comfortably on track.`,
      "Why was food high this week?":
        lastWeekFood > 0 && thisWeekFood > lastWeekFood
          ? `Food made up a larger share of your spending than usual this week ($${formatMoney(thisWeekFood)} vs $${formatMoney(lastWeekFood)} last week). You may want to consider a lighter grocery trip to balance it out — no action needed right away.`
          : "Food spending has actually been steady or lower this week — nothing unusual to flag.",
      "How am I doing?": `You're doing okay overall. Your Financial Confidence is ${financialConfidence}%, and today's Safe to Spend is $${formatMoney(safeToSpendToday)}.`,
      "What should I focus on?": nextBill
        ? `Keep an eye on ${nextBill.name}, coming up soon. Otherwise, you're on a steady path — no rush.`
        : "Nothing urgent right now — you're on a steady path.",
    };
  }, [safeToSpendToday, thisWeekFood, lastWeekFood, financialConfidence, upcomingBills]);

  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setChatError(null);

    try {
      const response = await fetch("/api/mo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await response.json();

      if (!response.ok) {
        setChatError(data.error ?? "MO couldn't respond right now.");
        setSending(false);
        return;
      }

      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    } catch (err) {
      console.error("[mo] chat request failed:", err);
      setChatError("MO couldn't respond right now. Please try again.");
    }
    setSending(false);
  }

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

          <motion.div variants={item}>
            <MoneyCard glow className="mt-6 p-7">
              <div className="flex items-center justify-between">
                <SectionHeader>Daily Check-In</SectionHeader>
                <MoodBadge label={mood.label} tone={mood.tone} emoji={mood.emoji} />
              </div>

              <p className="relative z-10 mt-5 font-heading text-[26px] font-semibold leading-[1.3] tracking-[-0.01em] text-foreground">
                {mood.tone === "danger" ? "Today's been a fuller day." : "You're okay to spend today."}
              </p>

              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                You have <span className="tabular font-medium text-foreground/90">${formatMoney(safeToSpendToday)}</span>{" "}
                to spend today, and that&apos;s a comfortable place to be.
              </p>
            </MoneyCard>
          </motion.div>

          <motion.div variants={item}>
            <MoneyCard className="mt-5">
              <SectionHeader icon={BookOpen} iconClassName="gold-text" className="mb-2.5">
                Weekly Money Story
              </SectionHeader>
              <p className="text-[15px] leading-relaxed text-foreground">{weeklyStory}</p>
            </MoneyCard>
          </motion.div>

          {observations.length > 0 && (
            <motion.div variants={item} className="mt-8">
              <SectionHeader className="mb-3">Recent Observations</SectionHeader>
              <div className="space-y-3">
                {observations.map(({ text, icon: Icon }) => (
                  <MoneyCard key={text} className="flex items-center gap-3 p-5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Icon size={14} className="text-foreground" />
                    </div>
                    <p className="text-[15px] leading-relaxed text-foreground/90">{text}</p>
                  </MoneyCard>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div variants={item}>
            <MoneyCard className="mt-8">
              <SectionHeader icon={Sparkles} iconClassName="gold-text" className="mb-2.5">
                Today&apos;s Focus
              </SectionHeader>
              <p className="text-[15px] leading-relaxed text-foreground">{todaysFocus}</p>
            </MoneyCard>
          </motion.div>

          <motion.div variants={item} className="mt-8">
            <SectionHeader className="mb-3">Ask MO</SectionHeader>

            <MoneyCard>
              <MoBubble text={moGreeting} />
            </MoneyCard>

            <div className="mt-3 flex flex-wrap gap-2">
              {suggestedQuestions.map((question) => {
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
                >
                  <MoneyCard className="mt-3">
                    <MoBubble text={qaResponses[activeQuestion]} />
                  </MoneyCard>
                </motion.div>
              )}
            </AnimatePresence>

            {isSubscribed ? (
              <div className="mt-5">
                {messages.length > 0 && (
                  <div className="mb-3 space-y-3">
                    {messages.map((m, i) =>
                      m.role === "assistant" ? (
                        <MoneyCard key={i}>
                          <MoBubble text={m.content} />
                        </MoneyCard>
                      ) : (
                        <div key={i} className="flex justify-end">
                          <p className="max-w-[85%] rounded-2xl rounded-tr-sm bg-foreground px-4 py-3 text-[14px] leading-relaxed text-background">
                            {m.content}
                          </p>
                        </div>
                      )
                    )}
                    {sending && (
                      <MoneyCard>
                        <div className="flex items-center gap-2.5">
                          <Loader2 size={14} className="animate-spin text-muted-foreground" />
                          <span className="text-[14px] text-muted-foreground">MO is thinking...</span>
                        </div>
                      </MoneyCard>
                    )}
                  </div>
                )}

                {chatError && <p className="mb-2 text-[13px] text-danger">{chatError}</p>}

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSend();
                    }}
                    placeholder="Ask MO anything..."
                    disabled={sending}
                    className="flex-1 rounded-xl border-0 bg-muted px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || !input.trim()}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-background transition-opacity disabled:opacity-40"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <Link href="/profile" className="mt-4 block">
                <MoneyCard className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Lock size={14} className="text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-foreground">Ask MO anything</p>
                    <p className="text-[12px] text-muted-foreground">Unlock free-form chat with MoneyOS Plus</p>
                  </div>
                  <span className="text-[13px] font-medium gold-text">Upgrade</span>
                </MoneyCard>
              </Link>
            )}
          </motion.div>
        </motion.main>
      </div>

      <BottomNav />
    </div>
  );
}
