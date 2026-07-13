import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

interface ToggleRequestBody {
  name: string;
  accountId: string;
  amount: number;
  date: string;
  makeRecurring: boolean;
}

function isToggleRequestBody(value: unknown): value is ToggleRequestBody {
  if (typeof value !== "object" || value === null) return false;
  const b = value as Record<string, unknown>;
  return (
    typeof b.name === "string" &&
    typeof b.accountId === "string" &&
    typeof b.amount === "number" &&
    typeof b.date === "string" &&
    typeof b.makeRecurring === "boolean"
  );
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

  const { success: withinLimit } = await checkRateLimit(`recurring-toggle:${user.id}`);
  if (!withinLimit) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!isToggleRequestBody(body)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (body.makeRecurring) {
    const nextDueDate = new Date(new Date(body.date + "T00:00:00").getTime() + 30 * 86_400_000)
      .toISOString()
      .slice(0, 10);

    const { error } = await supabase.from("recurring_transactions").upsert(
      {
        user_id: user.id,
        account_id: body.accountId,
        name: body.name,
        amount: Math.abs(body.amount),
        frequency: "monthly",
        next_due_date: nextDueDate,
        is_active: true,
        source: "manual",
      },
      { onConflict: "user_id,name,account_id" }
    );

    if (error) {
      console.error(`[recurring-toggle] failed to mark recurring for user=${user.id}:`, error);
      return NextResponse.json({ error: "Failed to save. Please try again." }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from("recurring_transactions")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("name", body.name)
      .eq("account_id", body.accountId);

    if (error) {
      console.error(`[recurring-toggle] failed to unmark recurring for user=${user.id}:`, error);
      return NextResponse.json({ error: "Failed to save. Please try again." }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
