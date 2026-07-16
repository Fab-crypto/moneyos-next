import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    .select("id, name, current_amount, target_amount, due_date, is_primary, created_at")
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  const goals = (goalsData ?? []).map((g) => ({
    id: g.id,
    name: g.name,
    currentAmount: g.current_amount,
    targetAmount: g.target_amount,
    dueDate: g.due_date,
    isPrimary: g.is_primary,
    pace: computePace(g.current_amount, g.target_amount, g.due_date, g.created_at),
  }));

  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);

  return <GoalsClient goals={goals} totalSaved={totalSaved} />;
}
