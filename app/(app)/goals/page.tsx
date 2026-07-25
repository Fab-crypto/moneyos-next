import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sumRows, moneyFromRow } from "@/lib/money/read";
import { GoalsClient } from "./GoalsClient";

export interface GoalPace {
  label: string;
  tone: "success" | "neutral";
}

function computePace(
  currentAmount: number,
  targetAmount: number,
  dueDate: string | null,
  createdAt: string
): GoalPace | null {
  if (targetAmount > 0 && currentAmount >= targetAmount) {
    return { label: "Complete", tone: "success" };
  }
  if (!dueDate) return null;

  const today = new Date();
  const due = new Date(dueDate + "T00:00:00");
  const created = new Date(createdAt);

  if (today > due) {
    return { label: "Past target date", tone: "neutral" };
  }

  const totalDays = (due.getTime() - created.getTime()) / 86_400_000;
  const daysElapsed = (today.getTime() - created.getTime()) / 86_400_000;
  if (totalDays <= 0) return null;

  const expectedFraction = Math.min(1, Math.max(0, daysElapsed / totalDays));
  const expectedAmount = targetAmount * expectedFraction;

  if (currentAmount >= expectedAmount * 1.05) {
    return { label: "Ahead of schedule", tone: "success" };
  }
  if (currentAmount >= expectedAmount * 0.9) {
    return { label: "On pace", tone: "neutral" };
  }
  return { label: "Behind pace", tone: "neutral" };
}

export default async function GoalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/welcome");
  }

  const { data: goalsData } = await supabase
    .from("goals")
    .select(
      "id, name, current_amount, current_amount_minor, target_amount, target_amount_minor, currency_code, due_date, is_primary, created_at"
    )
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  const goals = (goalsData ?? []).map((g) => {
    const currentAmount = Number(moneyFromRow(g, "current_amount", { fallbackCurrency: "USD" })?.toDecimalString() ?? 0);
    const targetAmount = Number(moneyFromRow(g, "target_amount", { fallbackCurrency: "USD" })?.toDecimalString() ?? 0);
    return {
      id: g.id,
      name: g.name,
      currentAmount,
      targetAmount,
      dueDate: g.due_date,
      isPrimary: g.is_primary,
      pace: computePace(currentAmount, targetAmount, g.due_date, g.created_at),
    };
  });

  const totalSaved = Number(sumRows(goalsData ?? [], "current_amount", "USD").toDecimalString());

  return <GoalsClient goals={goals} totalSaved={totalSaved} />;
}
