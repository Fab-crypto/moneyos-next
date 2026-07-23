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
      // The password-recovery link lands on /auth/reset-password, which
      // already runs its own MFA step-up check (and has its own "link
      // expired" handling) - don't double-gate it. Every other caller here
      // is a normal OAuth sign-in, which - like password sign-in - never
      // gets elevated past AAL1 on its own, so route it through the same
      // step-up check used for the password/passkey sign-in path.
      const target =
        next === "/auth/reset-password" ? next : `/auth/mfa-check?next=${encodeURIComponent(next)}`;
      return NextResponse.redirect(new URL(target, requestUrl.origin));
    }

    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
  }

  const errorUrl = new URL("/auth/login", requestUrl.origin);
  errorUrl.searchParams.set("error", "Sign-in failed. Please try again.");

  return NextResponse.redirect(errorUrl);
}
