"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { Sparkle } from "lucide-react";
import { MoneyCard } from "@/components/ui/MoneyCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MoodBadge } from "@/components/ui/MoodBadge";
import { Chip } from "@/components/ui/Chip";
import { SearchBar } from "@/components/ui/SearchBar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { BottomNav } from "@/components/layout/BottomNav";
import { EASE, SHELL_WIDTH } from "@/lib/constants";
import { formatMoney } from "@/lib/formatters";
import { daysAgo, formatFullDate, formatShortDate, groupTransactionsByDate } from "@/lib/date";
import { useMoneyMood } from "@/hooks/useMoneyMood";
import { useDailyInsight } from "@/hooks/useDailyInsight";
import type { FinancialConfidenceResult } from "@/lib/financial-confidence";
import type { Transaction, TransactionFilter } from "@/types/transaction";

const AVATAR_PALETTE = [
  { bg: "bg-[hsl(210,90%,62%,0.16)]", text: "text-[hsl(210,90%,74%)]" },
  { bg: "bg-[hsl(142,70%,49%,0.16)]", text: "text-[hsl(142,70%,62%)]" },
  { bg: "bg-[hsl(40,45%,58%,0.18)]", text: "text-[hsl(40,55%,70%)]" },
  { bg: "bg-[hsl(280,55%,65%,0.16)]", text: "text-[hsl(280,55%,76%)]" },
  { bg: "bg-[hsl(340,60%,60%,0.16)]", text: "text-[hsl(340,60%,74%)]" },
  { bg: "bg-[hsl(190,55%,55%,0.16)]", text: "text-[hsl(190,55%,70%)]" },
];

const MERCHANT_EMOJI: Record<string, string> = {
  Netflix: "🎬",
  Uber: "🚗",
  "Blue Bottle Coffee": "☕",
  "Whole Foods Market": "🥦",
  "Trader Joe's": "🛒",
  "AMC Theatres": "🎟️",
  Chipotle: "🌯",
  "PG&E": "⚡",
};

const FILTERS: { value: TransactionFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "income", label: "Income" },
  { value: "spending", label: "Spending" },
  { value: "bill", label: "Bills" },
  { value: "transfer", label: "Transfers" },
];

