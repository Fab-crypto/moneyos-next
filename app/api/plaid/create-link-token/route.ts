import { NextResponse } from "next/server";
import { CountryCode, Products } from "plaid";
import { plaidClient } from "@/lib/plaid";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Defense in depth: the client already gates this before calling here, but the
  // server is the real security boundary. Require a verified MFA factor, and require
  // the current session to have actually completed that challenge (aal2), before a
  // Plaid link token is ever issued.
  const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aalError || !aal) {
    return NextResponse.json(
      { error: "Could not verify your security status.", code: "mfa_check_failed" },
      { status: 500 }
    );
  }

  if (aal.nextLevel === "aal1") {
    return NextResponse.json(
      {
        error: "Two-factor authentication must be set up before connecting a bank account.",
        code: "mfa_not_enrolled",
      },
      { status: 403 }
    );
  }

  if (aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    return NextResponse.json(
      {
        error: "Please verify your two-factor authentication code to continue.",
        code: "mfa_step_up_required",
      },
      { status: 403 }
    );
  }

  const { success: withinLimit } = await checkRateLimit(`plaid-create-link-token:${user.id}`);
  if (!withinLimit) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  try {
    const response = await plaidClient.linkTokenCreate({
      webhook: process.env.PLAID_WEBHOOK_URL,
      user: { client_user_id: user.id },
      client_name: "MoneyOS",
      products: [Products.Transactions, Products.Liabilities],
      country_codes: [CountryCode.Us],
      language: "en",
    });
    return NextResponse.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error("Plaid create-link-token failed:", err);
    return NextResponse.json({ error: "Failed to create link token." }, { status: 500 });
  }
}
