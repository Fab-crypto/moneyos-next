"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { CalendarDays, Sparkle, Loader2, TrendingUp, ChevronRight } from "lucide-react";
import { MoneyCard } from "@/components/ui/MoneyCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MoodBadge } from "@/components/ui/MoodBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { BottomNav } from "@/components/layout/BottomNav";
import { EASE, SHELL_WIDTH } from "@/lib/constants";
import { formatMoney } from "@/lib/formatters";
import { supabase } from "@/lib/supabase";

interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: "weekly" | "biweekly" | "monthly";
  nextDueDate: string;
  category: string | null;
  reviewStatus: "pending" | "confirmed" | "ignored";
  source: "detected" | "manual";
  priceHistory: { amount: number; date: string }[];
}

interface SubscriptionsClientProps {
  subscriptions: Subscription[];
  monthlyTotal: number;
  annualTotal: number;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso + "T00:00:00"));
}

export function SubscriptionsClient({ subscriptions, monthlyTotal, annualTotal }: SubscriptionsClientProps) {
  const reduceMotion = useReducedMotion();
  const [selected, setSelected] = useState<Subscription | null>(null);

  const pending = subscriptions.filter((s) => s.reviewStatus === "pending");
  const confirmed = subscriptions.filter((s) => s.reviewStatus === "confirmed").sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));

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
              Subscriptions
            </h1>
            <p className="mt-2 text-[14px] text-muted-foreground">Everything that renews, in one place.</p>
          </motion.div>

          {subscriptions.length === 0 ? (
            <motion.div variants={item} className="mt-8">
              <EmptyState
                icon={Sparkle}
                title="No subscriptions detected yet"
                description="Once we spot a recurring charge in your real transactions, it'll show up here."
              />
            </motion.div>
          ) : (
            <>
              <motion.div variants={item}>
                <MoneyCard glow className="mt-6 p-7">
                  <SectionHeader icon={TrendingUp} iconClassName="gold-text">
                    Monthly Total
                  </SectionHeader>
                  <p className="tabular relative z-10 mt-4 font-heading text-[44px] font-bold leading-none tracking-[-0.02em] text-foreground">
                    ${formatMoney(monthlyTotal)}
                  </p>
                  <p className="mt-3 text-[14px] text-muted-foreground">
                    ${formatMoney(annualTotal, { decimals: 0 })} a year across {confirmed.length + pending.length}{" "}
                    subscriptions
                  </p>
                </MoneyCard>
              </motion.div>

              {pending.length > 0 && (
                <motion.div variants={item} className="mt-6">
                  <SectionHeader className="mb-3">Needs Your Review</SectionHeader>
                  <div className="space-y-3">
                    {pending.map((sub) => (
                      <PendingReviewCard key={sub.id} subscription={sub} />
                    ))}
                  </div>
                </motion.div>
              )}

              {confirmed.length > 0 && (
                <motion.div variants={item} className="mt-6">
                  <SectionHeader icon={CalendarDays} iconClassName="text-muted-foreground" className="mb-3">
                    Renewal Calendar
                  </SectionHeader>
                  <MoneyCard padded={false} className="divide-y divide-border/50">
                    {confirmed.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setSelected(sub)}
                        className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors [@media(hover:hover)]:hover:bg-muted/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-medium text-foreground">{sub.name}</p>
                          <p className="mt-0.5 text-[13px] text-muted-foreground">
                            Renews {formatDate(sub.nextDueDate)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="tabular text-[15px] font-semibold text-foreground">
                            ${formatMoney(sub.amount)}
                          </p>
                          <ChevronRight size={16} className="text-muted-foreground" />
                        </div>
                      </button>
                    ))}
                  </MoneyCard>
                </motion.div>
              )}
            </>
          )}
        </motion.main>
      </div>

      <BottomNav />

      {selected && (
        <BottomSheet open onClose={() => setSelected(null)}>
          <SubscriptionDetail
            subscription={selected}
            others={subscriptions.filter((s) => s.id !== selected.id)}
            onClose={() => setSelected(null)}
          />
        </BottomSheet>
      )}
    </div>
  );
}

function PendingReviewCard({ subscription }: { subscription: Subscription }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    const { error } = await supabase
      .from("recurring_transactions")
      .update({ review_status: "confirmed" })
      .eq("id", subscription.id);
    setSaving(false);
    if (error) {
      console.error("[subscriptions] confirm failed:", error);
      return;
    }
    router.refresh();
  }

  async function handleIgnore() {
    setSaving(true);
    const { error } = await supabase
      .from("recurring_transactions")
      .update({ review_status: "ignored", is_active: false })
      .eq("id", subscription.id);
    setSaving(false);
    if (error) {
      console.error("[subscriptions] ignore failed:", error);
      return;
    }
    router.refresh();
  }

  return (
    <MoneyCard>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-foreground">{subscription.name}</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            ${formatMoney(subscription.amount)} · {subscription.frequency}
          </p>
        </div>
        <MoodBadge label="New" tone="neutral" />
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleIgnore}
          disabled={saving}
          className="h-10 flex-1 rounded-xl bg-muted text-[13px] font-medium text-foreground transition-colors disabled:opacity-50 [@media(hover:hover)]:hover:bg-muted/80"
        >
          Not a subscription
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-foreground text-[13px] font-medium text-background transition-opacity disabled:opacity-50 [@media(hover:hover)]:hover:opacity-90"
        >
          {saving && <Loader2 size={12} className="animate-spin" />}
          Confirm
        </button>
      </div>
    </MoneyCard>
  );
}

