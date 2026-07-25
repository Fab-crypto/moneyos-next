import { Money } from "./money";
import { getCurrency, isSupportedCurrency } from "./currencies";

/**
 * Dual-write flag for the money-representation migration.
 *
 * OFF (default) reproduces the exact pre-migration behaviour — only the legacy
 * numeric columns are written — so every caller of the helpers below is safe to
 * deploy *before* the Phase 1 schema migration lands. After the migration is
 * applied and reconciled, set MONEY_DUAL_WRITE=true and writes begin populating
 * the new integer minor-unit columns alongside the legacy ones. Reads do not
 * change until the later cutover phase.
 */
export function isMoneyDualWriteEnabled(): boolean {
  // Checked on both server (MONEY_DUAL_WRITE) and client
  // (NEXT_PUBLIC_MONEY_DUAL_WRITE), since money is written from both. Set both
  // env vars together when enabling dual-write after the migration lands.
  return process.env.MONEY_DUAL_WRITE === "true" || process.env.NEXT_PUBLIC_MONEY_DUAL_WRITE === "true";
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
