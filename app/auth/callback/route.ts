import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }

    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
  }

  const errorUrl = new URL("/auth/login", requestUrl.origin);
  errorUrl.searchParams.set("error", "Sign-in failed. Please try again.");

  return NextResponse.redirect(errorUrl);
}
