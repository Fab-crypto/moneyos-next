import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { plaidClient } from "@/lib/plaid";
import { decryptToken } from "@/lib/crypto";
import { stripe } from "@/lib/stripe";
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

  const { success: withinLimit } = await checkRateLimit(`account-delete:${user.id}`);
  if (!withinLimit) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment and try again." }, { status: 429 });
  }

  const admin = createAdminClient();

  const { data: plaidItems } = await admin
    .from("plaid_items")
    .select("id, access_token_encrypted, plaid_item_id")
    .eq("user_id", user.id);

  for (const item of plaidItems ?? []) {
    try {
      const accessToken = decryptToken(item.access_token_encrypted);
      await plaidClient.itemRemove({ access_token: accessToken });
    } catch (err) {
      console.error("[account-delete] failed to revoke Plaid item for user:", item.plaid_item_id, user.id, err);
    }
  }

  const { data: subscription } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (subscription?.stripe_subscription_id && subscription.status !== "canceled") {
    try {
      await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
    } catch (err) {
      console.error(`[account-delete] failed to cancel Stripe subscription for user=${user.id}:`, err);
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error("[account-delete] failed to delete user:", user.id, deleteError);
    return NextResponse.json(
      { error: "Failed to delete account. Please try again or contact support." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
