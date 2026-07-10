import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncPlaidItemTransactions } from "@/lib/plaid-sync";
import { verifyPlaidWebhook } from "@/lib/plaid-webhook-verify";

interface PlaidWebhookBody {
  webhook_type: string;
  webhook_code: string;
  item_id?: string;
  error?: { error_code?: string } | null;
}

// Plaid sends several distinct TRANSACTIONS codes across an Item's
// lifecycle — the first pull after connecting (INITIAL_UPDATE), the
// slower backfill of older history (HISTORICAL_UPDATE), routine
// day-to-day updates (DEFAULT_UPDATE), and the /transactions/sync-based
// signal (SYNC_UPDATES_AVAILABLE). All four mean the same thing from
// our side: new data is available, go pull it — syncPlaidItemTransactions
// is cursor-based, so calling it for any of these is always correct and
// never double-processes the same transactions twice.
const SYNC_TRIGGER_CODES = new Set([
  "INITIAL_UPDATE",
  "HISTORICAL_UPDATE",
  "DEFAULT_UPDATE",
  "SYNC_UPDATES_AVAILABLE",
]);

function shouldTriggerSync(webhookType: string, webhookCode: string): boolean {
  return webhookType === "TRANSACTIONS" && SYNC_TRIGGER_CODES.has(webhookCode);
}

export async function POST(request: Request) {
  // Read the raw text first — verification needs the exact bytes Plaid
  // signed, before any JSON parsing could subtly alter formatting.
  const rawBody = await request.text();
  const verificationHeader = request.headers.get("plaid-verification");

  const isValid = await verifyPlaidWebhook(rawBody, verificationHeader);
  if (!isValid) {
    console.error("[plaid-webhook] rejected: failed signature verification");
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let body: PlaidWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Audit trail first, before acting on anything — every verified
  // webhook is logged regardless of type.
  const { data: eventRow } = await admin
    .from("plaid_webhook_events")
    .insert({
      plaid_item_id: body.item_id ?? null,
      webhook_type: body.webhook_type,
      webhook_code: body.webhook_code,
      payload: body,
      processed: false,
    })
    .select("id")
    .single();

  if (!body.item_id) {
    return NextResponse.json({ success: true });
  }

  const { data: item, error: itemLookupError } = await admin
    .from("plaid_items")
    .select("id, user_id, plaid_item_id, access_token_encrypted, cursor, institution_id")
    .eq("plaid_item_id", body.item_id)
    .maybeSingle();

  if (itemLookupError || !item) {
    console.error(`[plaid-webhook] no matching plaid_item for item_id=${body.item_id}`);
    return NextResponse.json({ success: true });
  }

  try {
    if (shouldTriggerSync(body.webhook_type, body.webhook_code)) {
      await syncPlaidItemTransactions(admin, item.user_id, item);
      await admin
        .from("institutions")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", item.institution_id);
    } else if (body.webhook_type === "ITEM" && body.webhook_code === "ERROR") {
      const status = body.error?.error_code === "ITEM_LOGIN_REQUIRED" ? "reauth_required" : "error";
      await admin.from("plaid_items").update({ status }).eq("id", item.id);
      await admin.from("institutions").update({ status }).eq("id", item.institution_id);
      console.log(`[plaid-webhook] item=${item.plaid_item_id} marked ${status}`);
    } else {
      console.log(`[plaid-webhook] unhandled: ${body.webhook_type}/${body.webhook_code}`);
    }

    if (eventRow) {
      await admin.from("plaid_webhook_events").update({ processed: true }).eq("id", eventRow.id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(`[plaid-webhook] processing failed for item=${body.item_id}:`, err);
    // Still respond 200 — Plaid retries on non-2xx responses, and our
    // sync logic is cursor-based and safe to run again, so a retry
    // storm from Plaid would add no value here.
    return NextResponse.json({ success: true });
  }
}