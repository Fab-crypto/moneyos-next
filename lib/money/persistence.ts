import { Money } from "./money";
import { getCurrency, isSupportedCurrency } from "./currencies";

/**
 * Convert a value crossing an external boundary (e.g. a Plaid decimal) into
 * exact minor units. Returns null — never throws — when the amount is absent or
 * the currency isn't in our registry, so ingestion can never crash on an
 * unexpected currency. A null result means the minor column is written null
 * (the value could not be represented; logged above).
 */
export function moneyFromExternal(amount: number | null | undefined, currency: string): Money | null {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return null;
  if (!isSupportedCurrency(currency)) {
    console.error(
      `[money] unsupported currency "${currency}" at ingestion boundary; cannot store minor units. Add it to lib/money/currencies.ts.`
    );
    return null;
  }
  return Money.fromExternalNumber(amount, currency);
}

/**
 * Column fragment for one money field on a row write. Writes only the integer
 * `<base>_minor` column — minor units are the sole source of truth (the legacy
 * numeric columns were dropped in Phase 5). The value is an exact minor-unit
 * string (never a float); null when the amount is absent or unrepresentable.
 */
export function moneyField(base: string, amount: number | null | undefined, currency: string): Record<string, string | null> {
  const money = moneyFromExternal(amount, currency);
  return { [`${base}_minor`]: money ? money.toMinor().toString() : null };
}

/**
 * Column fragment for a money field sourced from an existing exact `Money`
 * (already integer minor units) rather than an external decimal — e.g. when
 * copying a value read from one row into another. Skips the lossy
 * decimal→float→minor round-trip `moneyField` would do. Writes null for a null
 * value.
 */
export function moneyFieldFromMoney(base: string, money: Money | null): Record<string, string | null> {
  return { [`${base}_minor`]: money ? money.toMinor().toString() : null };
}

/**
 * Row-level currency columns written once per row alongside its money fields.
 * Empty only for an unsupported currency, so we never write a currency_code/scale
 * pair that would violate the composite FK to `currencies`.
 */
export function currencyFields(currency: string): Record<string, string | number> {
  if (!isSupportedCurrency(currency)) return {};
  return { currency_code: currency, scale: getCurrency(currency).scale };
}
