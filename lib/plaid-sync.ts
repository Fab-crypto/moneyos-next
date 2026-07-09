import "server-only";
import { plaidClient } from "@/lib/plaid";
import { decryptToken } from "@/lib/crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

interface PlaidItemRow {
  id: string;
  plaid_item_id: string;
  access_token_encrypted: string;
  cursor: string | null;
}

export interface SyncResult {
  added: number;
  modified: number;
  removed: number;
}

// Plaid's transaction amount sign convention: positive = money leaving
// the account (a purchase/expense), negative = money coming in (a
// deposit/income). This is the opposite of MoneyOS's storage convention
// (amount is always positive; sign is carried by `type` instead), so it
// is translated here at the sync boundary — nowhere else in the app
// needs to know Plaid's convention exists.
function resolveType(plaidAmount: number, pfcPrimary: string | null | undefined): "income" | "expense" | "transfer" {
  if (pfcPrimary?.startsWith("TRANSFER")) return "transfer";
  return plaidAmount < 0 ? "income" : "expense";
}

function normalizeCategory(pfcPrimary: string | null | undefined): string {
  if (!pfcPrimary) return "other";
  return pfcPrimary.toLowerCase().replace(/_/g, " ");
}

/**
 * Syncs one Plaid Item's transactions (added/modified/removed) into the
 * `transactions` table, advances its cursor, and logs the run to
 * `plaid_sync_logs`. Used by both the standalone /transactions-sync
 * route (syncs every item for the caller) and exchange-public-token
 * (syncs just the item that was just connected), so this logic exists
 * exactly once.
 */
export async function syncPlaidItemTransactions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: SupabaseClient<any, "public", any>,
  userId: string,
  item: PlaidItemRow
): Promise<SyncResult> {
  const startedAt = new Date().toISOString();

  try {
    const accessToken = decryptToken(item.access_token_encrypted);

    const { data: accounts, error: accountsError } = await admin
      .from("accounts")
      .select("id, plaid_account_id")
      .eq("plaid_item_id", item.id);

    if (accountsError) throw accountsError;

    const accountIdByPlaidId = new Map((accounts ?? []).map((a) => [a.plaid_account_id, a.id]));

    let cursor: string | undefined = item.cursor ?? undefined;
    let hasMore = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const added: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modified: any[] = [];
    const removed: { transaction_id: string }[] = [];

    while (hasMore) {
      const response = await plaidClient.transactionsSync({ access_token: accessToken, cursor });
      added.push(...response.data.added);
      modified.push(...response.data.modified);
      removed.push(...response.data.removed);
      cursor = response.data.next_cursor;
      hasMore = response.data.has_more;
    }

    const upsertRows = [...added, ...modified]
      .map((t) => {
        const accountId = accountIdByPlaidId.get(t.account_id);
        if (!accountId) return null; // transaction belongs to an account we haven't synced

        const pfcPrimary = t.personal_finance_category?.primary ?? null;
        const pfcDetailed = t.personal_finance_category?.detailed ?? null;

        return {
          user_id: userId,
          account_id: accountId,
          plaid_transaction_id: t.transaction_id,
          name: t.name,
          merchant_name: t.merchant_name,
          amount: Math.abs(t.amount),
          currency: t.iso_currency_code ?? "USD",
          type: resolveType(t.amount, pfcPrimary),
          plaid_category_primary: pfcPrimary,
          plaid_category_detailed: pfcDetailed,
          category: normalizeCategory(pfcPrimary),
          date: t.date,
          authorized_date: t.authorized_date,
          pending: t.pending,
          is_removed: false,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (upsertRows.length > 0) {
      const { error: upsertError } = await admin
        .from("transactions")
        .upsert(upsertRows, { onConflict: "plaid_transaction_id" });
      if (upsertError) throw upsertError;
    }

    if (removed.length > 0) {
      const removedIds = removed.map((r) => r.transaction_id);
      const { error: removeError } = await admin
        .from("transactions")
        .update({ is_removed: true })
        .in("plaid_transaction_id", removedIds);
      if (removeError) throw removeError;
    }

    const { error: cursorError } = await admin
      .from("plaid_items")
      .update({ cursor, status: "active" })
      .eq("id", item.id);
    if (cursorError) throw cursorError;

    await admin.from("plaid_sync_logs").insert({
      plaid_item_id: item.id,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      added_count: added.length,
      modified_count: modified.length,
      removed_count: removed.length,
      status: "success",
    });

    console.log(
      `[plaid-sync] item=${item.plaid_item_id} added=${added.length} modified=${modified.length} removed=${removed.length}`
    );

    return { added: added.length, modified: modified.length, removed: removed.length };
  } catch (err) {
    console.error(`[plaid-sync] item=${item.plaid_item_id} failed:`, err);

    await admin.from("plaid_sync_logs").insert({
      plaid_item_id: item.id,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      added_count: 0,
      modified_count: 0,
      removed_count: 0,
      status: "error",
      error_message: err instanceof Error ? err.message : "Unknown error",
    });

    throw err;
  }
}