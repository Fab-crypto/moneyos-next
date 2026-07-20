"use client";

import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    // Passkey support is experimental in Supabase Auth (API may change without
    // notice). Opting in here only enables the client methods below - it does
    // not replace or weaken the existing password + TOTP requirement.
    auth: { experimental: { passkey: true } },
  }
);