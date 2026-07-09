"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import {
  LayoutGrid,
  Wallet,
  Target,
  Sparkles,
  User,
  Search,
  X,
  Sparkle,
} from "lucide-react";

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

type TxType = "income" | "spending" | "bill" | "transfer";
type FilterOption = "all" | TxType;

interface MockTransaction {
  id: string;
  merchant: string;
  category: string;
  account: string;
  type: TxType;
  date: string;
  amount: number;
  notes?: string;
  recurring?: boolean;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const MOCK_TRANSACTIONS: MockTransaction[] = [
  { id: "t1", merchant: "Acme Corp Payroll", category: "income", account: "Chase Checking", type: "income", date: daysAgo(0), amount: 2600 },
  { id: "t2", merchant: "Blue Bottle Coffee", category: "food", account: "Chase Checking", type: "spending", date: daysAgo(0), amount: 6.8 },
  { id: "t3", merchant: "Whole Foods Market", category: "groceries", account: "Amex Gold Card", type: "spending", date: daysAgo(0), amount: 74.2 },
  { id: "t4", merchant: "Uber", category: "transport", account: "Amex Gold Card", type: "spending", date: daysAgo(1), amount: 18.4 },
  { id: "t5", merchant: "Westview Apartments", category: "rent", account: "Chase Checking", type: "bill", date: daysAgo(2), amount: 2400, recurring: true, notes: "Monthly rent" },
  { id: "t6", merchant: "Trader Joe's", category: "groceries", account: "Amex Gold Card", type: "spending", date: daysAgo(3), amount: 52.1 },
  { id: "t7", merchant: "AMC Theatres", category: "entertainment", account: "Amex Gold Card", type: "spending", date: daysAgo(4), amount: 32 },
  { id: "t8", merchant: "Transfer to Savings", category: "transfer", account: "SoFi Savings", type: "transfer", date: daysAgo(5), amount: 250 },
  { id: "t9", merchant: "Netflix", category: "streaming", account: "Chase Checking", type: "bill", date: daysAgo(8), amount: 17.99, recurring: true, notes: "Streaming subscription" },
  { id: "t10", merchant: "PG&E", category: "utilities", account: "Chase Checking", type: "bill", date: daysAgo(9), amount: 96.4, recurring: true },
  { id: "t11", merchant: "Chipotle", category: "food", account: "Amex Gold Card", type: "spending", date: daysAgo(10), amount: 14.75 },
  { id: "t12", merchant: "Acme Corp Payroll", category: "income", account: "Chase Checking", type: "income", date: daysAgo(14), amount: 2600 },
];

const FILTERS: { value: FilterOption; label: string }[] = [
  { value: "all", label: "All" },
  { value: "income", label: "Income" },
  { value: "spending", label: "Spending" },
  { value: "bill", label: "Bills" },
  { value: "transfer", label: "Transfers" },
];

const AVATAR_PALETTE = [
  { bg: "bg-[hsl(210,90%,62%,0.16)]", text: "text-[hsl(210,90%,74%)]" },
  { bg: "bg-[hsl(142,70%,49%,0.16)]", text: "text-[hsl(142,70%,62%)]" },
  { bg: "bg-[hsl(40,45%,58%,0.18)]", text: "text-[hsl(40,55%,70%)]" },
  { bg: "bg-[hsl(280,55%,65%,0.16)]", text: "text-[hsl(280,55%,76%)]" },
  { bg: "bg-[hsl(340,60%,60%,0.16)]", text: "text-[hsl(340,60%,74%)]" },
  { bg: "bg-[hsl(190,55%,55%,0.16)]", text: "text-[hsl(190,55%,70%)]" },
];

const MERCHANT_EMOJI: Record<string, string> = {
  "Netflix": "🎬",
  "Uber": "🚗",
  "Blue Bottle Coffee": "☕",
  "Whole Foods Market": "🥦",
  "Trader Joe's": "🛒",
  "AMC Theatres": "🎟️",
  "Chipotle": "🌯",
  "PG&E": "⚡",
  "Westview Apartments": "🏠",
  "Transfer to Savings": "💰",
  "Acme Corp Payroll": "💼",
};

function getInitials(merchant: string): string {
  const words = merchant.split(" ").filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function getAvatarStyle(merchant: string) {
  const hash = merchant.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function money(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(
    new Date(iso + "T00:00:00")
  );
}

function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(iso + "T00:00:00")
  );
}

function groupByDate(transactions: MockTransaction[]) {
  const buckets: Record<string, MockTransaction[]> = {
    Today: [],
    Yesterday: [],
    "Earlier This Week": [],
    "Last Week": [],
    Earlier: [],
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const t of transactions) {
    const txDate = new Date(t.date + "T00:00:00");
    const diffDays = Math.round((today.getTime() - txDate.getTime()) / 86_400_000);

    if (diffDays <= 0) buckets.Today.push(t);
    else if (diffDays === 1) buckets.Yesterday.push(t);
    else if (diffDays <= 6) buckets["Earlier This Week"].push(t);
    else if (diffDays <= 13) buckets["Last Week"].push(t);
    else buckets.Earlier.push(t);
  }

  return Object.entries(buckets).filter(([, txs]) => txs.length > 0);
}

const FINANCIAL_CONFIDENCE = 82;
const FINANCIAL_CONFIDENCE_LAST_WEEK = 78;

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

function getDailyInsight(transactions: MockTransaction[], safeToSpend: number): string {
  const today = daysAgo(0);
  const todaySpending = transactions.filter((t) => t.type === "spending" && t.date === today);
  const todayBills = transactions.filter((t) => t.type === "bill" && t.date === today);
  const totalToday = todaySpending.reduce((sum, t) => sum + t.amount, 0);

  if (totalToday === 0) {
    return "You haven't spent much today — there's room in your plan.";
  }

  const byCategory = new Map<string, number>();
  for (const t of todaySpending) {
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
  }
  const [topCategory, topAmount] = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];

