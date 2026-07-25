import { getCurrency } from "./currencies";

/**
 * Rounding mode for the rare operations that can produce a fractional minor
 * unit (parsing more decimals than a currency's scale, splitting by ratio).
 * HALF_EVEN (banker's rounding) is the financial default — it avoids the
 * upward bias of always rounding .5 away from zero across many operations.
 */
export enum Rounding {
  HALF_EVEN = "HALF_EVEN",
  HALF_UP = "HALF_UP",
  DOWN = "DOWN", // truncate toward zero
}

const TEN = BigInt(10);

function pow10(exp: number): bigint {
  let result = BigInt(1);
  for (let i = 0; i < exp; i++) result *= TEN;
  return result;
}

class CurrencyMismatchError extends Error {
  constructor(a: string, b: string) {
    super(`Cannot operate on mismatched currencies: ${a} vs ${b}. Convert to a common currency first.`);
    this.name = "CurrencyMismatchError";
  }
}

/**
 * An exact, immutable monetary amount stored as integer minor units plus its
 * ISO 4217 currency. There is no floating point anywhere inside: every value
 * is a `bigint` count of the currency's smallest unit (cents, yen, fils), and
 * the currency's `scale` (from the registry) is the only thing that maps it
 * back to a human decimal. Arithmetic is closed over same-currency Money and
 * fully deterministic.
 */
export class Money {
  private constructor(
    /** Integer count of minor units. Negative for debits/outflows. */
    readonly amountMinor: bigint,
    /** ISO 4217 code; guaranteed present in the currency registry. */
    readonly currency: string
  ) {}

  // ── Construction ────────────────────────────────────────────────────────

  /** From a raw minor-unit integer (the DB representation). */
  static ofMinor(amountMinor: bigint | number | string, currency: string): Money {
    getCurrency(currency); // validate scale exists; throws on unknown
    return new Money(toBigIntExact(amountMinor), currency);
  }

  static zero(currency: string): Money {
    getCurrency(currency);
    return new Money(BigInt(0), currency);
  }

  /**
   * Parse a decimal *string* exactly into minor units (e.g. "12.34" USD → 1234).
   * A string is required for exactness — a JS number literal like 12.34 is
   * already a lossy float. Use `fromExternalNumber` at trusted boundaries where
   * the source is inherently a number (Plaid).
   */
  static fromDecimalString(decimal: string, currency: string, rounding = Rounding.HALF_EVEN): Money {
    const { scale } = getCurrency(currency);
    const trimmed = decimal.trim();
    const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(trimmed);
    if (!match) throw new Error(`Invalid decimal string for Money: "${decimal}"`);

    const negative = match[1] === "-";
    const intPart = match[2];
    const fracPart = match[3] ?? "";

    let minor = BigInt(intPart) * pow10(scale);

    if (fracPart.length <= scale) {
      const padded = fracPart.padEnd(scale, "0");
      minor += padded === "" ? BigInt(0) : BigInt(padded);
    } else {
      // More precision than the currency supports — take `scale` digits and
      // round using the remainder, deterministically.
      const keep = fracPart.slice(0, scale);
      const rest = fracPart.slice(scale);
      minor += keep === "" ? BigInt(0) : BigInt(keep);
      minor += roundingIncrement(rest, minor, rounding);
    }

    return new Money(negative ? -minor : minor, currency);
  }

  /**
   * Convert a number from a trusted external boundary (e.g. Plaid returns
   * amounts as JSON decimals) into exact minor units. The number is first
   * rendered to a correctly-rounded decimal string at the currency's scale via
   * toFixed, then parsed exactly — so the float never enters our arithmetic.
   * This is the ONLY sanctioned way a float becomes a Money.
   */
  static fromExternalNumber(amount: number, currency: string): Money {
    if (!Number.isFinite(amount)) throw new Error(`Non-finite amount from external source: ${amount}`);
    const { scale } = getCurrency(currency);
    return Money.fromDecimalString(amount.toFixed(scale), currency);
  }

