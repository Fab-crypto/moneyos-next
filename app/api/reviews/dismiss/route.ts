import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { success: withinLimit } = await checkRateLimit(`review-dismiss:${user.id}`);
  if (!withinLimit) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const { error } = await supabase
    .from("review_snapshots")
    .update({ dismissed: true })
    .eq("id", body.id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[reviews] failed to dismiss snapshot for user:", body.id, user.id, error);
    return NextResponse.json({ error: "Failed to save. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
