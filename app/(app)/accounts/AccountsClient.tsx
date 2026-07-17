"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion, type Variants } from "framer-motion";
import { Loader2, Wallet, ChevronDown, Plus, Trash2, PiggyBank, TrendingUp, CreditCard, ArrowRight, Building2, Repeat } from "lucide-react";
import { MoneyCard } from "@/components/ui/MoneyCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MoodBadge } from "@/components/ui/MoodBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { BottomNav } from "@/components/layout/BottomNav";
import { ConnectBank } from "@/components/plaid/connect-bank";
import { EASE, SHELL_WIDTH } from "@/lib/constants";
import { formatMoney } from "@/lib/formatters";

interface AccountRow {
  id: string;
  name: string;
  balance: number;
}

interface Institution {
  id: string;
  name: string;
  status: string;
  lastSyncedAt: string | null;
  logoUrl: string | null;
  accounts: AccountRow[];
}

interface UpcomingBill {
  id: string;
  name: string;
  amount: number;
  due: string;
}

interface AccountsClientProps {
  institutions: Institution[];
  totalBalance: number;
  mostRecentSync: string | null;
  upcomingBills: UpcomingBill[];
  cash: number;
  savings: number;
  investments: number;
  debt: number;
}

const STATUS_LABEL: Record<string, string> = {
  connected: "Connected",
  reauth_required: "Needs attention",
  error: "Connection error",
  disconnected: "Disconnected",
};

function formatRelativeSync(iso: string | null): string {
  if (!iso) return "Not yet synced";
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return "Synced just now";
  if (diffMin < 60) return `Synced ${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `Synced ${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.round(diffHr / 24);
  return `Synced ${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

export function AccountsClient({
  institutions,
  totalBalance,
  mostRecentSync,
  upcomingBills,
  cash,
  savings,
  investments,
  debt,
}: AccountsClientProps) {
  const reduceMotion = useReducedMotion();
  const router = useRouter();

  function refresh() {
    router.refresh();
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
          className="px-6 pb-32 pt-[max(3.75rem,env(safe-area-inset-top))]"
        >
          <motion.div variants={item}>
            <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-foreground">
              Accounts
            </h1>
            <p className="mt-2 text-[14px] text-muted-foreground">Your money, organized clearly.</p>
            <p className="mt-1 text-[12px] text-muted-foreground/70">{formatRelativeSync(mostRecentSync)}</p>
          </motion.div>

          {institutions.length === 0 ? (
            <motion.div variants={item} className="mt-8">
              <EmptyState
                icon={Wallet}
                title="No accounts connected yet"
                description="Once you connect a bank, your accounts will show up here."
                action={<ConnectBank onConnected={refresh} />}
              />
            </motion.div>
          ) : (
            <>
              <motion.div variants={item}>
                <AccountSummaryCard
                  total={totalBalance}
                  accountCount={institutions.reduce((s, i) => s + i.accounts.length, 0)}
                  cash={cash}
                  savings={savings}
                  investments={investments}
                  debt={debt}
                />
              </motion.div>

              <motion.div variants={item}>
                <Link href="/loans" className="block">
                  <MoneyCard className="mt-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                        <CreditCard size={15} className="text-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-medium text-foreground">Loans</p>
                        <p className="mt-0.5 text-[13px] text-muted-foreground">
                          Credit cards, mortgages, and student loans
                        </p>
                      </div>
                      <ArrowRight size={16} className="shrink-0 text-muted-foreground" />
                    </div>
                  </MoneyCard>
                </Link>
              </motion.div>

              <motion.div variants={item}>
                <Link href="/subscriptions" className="block">
                  <MoneyCard className="mt-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Repeat size={15} className="text-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-medium text-foreground">Subscriptions</p>
                        <p className="mt-0.5 text-[13px] text-muted-foreground">
                          Everything that renews, in one place
                        </p>
                      </div>
                      <ArrowRight size={16} className="shrink-0 text-muted-foreground" />
                    </div>
                  </MoneyCard>
                </Link>
              </motion.div>

              <div className="mt-8 space-y-3">
                {institutions.map((institution) => (
                  <motion.div key={institution.id} variants={item}>
                    <InstitutionCard institution={institution} onDisconnected={refresh} />
                  </motion.div>
                ))}
              </div>

              {upcomingBills.length > 0 && (
                <motion.div variants={item} className="mt-8">
                  <SectionHeader className="mb-3">Coming Up</SectionHeader>
                  <MoneyCard padded={false} className="divide-y divide-border/50">
                    {upcomingBills.map((bill) => (
                      <UpcomingMoneyRow key={bill.id} {...bill} />
                    ))}
                  </MoneyCard>
                </motion.div>
              )}

              <motion.div variants={item} className="mt-5">
                <ConnectAnotherBankRow onConnected={refresh} />
              </motion.div>
            </>
          )}
        </motion.main>
      </div>

      <BottomNav />
    </div>
  );
}

function ConnectAnotherBankRow({ onConnected }: { onConnected: () => void }) {
  const [open, setOpen] = useState(false);

  function handleConnected() {
    setOpen(false);
    onConnected();
  }

  if (open) {
    return (
      <MoneyCard>
        <ConnectBank onConnected={handleConnected} />
      </MoneyCard>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 py-4 text-[14px] font-medium text-muted-foreground transition-colors [@media(hover:hover)]:hover:text-foreground"
    >
      <Plus size={15} />
      Connect another bank
    </button>
  );
}

function AccountSummaryCard({
  total,
  accountCount,
  cash,
  savings,
  investments,
  debt,
}: {
  total: number;
  accountCount: number;
  cash: number;
  savings: number;
  investments: number;
  debt: number;
}) {
  const isNegative = total < 0;
  return (
    <MoneyCard glow className="mt-8 p-7">
      <SectionHeader>Your Money</SectionHeader>
      <p
        className={`tabular relative z-10 mt-4 font-heading text-[52px] font-bold leading-none tracking-[-0.02em] ${
          isNegative ? "text-danger" : "text-foreground"
        }`}
      >
        {isNegative ? "-" : ""}${formatMoney(total, { absolute: true })}
      </p>
      <p className="mt-4 text-[14px] text-muted-foreground">
        Across {accountCount} connected account{accountCount === 1 ? "" : "s"}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-y-6 gap-x-4 border-t border-border/50 pt-6">
        <SummaryStat icon={Wallet} label="Available Cash" amount={cash} />
        <SummaryStat icon={PiggyBank} label="Savings" amount={savings} />
        <SummaryStat icon={TrendingUp} label="Investments" amount={investments} />
        <SummaryStat icon={CreditCard} label="Debt" amount={debt} isDebt />
      </div>
    </MoneyCard>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  amount,
  isDebt = false,
}: {
  icon: typeof Wallet;
  label: string;
  amount: number;
  isDebt?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon size={14} className="text-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-semibold ${isDebt && amount > 0 ? "text-danger" : "text-foreground"}`}>
          ${formatMoney(amount, { decimals: 0, absolute: true })}
        </p>
      </div>
    </div>
  );
}

