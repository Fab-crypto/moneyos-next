import { NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/crypto";

interface DisconnectRequestBody {
  institutionId: string;
}

function isDisconnectRequestBody(value: unknown): value is DisconnectRequestBody {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body.institutionId === "string" && body.institutionId.length > 0;
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

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isDisconnectRequestBody(rawBody)) {
    return NextResponse.json({ error: "Missing institutionId." }, { status: 400 });
  }
  const { institutionId } = rawBody;

  const admin = createAdminClient();

  // Ownership check — never act on an institution that doesn't belong
  // to the authenticated user, regardless of what ID the client sends.
  const { data: institution, error: institutionLookupError } = await admin
    .from("institutions")
    .select("id")
    .eq("id", institutionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (institutionLookupError) {
    console.error("[plaid/disconnect] institution lookup failed:", institutionLookupError);
    return NextResponse.json({ error: "Failed to look up institution." }, { status: 500 });
  }
  if (!institution) {
    return NextResponse.json({ error: "Institution not found." }, { status: 404 });
  }

  const { data: items, error: itemsError } = await admin
    .from("plaid_items")
    .select("id, access_token_encrypted")
    .eq("institution_id", institutionId)
    .eq("user_id", user.id);

  if (itemsError) {
    console.error("[plaid/disconnect] failed to load plaid_items:", itemsError);
    return NextResponse.json({ error: "Failed to load connection details." }, { status: 500 });
  }

  for (const item of items ?? []) {
    // Revoke with Plaid first. This is required, not optional — leaving
    // the token active at Plaid after "disconnecting" in our own UI
    // would mean the connection isn't actually gone.
    try {
      const accessToken = decryptToken(item.access_token_encrypted);
      await plaidClient.itemRemove({ access_token: accessToken });
    } catch (err) {
      // Log and continue — a sandbox item already invalidated, or a
      // token that's expired, shouldn't block removing our own records.
      console.error("[plaid/disconnect] itemRemove failed for plaid_item (continuing):", item.id, err);
    }

    const { data: accountsToRemove } = await admin
      .from("accounts")
      .select("id")
      .eq("plaid_item_id", item.id);

    const accountIds = (accountsToRemove ?? []).map((a) => a.id);

    if (accountIds.length > 0) {
      // Right-to-delete: transaction history for a disconnected account
      // is removed, not just hidden, since the user no longer has an
      // active connection providing that data.
      const { error: txDeleteError } = await admin
        .from("transactions")
        .delete()
        .in("account_id", accountIds);
      if (txDeleteError) {
        console.error("[plaid/disconnect] transactions delete failed for item:", item.id, txDeleteError);
      }

      // recurring_transactions.account_id is ON DELETE SET NULL, not
      // CASCADE — without this explicit cleanup, a bill tied to the
      // account being removed would survive with a null account_id and
      // keep showing as "Due in 2 days" on Dashboard/Accounts forever.
      const { error: recurringDeleteError } = await admin
        .from("recurring_transactions")
        .delete()
        .in("account_id", accountIds);
      if (recurringDeleteError) {
        console.error(
          "[plaid/disconnect] recurring_transactions delete failed for item:",
          item.id,
          recurringDeleteError
        );
      }
    }

    const { error: accountsDeleteError } = await admin
      .from("accounts")
      .delete()
      .eq("plaid_item_id", item.id);
    if (accountsDeleteError) {
      console.error("[plaid/disconnect] accounts delete failed for item:", item.id, accountsDeleteError);
    }

    const { error: itemDeleteError } = await admin.from("plaid_items").delete().eq("id", item.id);
    if (itemDeleteError) {
      console.error("[plaid/disconnect] plaid_items delete failed for item:", item.id, itemDeleteError);
    }
  }

  const { error: institutionDeleteError } = await admin
    .from("institutions")
    .delete()
    .eq("id", institutionId);

  if (institutionDeleteError) {
    console.error("[plaid/disconnect] institution delete failed:", institutionDeleteError);
    return NextResponse.json(
      { error: "Bank was disconnected, but removing it from your list failed. Please refresh and try again." },
      { status: 500 }
    );
  }

  console.log("[plaid/disconnect] success:", user.id, institutionId, items?.length ?? 0);

  return NextResponse.json({ success: true });
}