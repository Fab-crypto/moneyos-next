import { Money } from "./money";
import { getCurrency, isSupportedCurrency } from "./currencies";

/**
 * Whether money writes populate the integer minor-unit columns alongside the
 * legacy numeric ones.
 *
 * Dual-write is the normal production behaviour during the money migration
 * (Phases 3–4): it is **ON by default and needs no environment configuration**.
 * The legacy and minor columns are always written together in a single row
 * upsert, so the two representations can never diverge.
 *
 * EMERGENCY KILL-SWITCH: if a regression is discovered, set BOTH
 * `MONEY_DUAL_WRITE=false` and `NEXT_PUBLIC_MONEY_DUAL_WRITE=false` (then
 * redeploy) to fall back to writing only the legacy columns. Reads already
 * tolerate a null minor column (see lib/money/read.ts), so disabling is safe.
 *
 * ⚠️ TEMPORARY — REMOVAL MILESTONE: dual-write is migration scaffolding, not a
 * permanent feature. It MUST be deleted at **Phase 5 (Contract)**, when the
 * legacy numeric columns are dropped and `*_minor` becomes the sole source of
 * truth. At that point this function, the flag, and the legacy branch in
 * `moneyField`/`currencyFields` all go away, and callers write minor units
 * unconditionally. See supabase/README.md and the money-migration status note.
 */
export function isMoneyDualWriteEnabled(): boolean {
  // On unless explicitly disabled. Checked on both server (MONEY_DUAL_WRITE)
  // and client (NEXT_PUBLIC_MONEY_DUAL_WRITE, inlined at build time) because
  // money is written from both; set both to "false" together to kill-switch.
  return process.env.MONEY_DUAL_WRITE !== "false" && process.env.NEXT_PUBLIC_MONEY_DUAL_WRITE !== "false";
}

/**
 * Convert a value crossing an external boundary (e.g. a Plaid decimal) into
 * exact minor units. Returns null — never throws — when the amount is absent or
 * the currency isn't in our registry, so ingestion can never crash on an
 * unexpected currency. A null result means "persist the legacy value only, skip
 * the minor representation" (safe during the additive phases, where the minor
 * columns are nullable).
 */
export function moneyFromExternal(amount: number | null | undefined, currency: string): Money | null {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return null;
  if (!isSupportedCurrency(currency)) {
    console.error(
      `[money] unsupported currency "${currency}" at ingestion boundary; storing legacy value only. Add it to lib/money/currencies.ts.`
    );
    return null;
  }
  return Money.fromExternalNumber(amount, currency);
}

/**
 * Column fragment for one money field on a row write. The legacy numeric column
 * is always written, as an exact decimal string (never a float). When dual-write
 * is on and the amount is representable, `<base>_minor` is written too.
 *
 * Pass the raw external amount and the row's currency; conversion and the flag
 * check happen here so call sites stay declarative.
 */
export function moneyField(
  base: string,
  amount: number | null | undefined,
  currency: string,
  dualWrite: boolean = isMoneyDualWriteEnabled()
): Record<string, string | null> {
  const money = moneyFromExternal(amount, currency);
  const legacy = money ? money.toDecimalString() : amount === null || amount === undefined ? null : String(amount);
  const fragment: Record<string, string | null> = { [base]: legacy };
  if (dualWrite && money) fragment[`${base}_minor`] = money.toMinor().toString();
  return fragment;
}

/**
 * Row-level currency columns, written once per row alongside its money fields.
 * Empty when dual-write is off or the currency is unknown, so we never write a
 * currency_code/scale pair that would violate the composite FK.
 */
export function currencyFields(
  currency: string,
  dualWrite: boolean = isMoneyDualWriteEnabled()
): Record<string, string | number> {
  if (!dualWrite || !isSupportedCurrency(currency)) return {};
  return { currency_code: currency, scale: getCurrency(currency).scale };
}
