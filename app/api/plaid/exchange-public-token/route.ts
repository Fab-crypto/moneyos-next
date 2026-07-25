import { NextResponse } from "next/server";
import { getInstitutionInfo, plaidClient } from "@/lib/plaid";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptToken } from "@/lib/crypto";
import { syncPlaidItemTransactions } from "@/lib/plaid-sync";
import { moneyField, currencyFields } from "@/lib/money/persistence";

interface ExchangeRequestBody {
  public_token: string;
  institution: { institution_id: string; name: string } | null;
}

function isExchangeRequestBody(value: unknown): value is ExchangeRequestBody {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body.public_token === "string" && body.public_token.length > 0;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("[plaid/exchange] auth failed:", authError?.message ?? "no user in session");
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Defense in depth, matching create-link-token: this route is where a bank
  // account actually gets linked, so it must independently re-check MFA rather
  // than trusting that the client only got here via a gated link_token.
  const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aalError || !aal) {
    console.error("[plaid/exchange] AAL check failed:", aalError);
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

  // See create-link-token/route.ts - Supabase reports aal2 for a passkey-only
  // sign-in with no real TOTP challenge this session, so require an explicit
  // "totp" AMR entry rather than trusting the generic aal2 label.
  const authMethods = (aal.currentAuthenticationMethods ?? []).map((entry) =>
    typeof entry === "string" ? entry : entry.method
  );
  const hasVerifiedTotpThisSession = authMethods.includes("totp") || authMethods.includes("mfa/totp");

  if (!hasVerifiedTotpThisSession) {
    return NextResponse.json(
      {
        error: "Please verify your two-factor authentication code to continue.",
        code: "mfa_step_up_required",
      },
      { status: 403 }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch (err) {
    console.error("[plaid/exchange] invalid JSON body:", err);
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isExchangeRequestBody(rawBody)) {
    console.error("[plaid/exchange] missing public_token in body:", rawBody);
    return NextResponse.json({ error: "Missing public_token." }, { status: 400 });
  }
  const body = rawBody;

  const admin = createAdminClient();

  let accessToken: string;
  let itemId: string;
  try {
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: body.public_token,
    });
    accessToken = exchangeResponse.data.access_token;
    itemId = exchangeResponse.data.item_id;
  } catch (err) {
    console.error("[plaid/exchange] Plaid itemPublicTokenExchange failed:", err);
    return NextResponse.json(
      { error: "Failed to connect to Plaid. Please try again." },
      { status: 502 }
    );
  }

  let plaidAccounts: Awaited<ReturnType<typeof plaidClient.accountsGet>>["data"]["accounts"];
  try {
    const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });
    plaidAccounts = accountsResponse.data.accounts;
  } catch (err) {
    console.error("[plaid/exchange] Plaid accountsGet failed:", err);
    return NextResponse.json(
      { error: "Connected to your bank, but couldn't read account details. Please try again." },
      { status: 502 }
    );
  }

  const plaidInstitutionId = body.institution?.institution_id ?? null;
  const institutionInfo = plaidInstitutionId ? await getInstitutionInfo(plaidInstitutionId) : null;
  const institutionName = institutionInfo?.name ?? body.institution?.name ?? "Connected Bank";

  let institutionId: string;
  try {
    if (plaidInstitutionId) {
      const { data: existingInstitution, error: lookupError } = await admin
        .from("institutions")
        .select("id")
        .eq("user_id", user.id)
        .eq("plaid_institution_id", plaidInstitutionId)
        .maybeSingle();

      if (lookupError) {
        console.error("[plaid/exchange] institutions lookup failed:", lookupError);
        throw lookupError;
      }

      if (existingInstitution) {
        institutionId = existingInstitution.id;
        const { error: updateError } = await admin
          .from("institutions")
          .update({
            name: institutionName,
            logo_url: institutionInfo?.logoUrl ?? null,
            status: "connected",
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", institutionId);

        if (updateError) {
          console.error("[plaid/exchange] institutions update failed:", updateError);
          throw updateError;
        }
      } else {
        const { data: newInstitution, error: insertError } = await admin
          .from("institutions")
          .insert({
            user_id: user.id,
            plaid_institution_id: plaidInstitutionId,
            name: institutionName,
            logo_url: institutionInfo?.logoUrl ?? null,
            status: "connected",
            last_synced_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (insertError || !newInstitution) {
          console.error("[plaid/exchange] institutions insert failed:", insertError);
          throw insertError ?? new Error("Insert returned no row.");
        }
        institutionId = newInstitution.id;
      }
    } else {
      const { data: newInstitution, error: insertError } = await admin
        .from("institutions")
        .insert({
          user_id: user.id,
          plaid_institution_id: null,
          name: institutionName,
          status: "connected",
          last_synced_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError || !newInstitution) {
        console.error("[plaid/exchange] institutions insert (no plaid id) failed:", insertError);
        throw insertError ?? new Error("Insert returned no row.");
      }
      institutionId = newInstitution.id;
    }
  } catch (err) {
    console.error("[plaid/exchange] institutions step failed, aborting:", err);
    return NextResponse.json(
      { error: "Connected to your bank, but saving the connection failed. Please try again." },
      { status: 500 }
    );
  }

  let plaidItemRowId: string;
  try {
    const { data: plaidItem, error: plaidItemError } = await admin
      .from("plaid_items")
      .upsert(
        {
          user_id: user.id,
          institution_id: institutionId,
          plaid_item_id: itemId,
          access_token_encrypted: encryptToken(accessToken),
          status: "active",
        },
        { onConflict: "plaid_item_id" }
      )
      .select("id")
      .single();

    if (plaidItemError || !plaidItem) {
      console.error("[plaid/exchange] plaid_items upsert failed:", plaidItemError);
      throw plaidItemError ?? new Error("Upsert returned no row.");
    }
    plaidItemRowId = plaidItem.id;
  } catch (err) {
    console.error("[plaid/exchange] plaid_items step failed, aborting:", err);
    return NextResponse.json(
      { error: "Connected to your bank, but saving the connection failed. Please try again." },
      { status: 500 }
    );
  }

  try {
    const accountRows = plaidAccounts.map((account) => {
      const currency = account.balances.iso_currency_code ?? "USD";
      return {
        user_id: user.id,
        plaid_item_id: plaidItemRowId,
        institution_id: institutionId,
        plaid_account_id: account.account_id,
        name: account.name,
        official_name: account.official_name,
        mask: account.mask,
        type: account.type,
        subtype: account.subtype,
        ...moneyField("current_balance", account.balances.current ?? 0, currency),
        ...moneyField("available_balance", account.balances.available, currency),
        ...currencyFields(currency),
        currency,
      };
    });

    const { error: accountsError } = await admin
      .from("accounts")
      .upsert(accountRows, { onConflict: "plaid_account_id" });

    if (accountsError) {
      console.error("[plaid/exchange] accounts upsert failed:", accountsError);
      throw accountsError;
    }

    console.log(
      `[plaid/exchange] success: user=${user.id} institution=${institutionId} accounts=${accountRows.length}`
    );

    

    let transactionsSynced = 0;
    try {
      const result = await syncPlaidItemTransactions(admin, user.id, {
        id: plaidItemRowId,
        plaid_item_id: itemId,
        access_token_encrypted: encryptToken(accessToken),
        cursor: null,
      });
      transactionsSynced = result.added;
    } catch (err) {
      console.error("[plaid/exchange] initial transaction sync failed (non-fatal):", err);
    }

    return NextResponse.json({
      success: true,
      institution_id: institutionId,
      accounts_connected: accountRows.length,
      transactions_synced: transactionsSynced,
    });
  } catch (err) {
    console.error("[plaid/exchange] accounts step failed:", err);
    return NextResponse.json(
      {
        error: "Connected your bank and saved the institution, but syncing accounts failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
