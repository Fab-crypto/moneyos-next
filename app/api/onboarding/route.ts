import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

const MONEY_FEELINGS = ["heavy", "foggy", "fragile", "calm"] as const;
const CALM_GOALS = [
  "safe-to-spend",
  "no-surprise-bills",
  "debt-shrinking",
  "effortless-saving",
  "open-app-calmly",
  "clear-monthly-picture",
] as const;

interface OnboardingBody {
  moneyFeeling?: string;
  calmGoals?: string[];
  completed?: boolean;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { success: withinLimit } = await checkRateLimit(`onboarding:${user.id}`);
  if (!withinLimit) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  let body: OnboardingBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (body.moneyFeeling !== undefined) {
    if (!MONEY_FEELINGS.includes(body.moneyFeeling as (typeof MONEY_FEELINGS)[number])) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    update.money_feeling = body.moneyFeeling;
  }

  if (body.calmGoals !== undefined) {
    if (
      !Array.isArray(body.calmGoals) ||
      body.calmGoals.some((g) => !CALM_GOALS.includes(g as (typeof CALM_GOALS)[number]))
    ) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    update.calm_goals = body.calmGoals;
  }

  if (body.completed) {
    update.onboarding_completed_at = new Date().toISOString();
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);

  if (error) {
    console.error(`[onboarding] save failed for user=${user.id}:`, error);
    return NextResponse.json({ error: "Failed to save." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