function SubscriptionDetail({
  subscription,
  others,
  onClose,
}: {
  subscription: Subscription;
  others: Subscription[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(subscription.name);
  const [amount, setAmount] = useState(String(subscription.amount));
  const [saving, setSaving] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [confirmingIgnore, setConfirmingIgnore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveEdit() {
    setError(null);
    const parsed = Number(amount);
    if (!name.trim() || !Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a valid name and amount.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase
      .from("recurring_transactions")
      .update({ name: name.trim(), amount: parsed, source: "manual" })
      .eq("id", subscription.id);
    setSaving(false);

    if (updateError) {
      console.error("[subscriptions] edit failed:", updateError);
      setError("Failed to save. Please try again.");
      return;
    }
    onClose();
    router.refresh();
  }

  async function handleIgnore() {
    setSaving(true);
    const { error: ignoreError } = await supabase
      .from("recurring_transactions")
      .update({ review_status: "ignored", is_active: false })
      .eq("id", subscription.id);
    setSaving(false);
    if (ignoreError) {
      console.error("[subscriptions] ignore failed:", ignoreError);
      return;
    }
    onClose();
    router.refresh();
  }

  async function handleMerge() {
    if (!mergeTargetId) return;
    setSaving(true);
    const { error: mergeError } = await supabase
      .from("recurring_transactions")
      .update({ merged_into_id: mergeTargetId, is_active: false })
      .eq("id", subscription.id);
    setSaving(false);
    if (mergeError) {
      console.error("[subscriptions] merge failed:", mergeError);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div>
      <p className="text-[17px] font-medium text-foreground">{subscription.name}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        ${formatMoney(subscription.amount)} · {subscription.frequency} · renews {formatDate(subscription.nextDueDate)}
      </p>

      {subscription.priceHistory.length >= 2 && (
        <div className="mt-4 border-t border-border/50 pt-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Price History
          </p>
          <div className="mt-2 space-y-1.5">
            {subscription.priceHistory.map((h, i) => (
              <div key={i} className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">{formatDate(h.date)}</span>
                <span className="tabular font-medium text-foreground/90">${formatMoney(h.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 space-y-3 border-t border-border/50 pt-5">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            className="mt-2 w-full rounded-xl border-0 bg-muted px-4 py-3 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Amount
          </label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={saving}
            className="mt-2 w-full rounded-xl border-0 bg-muted px-4 py-3 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50"
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSaveEdit}
        disabled={saving}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-[15px] font-medium text-background transition-opacity disabled:opacity-40 [@media(hover:hover)]:hover:opacity-90"
      >
        {saving && <Loader2 size={15} className="animate-spin" />}
        Save Changes
      </button>

      {others.length > 0 && (
        <div className="mt-5 border-t border-border/50 pt-5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            This is a duplicate of
          </label>
          <select
            value={mergeTargetId}
            onChange={(e) => setMergeTargetId(e.target.value)}
            disabled={saving}
            className="mt-2 w-full rounded-xl border-0 bg-muted px-4 py-3 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50"
          >
            <option value="">Select a subscription...</option>
            {others.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} — ${formatMoney(o.amount)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleMerge}
            disabled={saving || !mergeTargetId}
            className="mt-3 h-11 w-full rounded-xl bg-muted text-[14px] font-medium text-foreground transition-colors disabled:opacity-40 [@media(hover:hover)]:hover:bg-muted/80"
          >
            Merge into selected
          </button>
        </div>
      )}

      <div className="mt-5 border-t border-border/50 pt-5">
        {!confirmingIgnore ? (
          <button
            type="button"
            onClick={() => setConfirmingIgnore(true)}
            className="text-[13px] font-medium text-muted-foreground transition-colors [@media(hover:hover)]:hover:text-danger"
          >
            This isn't a real subscription
          </button>
        ) : (
          <div>
            <p className="text-[13px] font-medium text-foreground">Remove from Subscriptions?</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              It'll also disappear from Upcoming Bills — you can always mark it recurring again from Transactions.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmingIgnore(false)}
                disabled={saving}
                className="h-9 flex-1 rounded-lg bg-muted text-xs font-medium text-foreground disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleIgnore}
                disabled={saving}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-destructive text-xs font-medium text-destructive-foreground disabled:opacity-50"
              >
                {saving && <Loader2 size={12} className="animate-spin" />}
                Remove
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
