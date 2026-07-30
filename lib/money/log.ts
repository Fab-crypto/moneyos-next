/**
 * Structured error log for a failed money write. Money writes are
 * financial-critical, so a failure must never be swallowed silently — every
 * caller that persists money passes its DB error here. Emits a single-line JSON
 * object so failures are queryable in log aggregation (Vercel logs / Sentry):
 * filter on `event:"money_write_failed"` to surface every one.
 *
 * A money value now lives in a single integer `*_minor` column (plus the row's
 * currency_code/scale), all written together in one atomic row upsert, so a
 * failed write is a single event — captured here with enough context (table,
 * operation, user) to diagnose without reproducing.
 */
export function logMoneyWriteError(context: {
  op: string;
  table: string;
  userId?: string | null;
  error: unknown;
}): void {
  const { op, table, userId, error } = context;
  console.error(
    JSON.stringify({
      level: "error",
      event: "money_write_failed",
      op,
      table,
      user_id: userId ?? null,
      message: error instanceof Error ? error.message : String(error),
    })
  );
}
