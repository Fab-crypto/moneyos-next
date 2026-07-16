import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  const { error } = await supabase
    .from("profiles")
    .update({ last_greeting_shown_date: todayIso })
    .eq("id", user.id);

  if (error) {
    console.error(`[dismiss-greeting] failed for user=${user.id}:`, error);
    return NextResponse.json({ error: "Failed to save." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