  if ((topCategory === "food" || topCategory === "groceries") && topAmount > safeToSpend * 0.4) {
    return "Food spending is a little high today. Cooking tonight keeps you on pace.";
  }

  if (todayBills.length > 0) {
    return "Your recurring bills are covered. Nice work.";
  }

  if (totalToday < safeToSpend * 0.3) {
    return "You're spending less than usual today — a good sign.";
  }

  return "You're keeping a steady, comfortable pace today.";
}

function getSafeToSpendStatus(ratio: number): string {
  if (ratio < 0.4) return "You're comfortably on track.";
  if (ratio < 0.7) return "You're keeping a good pace.";
  if (ratio < 1.0) return "A lighter choice tonight keeps you on track.";
  return "Today's been a fuller day — tomorrow's a fresh start.";
}

export default function TransactionsPage() {
  const reduceMotion = useReducedMotion();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");
  const [selected, setSelected] = useState<MockTransaction | null>(null);

  const { dailyInsight, mood, ratio } = useMemo(() => {
    const today = daysAgo(0);
    const totalToday = MOCK_TRANSACTIONS.filter((t) => t.type === "spending" && t.date === today).reduce(
      (sum, t) => sum + t.amount,
      0
    );
    const r = totalToday / SAFE_TO_SPEND_TODAY;

    return {
      dailyInsight: getDailyInsight(MOCK_TRANSACTIONS, SAFE_TO_SPEND_TODAY),
      mood: getMoneyMood(r),
      ratio: r,
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return MOCK_TRANSACTIONS.filter((t) => {
      const matchesFilter = activeFilter === "all" || t.type === activeFilter;
      const matchesSearch =
        query.length === 0 ||
        t.merchant.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query) ||
        t.account.toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [search, activeFilter]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

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

          <motion.div variants={item} className="card-premium hero-glow mt-6 p-7">
            <div className="flex items-center justify-between">
              <SectionLabel>Safe to Spend Today</SectionLabel>
              <div className="flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1">
                <span>{mood.emoji}</span>
                <span className={`text-xs font-medium ${mood.colorClass}`}>{mood.label}</span>
              </div>
            </div>

            <p className="tabular relative z-10 mt-4 font-heading text-[44px] font-bold leading-none tracking-[-0.02em] text-foreground">
              ${money(SAFE_TO_SPEND_TODAY)}
            </p>
            <p className="mt-2 text-[15px] font-medium text-foreground/90">{getSafeToSpendStatus(ratio)}</p>

            <div className="mt-5 border-l-2 border-gold/40 pl-3.5">
              <p className="text-[14px] leading-relaxed text-foreground/90">{dailyInsight}</p>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-4">
              <span className="text-[13px] text-muted-foreground">Financial Confidence</span>
              <span className="text-[13px] font-medium text-success/90">
                {FINANCIAL_CONFIDENCE}%{" "}
                {FINANCIAL_CONFIDENCE > FINANCIAL_CONFIDENCE_LAST_WEEK ? "· Higher than last week" : ""}
              </span>
            </div>
          </motion.div>

          <motion.div variants={item} className="relative mt-5">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transactions..."
              className="w-full rounded-xl border-0 bg-muted py-3 pl-9 pr-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </motion.div>

          <motion.div
            variants={item}
            className="-mx-6 mt-4 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {FILTERS.map((filter) => (
              <FilterChip
                key={filter.value}
                label={filter.label}
                active={activeFilter === filter.value}
                onClick={() => setActiveFilter(filter.value)}
              />
            ))}
          </motion.div>

          <div className="mt-7 space-y-7">
            {groups.length === 0 ? (
              <motion.div variants={item}>
                <EmptyState />
              </motion.div>
            ) : (
              groups.map(([label, txs]) => (
                <motion.div key={label} variants={item}>
                  <SectionLabel className="mb-2.5">{label}</SectionLabel>
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
        {selected && <TransactionDetailSheet transaction={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}

function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground ${className}`}>
      {children}
    </span>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.15 }}
      className="relative shrink-0 rounded-full px-4 py-2 text-[13px] font-medium"
    >
      {active && (
        <motion.span
          layoutId="transactionFilterActive"
          className="absolute inset-0 rounded-full bg-foreground"
          transition={{ duration: 0.25, ease: EASE }}
        />
      )}
      <span className={`relative z-10 ${active ? "text-background" : "text-muted-foreground"}`}>{label}</span>
      {!active && <span className="absolute inset-0 rounded-full bg-muted" />}
    </motion.button>
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

function TransactionRow({ transaction, onSelect }: { transaction: MockTransaction; onSelect: () => void }) {
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
      <p
        className={`tabular shrink-0 text-[15px] font-semibold ${
          isIncome ? "text-success/90" : "text-foreground/90"
        }`}
      >
        {isIncome ? "+" : "-"}${money(transaction.amount)}
      </p>
    </motion.button>
  );
}

function TransactionDetailSheet({
  transaction,
  onClose,
}: {
  transaction: MockTransaction;
  onClose: () => void;
}) {
  const isIncome = transaction.type === "income";

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-black/60"
      />
      <div className="pointer-events-none fixed inset-0 z-[70] flex items-end justify-center">
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 340, damping: 32 }}
          className={`pointer-events-auto w-full ${SHELL_WIDTH} rounded-t-[28px] bg-card p-6 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-2xl`}
        >
          <div className="mb-5 flex items-center justify-between">
            <div className="h-1 w-9 rounded-full bg-border" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <MerchantAvatar merchant={transaction.merchant} />
            <div>
              <p className="text-[17px] font-medium text-foreground">{transaction.merchant}</p>
              <p className={`tabular text-[15px] font-semibold ${isIncome ? "text-success/90" : "text-foreground/90"}`}>
                {isIncome ? "+" : "-"}${money(transaction.amount)}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4 border-t border-border/50 pt-5">
            <DetailRow label="Category" value={transaction.category} />
            <DetailRow label="Account" value={transaction.account} />
            <DetailRow label="Date" value={formatDate(transaction.date)} />
            <DetailRow label="Recurring" value={transaction.recurring ? "Yes" : "No"} />
            <DetailRow label="Notes" value={transaction.notes ?? "No notes added"} muted={!transaction.notes} />
          </div>
        </motion.div>
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

function EmptyState() {
  return (
    <div className="card-premium p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full gold-bg">
        <Sparkle size={22} className="gold-text" />
      </div>
      <p className="mt-4 text-[17px] font-medium text-foreground">No transactions yet</p>
      <p className="mx-auto mt-2 max-w-[260px] text-[14px] leading-relaxed text-muted-foreground">
        Connect your first account and MoneyOS will organize your spending automatically.
      </p>
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