function getInitials(merchant: string): string {
  const words = merchant.split(" ").filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function getAvatarStyle(merchant: string) {
  const hash = merchant.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function getSafeToSpendStatus(ratio: number): string {
  if (ratio < 0.4) return "You're comfortably on track.";
  if (ratio < 0.7) return "You're keeping a good pace.";
  if (ratio < 1.0) return "A lighter choice tonight keeps you on track.";
  return "Today's been a fuller day — tomorrow's a fresh start.";
}

interface TransactionsClientProps {
  transactions: Transaction[];
  safeToSpendToday: number;
  confidence: FinancialConfidenceResult;
}

export function TransactionsClient({ transactions, safeToSpendToday, confidence }: TransactionsClientProps) {
  const reduceMotion = useReducedMotion();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<TransactionFilter>("all");
  const [selected, setSelected] = useState<Transaction | null>(null);

  const todaySpendTotal = useMemo(() => {
    const today = daysAgo(0);
    return transactions.filter((t) => t.type === "spending" && t.date === today).reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);
  const ratio = safeToSpendToday > 0 ? todaySpendTotal / safeToSpendToday : 0;

  const mood = useMoneyMood(todaySpendTotal, safeToSpendToday);
  const dailyInsight = useDailyInsight(transactions, safeToSpendToday);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions.filter((t) => {
      const matchesFilter = activeFilter === "all" || t.type === activeFilter;
      const matchesSearch =
        query.length === 0 ||
        t.merchant.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query) ||
        t.account.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [transactions, search, activeFilter]);

  const groups = useMemo(() => groupTransactionsByDate(filtered), [filtered]);

  const pageContainer: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduceMotion ? 0 : 0.07 } },
  };
  const item: Variants = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0.2 : 0.45, ease: EASE } },
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
            <h1 className="font-heading text-[36px] font-semibold leading-tight tracking-tight text-foreground">
              Transactions
            </h1>
          </motion.div>

          <motion.div variants={item}>
            <MoneyCard glow className="mt-6 p-7">
              <div className="flex items-center justify-between">
                <SectionHeader>Safe to Spend Today</SectionHeader>
                <MoodBadge label={mood.label} tone={mood.tone} emoji={mood.emoji} />
              </div>

              <p className="tabular relative z-10 mt-4 font-heading text-[44px] font-bold leading-none tracking-[-0.02em] text-foreground">
                ${formatMoney(safeToSpendToday)}
              </p>
              <p className="mt-2 text-[15px] font-medium text-foreground/90">{getSafeToSpendStatus(ratio)}</p>

              <div className="mt-5 border-l-2 border-gold/40 pl-3.5">
                <p className="text-[14px] leading-relaxed text-foreground/90">{dailyInsight}</p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-4">
                <span className="text-[13px] text-muted-foreground">Financial Confidence</span>
                <span className="text-[13px] font-medium text-success/90">
                  {confidence.score}%{" "}
                  {confidence.isFirstReading ? "· First reading" : confidence.isImproving ? "· Trending up" : "· Steady"}
                </span>
              </div>
            </MoneyCard>
          </motion.div>

          <motion.div variants={item} className="mt-5">
            <SearchBar value={search} onChange={setSearch} placeholder="Search transactions..." />
          </motion.div>

          <motion.div
            variants={item}
            className="-mx-6 mt-4 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {FILTERS.map((filter) => (
              <Chip
                key={filter.value}
                label={filter.label}
                active={activeFilter === filter.value}
                onClick={() => setActiveFilter(filter.value)}
                layoutGroup="transaction-filters"
              />
            ))}
          </motion.div>

          <div className="mt-7 space-y-7">
            {groups.length === 0 ? (
              <motion.div variants={item}>
                <EmptyState
                  icon={Sparkle}
                  title="No transactions yet"
                  description="Connect your first account and MoneyOS will organize your spending automatically."
                />
              </motion.div>
            ) : (
              groups.map(([label, txs]) => (
                <motion.div key={label} variants={item}>
                  <SectionHeader className="mb-2.5">{label}</SectionHeader>
                  <div className="space-y-2">
                    {txs.map((t) => (
                      <TransactionRow key={t.id} transaction={t} onSelect={() => setSelected(t)} />
                    ))}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.main>
      </div>

      <BottomNav />

      <AnimatePresence>
        {selected && (
          <BottomSheet open onClose={() => setSelected(null)}>
            <TransactionDetailContent transaction={selected} />
          </BottomSheet>
        )}
      </AnimatePresence>
    </div>
  );
}

function MerchantAvatar({ merchant }: { merchant: string }) {
  const style = getAvatarStyle(merchant);
  const emoji = MERCHANT_EMOJI[merchant];
  return (
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${style.bg}`}>
      {emoji ? (
        <span className="text-[18px]">{emoji}</span>
      ) : (
        <span className={`text-[13px] font-semibold ${style.text}`}>{getInitials(merchant)}</span>
      )}
    </div>
  );
}

function TransactionRow({ transaction, onSelect }: { transaction: Transaction; onSelect: () => void }) {
  const isIncome = transaction.type === "income";
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.98 }}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.18, ease: EASE }}
      className="flex w-full items-center gap-3 rounded-2xl bg-muted/40 p-4 text-left transition-colors [@media(hover:hover)]:hover:bg-muted/60"
    >
      <MerchantAvatar merchant={transaction.merchant} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium text-foreground">{transaction.merchant}</p>
        <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
          {transaction.account} · {formatShortDate(transaction.date)}
        </p>
      </div>
      <p className={`tabular shrink-0 text-[15px] font-semibold ${isIncome ? "text-success/90" : "text-foreground/90"}`}>
        {isIncome ? "+" : "-"}${formatMoney(transaction.amount)}
      </p>
    </motion.button>
  );
}

function TransactionDetailContent({ transaction }: { transaction: Transaction }) {
  const isIncome = transaction.type === "income";
  return (
    <>
      <div className="flex items-center gap-3">
        <MerchantAvatar merchant={transaction.merchant} />
        <div>
          <p className="text-[17px] font-medium text-foreground">{transaction.merchant}</p>
          <p className={`tabular text-[15px] font-semibold ${isIncome ? "text-success/90" : "text-foreground/90"}`}>
            {isIncome ? "+" : "-"}${formatMoney(transaction.amount)}
          </p>
        </div>
      </div>
      <div className="mt-6 space-y-4 border-t border-border/50 pt-5">
        <DetailRow label="Category" value={transaction.category} />
        <DetailRow label="Account" value={transaction.account} />
        <DetailRow label="Date" value={formatFullDate(transaction.date)} />
        <DetailRow label="Recurring" value={transaction.recurring ? "Yes" : "No"} />
        <DetailRow label="Notes" value={transaction.notes ?? "No notes added"} muted={!transaction.notes} />
      </div>
    </>
  );
}

function DetailRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className={`text-[14px] font-medium capitalize ${muted ? "text-muted-foreground" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