  // ── Arithmetic (closed over same currency) ──────────────────────────────

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor + other.amountMinor, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor - other.amountMinor, this.currency);
  }

  negate(): Money {
    return new Money(-this.amountMinor, this.currency);
  }

  abs(): Money {
    return this.amountMinor < BigInt(0) ? this.negate() : this;
  }

  /** Multiply by an integer scalar (e.g. quantity). Stays exact. */
  multiply(scalar: bigint | number): Money {
    return new Money(this.amountMinor * toBigIntExact(scalar), this.currency);
  }

  /**
   * Split this amount across integer `weights` with no lost or invented units:
   * the returned parts always sum back to exactly this amount (largest-remainder
   * apportionment). Essential for budgets and even splits.
   */
  allocate(weights: number[]): Money[] {
    if (weights.length === 0) throw new Error("allocate requires at least one weight");
    if (weights.some((w) => w < 0)) throw new Error("allocate weights must be non-negative");
    const total = weights.reduce((s, w) => s + w, 0);
    if (total === 0) throw new Error("allocate weights must not sum to zero");

    const totalBig = BigInt(total);
    const shares: bigint[] = [];
    let distributed = BigInt(0);
    const remainders: { index: number; rem: bigint }[] = [];

    for (let i = 0; i < weights.length; i++) {
      const numerator = this.amountMinor * BigInt(weights[i]);
      // Truncated share toward zero, remainder tracked for fair distribution.
      const share = numerator / totalBig;
      const rem = numerator - share * totalBig;
      shares.push(share);
      distributed += share;
      remainders.push({ index: i, rem: rem < BigInt(0) ? -rem : rem });
    }

    // Distribute the leftover units (one at a time) to the largest remainders.
    let leftover = this.amountMinor - distributed;
    const step = leftover >= BigInt(0) ? BigInt(1) : BigInt(-1);
    remainders.sort((a, b) => (b.rem > a.rem ? 1 : b.rem < a.rem ? -1 : a.index - b.index));
    let r = 0;
    while (leftover !== BigInt(0)) {
      shares[remainders[r % remainders.length].index] += step;
      leftover -= step;
      r++;
    }

    return shares.map((s) => new Money(s, this.currency));
  }

  // ── Comparison ──────────────────────────────────────────────────────────

  compare(other: Money): -1 | 0 | 1 {
    this.assertSameCurrency(other);
    if (this.amountMinor < other.amountMinor) return -1;
    if (this.amountMinor > other.amountMinor) return 1;
    return 0;
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.amountMinor === other.amountMinor;
  }

  greaterThan(other: Money): boolean {
    return this.compare(other) === 1;
  }

  lessThan(other: Money): boolean {
    return this.compare(other) === -1;
  }

  greaterThanOrEqual(other: Money): boolean {
    return this.compare(other) >= 0;
  }

  lessThanOrEqual(other: Money): boolean {
    return this.compare(other) <= 0;
  }

  isZero(): boolean {
    return this.amountMinor === BigInt(0);
  }

  isNegative(): boolean {
    return this.amountMinor < BigInt(0);
  }

  isPositive(): boolean {
    return this.amountMinor > BigInt(0);
  }

  // ── Accessors & serialization ───────────────────────────────────────────

  get scale(): number {
    return getCurrency(this.currency).scale;
  }

  toMinor(): bigint {
    return this.amountMinor;
  }

  /**
   * Exact decimal string for storage/serialization/export — NOT locale display.
   * 1234 USD → "12.34", 1234 JPY → "1234", 1234 KWD → "1.234".
   */
  toDecimalString(): string {
    const { scale } = getCurrency(this.currency);
    const negative = this.amountMinor < BigInt(0);
    const digits = (negative ? -this.amountMinor : this.amountMinor).toString();
    if (scale === 0) return (negative ? "-" : "") + digits;
    const padded = digits.padStart(scale + 1, "0");
    const intPart = padded.slice(0, padded.length - scale);
    const fracPart = padded.slice(padded.length - scale);
    return `${negative ? "-" : ""}${intPart}.${fracPart}`;
  }

  toString(): string {
    return `${this.currency} ${this.toDecimalString()}`;
  }

  /**
   * Localized display string — presentation layer only. This is the one place
   * a float appears, and only to feed Intl for rendering; it never flows back
   * into arithmetic.
   */
  format(locale?: string): string {
    const { scale } = getCurrency(this.currency);
    const displayNumber = Number(this.amountMinor) / Math.pow(10, scale);
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: this.currency,
      minimumFractionDigits: scale,
      maximumFractionDigits: scale,
    }).format(displayNumber);
  }

  /** JSON-safe wire form (bigint as string; the DB column is BIGINT). */
  toJSON(): { amountMinor: string; currency: string } {
    return { amountMinor: this.amountMinor.toString(), currency: this.currency };
  }

  static fromJSON(json: { amountMinor: string | number | bigint; currency: string }): Money {
    return Money.ofMinor(json.amountMinor, json.currency);
  }

  // ── internals ─────────────────────────────────────────────────────────

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) throw new CurrencyMismatchError(this.currency, other.currency);
  }
}

function toBigIntExact(value: bigint | number | string): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "string") {
    if (!/^-?\d+$/.test(value.trim())) throw new Error(`Not an integer minor-unit value: "${value}"`);
    return BigInt(value.trim());
  }
  if (!Number.isInteger(value)) throw new Error(`Minor units must be an integer, got ${value}`);
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Minor-unit value ${value} exceeds safe integer range; pass a bigint or string.`);
  }
  return BigInt(value);
}

/**
 * Given the dropped fractional digits `rest`, the current (magnitude-only
 * relevant) minor value, and a mode, return the +1/0 increment to apply.
 * Operates on the absolute value; the caller re-applies sign.
 */
function roundingIncrement(rest: string, currentMinor: bigint, mode: Rounding): bigint {
  if (mode === Rounding.DOWN) return BigInt(0);
  const firstDropped = rest.charCodeAt(0) - 48; // '0' = 48
  if (firstDropped < 5) return BigInt(0);
  if (firstDropped > 5) return BigInt(1);
  // Exactly at the boundary: does anything nonzero follow the 5?
  const hasMoreThanHalf = /[1-9]/.test(rest.slice(1));
  if (hasMoreThanHalf) return BigInt(1);
  if (mode === Rounding.HALF_UP) return BigInt(1);
  // HALF_EVEN: round to even last kept digit.
  const lastKeptIsOdd = currentMinor % BigInt(2) !== BigInt(0);
  return lastKeptIsOdd ? BigInt(1) : BigInt(0);
}
