import { isMoneyDualWriteEnabled } from "./persistence";

/**
 * Structured error log for a failed money write. Money writes are
 * financial-critical, so a failure must never be swallowed silently — every
 * caller that persists money passes its DB error here. Emits a single-line JSON
 * object so failures are queryable in log aggregation (Vercel logs / Sentry):
 * filter on `event:"money_write_failed"` to surface every one.
 *
 * Because legacy and minor columns are written together in one atomic row
 * upsert, "either write failing" is a single event — the row write — captured
 * here with enough context (table, operation, user, whether dual-write was on)
 * to diagnose without reproducing.
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
      dual_write: isMoneyDualWriteEnabled(),
      message: error instanceof Error ? error.message : String(error),
    })
  );
}
