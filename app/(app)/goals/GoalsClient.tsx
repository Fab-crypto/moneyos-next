"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion, type Variants } from "framer-motion";
import { Target, Plus, Trash2, Loader2 } from "lucide-react";
import { MoneyCard } from "@/components/ui/MoneyCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { MoodBadge } from "@/components/ui/MoodBadge";
import { MoneyButton } from "@/components/ui/MoneyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Toggle } from "@/components/ui/Toggle";
import { BottomNav } from "@/components/layout/BottomNav";
import { EASE, SHELL_WIDTH } from "@/lib/constants";
import { formatMoney } from "@/lib/formatters";
import { supabase } from "@/lib/supabase";
import { moneyField, currencyFields } from "@/lib/money/persistence";
import type { GoalPace } from "./page";

interface Goal {
  id: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
  dueDate: string | null;
  isPrimary: boolean;
  pace: GoalPace | null;
}

interface GoalsClientProps {
  goals: Goal[];
  totalSaved: number;
}

function pct(current: number, target: number) {
  return target > 0 ? Math.min((current / target) * 100, 100) : 0;
}

export function GoalsClient({ goals, totalSaved }: GoalsClientProps) {
  const reduceMotion = useReducedMotion();
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const primaryGoal = goals.find((g) => g.isPrimary) ?? goals[0] ?? null;
  const otherGoals = goals.filter((g) => g.id !== primaryGoal?.id);

  function openCreate() {
    setEditingGoal(null);
    setFormOpen(true);
  }

  function openEdit(goal: Goal) {
    setEditingGoal(goal);
    setFormOpen(true);
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
                action={
                  <MoneyButton size="md" onClick={openCreate}>
                    Create Goal
                  </MoneyButton>
                }
              />
            </motion.div>
          ) : (
            <>
              <motion.div variants={item}>
                <TotalSavedCard total={totalSaved} />
              </motion.div>

              {primaryGoal && (
                <motion.div variants={item}>
                  <button type="button" onClick={() => openEdit(primaryGoal)} className="block w-full text-left">
                    <GoalHeroCard goal={primaryGoal} />
                  </button>
                </motion.div>
              )}

              {otherGoals.length > 0 && (
                <div className="mt-5 space-y-3">
                  {otherGoals.map((goal) => (
                    <motion.div key={goal.id} variants={item}>
                      <button type="button" onClick={() => openEdit(goal)} className="block w-full text-left">
                        <GoalCard goal={goal} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

              <motion.div variants={item} className="mt-5">
                <button
                  type="button"
                  onClick={openCreate}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 py-4 text-[14px] font-medium text-muted-foreground transition-colors [@media(hover:hover)]:hover:text-foreground"
                >
                  <Plus size={15} />
                  Add another goal
                </button>
              </motion.div>
            </>
          )}
        </motion.main>
      </div>

      <BottomNav />

      <AnimatePresence>
        {formOpen && (
          <BottomSheet open onClose={() => setFormOpen(false)}>
            <GoalForm goal={editingGoal} onClose={() => setFormOpen(false)} />
          </BottomSheet>
        )}
      </AnimatePresence>
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
  const percent = pct(goal.currentAmount, goal.targetAmount);

  return (
    <MoneyCard glow className="mt-8 p-7">
      <SectionHeader>{goal.name}</SectionHeader>

      <p className="tabular relative z-10 mt-4 font-heading text-[52px] font-bold leading-none tracking-[-0.02em] text-foreground">
        ${formatMoney(goal.currentAmount, { decimals: 0 })}
      </p>
      <p className="mt-2 text-[14px] text-muted-foreground">of ${formatMoney(goal.targetAmount, { decimals: 0 })}</p>

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
        {goal.pace && <MoodBadge label={goal.pace.label} tone={goal.pace.tone} />}
      </div>
    </MoneyCard>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const percent = pct(goal.currentAmount, goal.targetAmount);

  return (
    <MoneyCard>
      <p className="text-[15px] font-medium text-foreground">{goal.name}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        ${formatMoney(goal.currentAmount, { decimals: 0 })} of ${formatMoney(goal.targetAmount, { decimals: 0 })}
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
        {goal.pace && <MoodBadge label={goal.pace.label} tone={goal.pace.tone} />}
      </div>
    </MoneyCard>
  );
}

function GoalForm({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const router = useRouter();
  const isEditing = !!goal;

  const [name, setName] = useState(goal?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(goal ? String(goal.targetAmount) : "");
  const [currentAmount, setCurrentAmount] = useState(goal ? String(goal.currentAmount) : "0");
  const [dueDate, setDueDate] = useState(goal?.dueDate ?? "");
  const [isPrimary, setIsPrimary] = useState(goal?.isPrimary ?? false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);

    const parsedTarget = Number(targetAmount);
    const parsedCurrent = Number(currentAmount);

    if (!name.trim()) {
      setError("Give this goal a name.");
      return;
    }
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setError("Enter a valid target amount.");
      return;
    }
    if (!Number.isFinite(parsedCurrent) || parsedCurrent < 0) {
      setError("Enter a valid current amount.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Could not verify your account. Please try again.");
      setSaving(false);
      return;
    }

    if (isPrimary) {
      await supabase
        .from("goals")
        .update({ is_primary: false })
        .eq("user_id", user.id)
        .neq("id", goal?.id ?? "00000000-0000-0000-0000-000000000000");
    }

    const payload = {
      name: name.trim(),
      ...moneyField("target_amount", parsedTarget, "USD"),
      ...moneyField("current_amount", parsedCurrent, "USD"),
      ...currencyFields("USD"),
      due_date: dueDate || null,
      is_primary: isPrimary,
    };

    const { error: saveError } = isEditing
      ? await supabase.from("goals").update(payload).eq("id", goal.id)
      : await supabase.from("goals").insert({ ...payload, user_id: user.id });

    setSaving(false);

    if (saveError) {
      console.error("[goals] save failed:", saveError);
      setError("Failed to save. Please try again.");
      return;
    }

    onClose();
    router.refresh();
  }

  async function handleDelete() {
    if (!goal) return;
    setDeleting(true);

    const { error: deleteError } = await supabase.from("goals").delete().eq("id", goal.id);

    setDeleting(false);

    if (deleteError) {
      console.error("[goals] delete failed:", deleteError);
      setError("Failed to delete. Please try again.");
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <div>
      <p className="text-[17px] font-medium text-foreground">{isEditing ? "Edit Goal" : "New Goal"}</p>

      <div className="mt-5 space-y-4">
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Target
            </label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              disabled={saving}
              className="mt-2 w-full rounded-xl border-0 bg-muted px-4 py-3 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Saved so far
            </label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              disabled={saving}
              className="mt-2 w-full rounded-xl border-0 bg-muted px-4 py-3 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Target date (optional)
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={saving}
            className="mt-2 w-full rounded-xl border-0 bg-muted px-4 py-3 text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50"
          />
        </div>

        <div className="flex items-center justify-between py-1">
          <span className="text-[14px] text-foreground">Make this my primary goal</span>
          <Toggle checked={isPrimary} onChange={() => setIsPrimary((v) => !v)} disabled={saving} label="Primary goal" />
        </div>
      </div>

      {error && (
        <p className="mt-3 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || deleting}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-foreground text-[15px] font-medium text-background transition-opacity disabled:opacity-40 [@media(hover:hover)]:hover:opacity-90"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Goal"}
        </button>
      </div>

      {isEditing && (
        <div className="mt-4">
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors [@media(hover:hover)]:hover:text-danger"
            >
              <Trash2 size={14} />
              Delete this goal
            </button>
          ) : (
            <div>
              <p className="text-[13px] font-medium text-foreground">Delete this goal?</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">This can&apos;t be undone.</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                  className="h-9 flex-1 rounded-lg bg-muted text-xs font-medium text-foreground transition-colors [@media(hover:hover)]:hover:bg-muted/80 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-destructive text-xs font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {deleting && <Loader2 size={12} className="animate-spin" />}
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