function InstitutionCard({ institution, onDisconnected }: { institution: Institution; onDisconnected: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const total = institution.accounts.reduce((sum, a) => sum + a.balance, 0);
  const isNegative = total < 0;
  const isHealthySync = institution.status === "connected";
  const statusLabel = STATUS_LABEL[institution.status] ?? institution.status;

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const response = await fetch("/api/plaid/disconnect-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId: institution.id }),
      });
      if (response.ok) {
        onDisconnected();
      } else {
        setDisconnecting(false);
        setConfirmingDisconnect(false);
      }
    } catch {
      setDisconnecting(false);
      setConfirmingDisconnect(false);
    }
  }

  return (
    <MoneyCard padded={false}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 p-6 text-left"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
          {institution.logoUrl && !logoFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={institution.logoUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <Building2 size={18} className="text-foreground" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <SectionHeader>{institution.name}</SectionHeader>
          <p
            className={`tabular mt-2 font-heading text-2xl font-bold tracking-tight ${
              isNegative ? "text-danger" : "text-foreground"
            }`}
          >
            {isNegative ? "-" : ""}${formatMoney(total, { absolute: true })}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <MoodBadge label={statusLabel} tone={isHealthySync ? "success" : "neutral"} showDot={isHealthySync} />
            <span className="text-xs text-muted-foreground">
              {institution.accounts.length} account{institution.accounts.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-muted-foreground"
        >
          <ChevronDown size={18} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-border/50 px-6 pb-6 pt-5">
              {institution.accounts.map((account) => (
                <AccountRowView key={account.id} account={account} />
              ))}
            </div>

            <div className="border-t border-border/50 px-6 py-4">
              {!confirmingDisconnect ? (
                <button
                  type="button"
                  onClick={() => setConfirmingDisconnect(true)}
                  className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors [@media(hover:hover)]:hover:text-danger"
                >
                  <Trash2 size={14} />
                  Disconnect {institution.name}
                </button>
              ) : (
                <div>
                  <p className="text-[13px] font-medium text-foreground">Disconnect {institution.name}?</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    This removes all its accounts and transaction history from MoneyOS and revokes
                    access with Plaid. This can&apos;t be undone.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmingDisconnect(false)}
                      disabled={disconnecting}
                      className="h-9 flex-1 rounded-lg bg-muted text-xs font-medium text-foreground transition-colors [@media(hover:hover)]:hover:bg-muted/80 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-destructive text-xs font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {disconnecting && <Loader2 size={12} className="animate-spin" />}
                      {disconnecting ? "Disconnecting..." : "Disconnect"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </MoneyCard>
  );
}

function AccountRowView({ account }: { account: AccountRow }) {
  const isNegative = account.balance < 0;
  return (
    <div className="flex items-center justify-between">
      <span className="text-[15px] text-foreground">{account.name}</span>
      <span className={`tabular text-[15px] font-semibold ${isNegative ? "text-danger" : "text-foreground"}`}>
        {isNegative ? "-" : ""}${formatMoney(account.balance, { absolute: true })}
      </span>
    </div>
  );
}

function UpcomingMoneyRow({ name, amount, due }: { name: string; amount: number; due: string }) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div>
        <p className="text-[15px] font-medium text-foreground">{name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{due}</p>
      </div>
      <p className="tabular text-[15px] font-semibold text-danger">-${formatMoney(amount, { absolute: true })}</p>
    </div>
  );
}
