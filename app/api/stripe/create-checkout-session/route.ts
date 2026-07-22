import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
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

  const { success: withinLimit } = await checkRateLimit(`stripe-checkout:${user.id}`);
  if (!withinLimit) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  // Pay-what-feels-fair: three prices for the same Plus plan. Falls back to
  // the base price when a tier's env var isn't configured.
  const TIER_PRICE_IDS: Record<number, string | undefined> = {
    8: process.env.STRIPE_PRICE_ID_PLUS_8,
    10: process.env.STRIPE_PRICE_ID_PLUS_10,
    12: process.env.STRIPE_PRICE_ID_PLUS_12,
  };
  const RETURN_PATHS = ["/profile", "/onboarding"];

  let tier: number | undefined;
  let returnTo = "/profile";
  try {
    const body = await request.json();
    if (typeof body?.tier === "number" && body.tier in TIER_PRICE_IDS) tier = body.tier;
    if (typeof body?.returnTo === "string" && RETURN_PATHS.includes(body.returnTo)) returnTo = body.returnTo;
  } catch {
    // No body: existing callers POST without one.
  }

  const priceId = (tier !== undefined ? TIER_PRICE_IDS[tier] : undefined) ?? process.env.STRIPE_PRICE_ID!;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email,
      success_url: `${origin}${returnTo}?checkout=success`,
      cancel_url: `${origin}${returnTo}?checkout=cancelled`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout] session creation failed:", err);
    return NextResponse.json({ error: "Failed to start checkout. Please try again." }, { status: 500 });
  }
}
