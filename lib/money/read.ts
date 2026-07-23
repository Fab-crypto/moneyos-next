import { Money } from "./money";
import { moneyFromExternal } from "./persistence";

/**
 * Read a Money from a database row during the read-cutover phase.
 *
 * Prefers the exact integer minor-unit column; falls back to converting the
 * legacy numeric column when the minor value isn't populated (a row written
 * before dual-write was activated). This makes the read cutover safe to deploy
 * any time after Phase 1: every existing row was backfilled, so it reads exact
 * minor units, and any not-yet-dual-written row degrades gracefully to its
 * legacy value instead of reading null.
 *
 * Returns null only when both the minor and legacy columns are null (a genuinely
 * absent value), so callers can distinguish "no money here" from "zero".
 */
export function moneyFromRow(
  row: Record<string, unknown>,
  base: string,
  opts?: { minorKey?: string; currencyKey?: string; fallbackCurrency?: string }
): Money | null {
  const minorKey = opts?.minorKey ?? `${base}_minor`;
  const currencyKey = opts?.currencyKey ?? "currency_code";
  const fallbackCurrency = opts?.fallbackCurrency ?? "USD";
  const currency = (row[currencyKey] as string | null) ?? fallbackCurrency;

  const minor = row[minorKey];
  if (minor !== null && minor !== undefined) {
    // Exact path. PostgREST returns bigint as a number (within 2^53) or a
    // string; Money.ofMinor accepts both and validates it's an integer.
    return Money.ofMinor(minor as number | string, currency);
  }

  const legacy = row[base];
  if (legacy === null || legacy === undefined) return null;
  return moneyFromExternal(Number(legacy), currency);
}

/**
 * Sum a set of rows' money values exactly. Rows with a null value are skipped.
 * Returns a zero Money in the given currency when nothing summed, so callers
 * always get a usable value. All addition is in integer minor units — this is
 * the operation the float representation used to corrupt.
 */
export function sumRows(
  rows: Record<string, unknown>[],
  base: string,
  currency: string,
  opts?: { minorKey?: string; currencyKey?: string; filter?: (row: Record<string, unknown>) => boolean }
): Money {
  let total = Money.zero(currency);
  for (const row of rows) {
    if (opts?.filter && !opts.filter(row)) continue;
    const money = moneyFromRow(row, base, { minorKey: opts?.minorKey, currencyKey: opts?.currencyKey, fallbackCurrency: currency });
    if (money) total = total.add(money);
  }
  return total;
}
