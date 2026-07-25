import { describe, it, expect, afterEach } from "vitest";
import { moneyField, currencyFields, moneyFromExternal, isMoneyDualWriteEnabled } from "./persistence";

const original = process.env.MONEY_DUAL_WRITE;
const originalPublic = process.env.NEXT_PUBLIC_MONEY_DUAL_WRITE;
afterEach(() => {
  if (original === undefined) delete process.env.MONEY_DUAL_WRITE;
  else process.env.MONEY_DUAL_WRITE = original;
  if (originalPublic === undefined) delete process.env.NEXT_PUBLIC_MONEY_DUAL_WRITE;
  else process.env.NEXT_PUBLIC_MONEY_DUAL_WRITE = originalPublic;
});

describe("dual-write flag (on by default, kill-switch to disable)", () => {
  it("is ON when no env is configured — the normal production path", () => {
    delete process.env.MONEY_DUAL_WRITE;
    delete process.env.NEXT_PUBLIC_MONEY_DUAL_WRITE;
    expect(isMoneyDualWriteEnabled()).toBe(true);
  });

  it("kill-switch: disabled when both flags are set to \"false\"", () => {
    process.env.MONEY_DUAL_WRITE = "false";
    process.env.NEXT_PUBLIC_MONEY_DUAL_WRITE = "false";
    expect(isMoneyDualWriteEnabled()).toBe(false);
  });

  it("fails safe: either flag set to \"false\" disables (never accidentally half-on)", () => {
    delete process.env.NEXT_PUBLIC_MONEY_DUAL_WRITE;
    process.env.MONEY_DUAL_WRITE = "false";
    expect(isMoneyDualWriteEnabled()).toBe(false);
    delete process.env.MONEY_DUAL_WRITE;
    process.env.NEXT_PUBLIC_MONEY_DUAL_WRITE = "false";
    expect(isMoneyDualWriteEnabled()).toBe(false);
  });

  it("ignores non-\"false\" values — only the literal string disables", () => {
    process.env.MONEY_DUAL_WRITE = "true";
    delete process.env.NEXT_PUBLIC_MONEY_DUAL_WRITE;
    expect(isMoneyDualWriteEnabled()).toBe(true);
    process.env.MONEY_DUAL_WRITE = "0";
    expect(isMoneyDualWriteEnabled()).toBe(true);
  });
});

describe("default-path behaviour + idempotency + atomicity", () => {
  it("success: with no env, moneyField writes BOTH legacy and minor", () => {
    delete process.env.MONEY_DUAL_WRITE;
    delete process.env.NEXT_PUBLIC_MONEY_DUAL_WRITE;
    expect(moneyField("amount", 12.34, "USD")).toEqual({ amount: "12.34", amount_minor: "1234" });
    expect(currencyFields("USD")).toEqual({ currency_code: "USD", scale: 2 });
  });

  it("kill-switch: with both flags false, moneyField writes legacy only", () => {
    process.env.MONEY_DUAL_WRITE = "false";
    process.env.NEXT_PUBLIC_MONEY_DUAL_WRITE = "false";
    expect(moneyField("amount", 12.34, "USD")).toEqual({ amount: "12.34" });
    expect(currencyFields("USD")).toEqual({});
  });

  it("idempotent: identical input yields identical column fragments (safe to retry)", () => {
    delete process.env.MONEY_DUAL_WRITE;
    delete process.env.NEXT_PUBLIC_MONEY_DUAL_WRITE;
    const a = moneyField("amount", 19.99, "USD");
    const b = moneyField("amount", 19.99, "USD");
    expect(a).toEqual(b);
    expect(a).toEqual({ amount: "19.99", amount_minor: "1999" });
  });

  it("atomicity by construction: a minor column is NEVER emitted without its legacy column", () => {
    // Both live in one object spread into a single row upsert, so a partial
    // legacy-without-minor (or minor-without-legacy) row is impossible.
    for (const env of [{}, { MONEY_DUAL_WRITE: "true" }, { MONEY_DUAL_WRITE: "false", NEXT_PUBLIC_MONEY_DUAL_WRITE: "false" }]) {
      delete process.env.MONEY_DUAL_WRITE;
      delete process.env.NEXT_PUBLIC_MONEY_DUAL_WRITE;
      Object.assign(process.env, env);
      const frag = moneyField("current_balance", 1000, "USD");
      const hasMinor = "current_balance_minor" in frag;
      const hasLegacy = "current_balance" in frag;
      expect(hasLegacy).toBe(true); // legacy always written
      if (hasMinor) expect(hasLegacy).toBe(true); // minor only ever alongside legacy
    }
  });
});

describe("moneyFromExternal (boundary conversion, never throws)", () => {
  it("converts a Plaid decimal to exact minor units", () => {
    expect(moneyFromExternal(12.34, "USD")?.toMinor()).toBe(BigInt(1234));
  });
  it("returns null for absent or non-finite amounts", () => {
    expect(moneyFromExternal(null, "USD")).toBeNull();
    expect(moneyFromExternal(undefined, "USD")).toBeNull();
    expect(moneyFromExternal(NaN, "USD")).toBeNull();
  });
  it("returns null (not throw) for an unsupported currency", () => {
    expect(moneyFromExternal(10, "XYZ")).toBeNull();
  });
});

describe("moneyField", () => {
  it("with dual-write OFF writes only the legacy column, as an exact string", () => {
    expect(moneyField("amount", 12.34, "USD", false)).toEqual({ amount: "12.34" });
    // classic float that must not leak into storage
    expect(moneyField("amount", 0.1 + 0.2, "USD", false)).toEqual({ amount: "0.30" });
  });

  it("with dual-write ON writes both legacy and minor", () => {
    expect(moneyField("amount", 12.34, "USD", true)).toEqual({ amount: "12.34", amount_minor: "1234" });
    expect(moneyField("current_balance", 1000, "USD", true)).toEqual({
      current_balance: "1000.00",
      current_balance_minor: "100000",
    });
  });

  it("respects currency scale for the minor column", () => {
    expect(moneyField("amount", 1000, "JPY", true)).toEqual({ amount: "1000", amount_minor: "1000" });
    expect(moneyField("amount", 1.234, "KWD", true)).toEqual({ amount: "1.234", amount_minor: "1234" });
  });

  it("handles null money by writing null and no minor column", () => {
    expect(moneyField("available_balance", null, "USD", true)).toEqual({ available_balance: null });
  });

  it("unsupported currency falls back to legacy-only even when dual-write is on", () => {
    // never crashes ingestion; stores the raw value, skips minor
    expect(moneyField("amount", 9.99, "XYZ", true)).toEqual({ amount: "9.99" });
  });
});

describe("currencyFields", () => {
  it("is empty when dual-write is off", () => {
    expect(currencyFields("USD", false)).toEqual({});
  });
  it("emits currency_code + registry scale when on", () => {
    expect(currencyFields("USD", true)).toEqual({ currency_code: "USD", scale: 2 });
    expect(currencyFields("JPY", true)).toEqual({ currency_code: "JPY", scale: 0 });
    expect(currencyFields("KWD", true)).toEqual({ currency_code: "KWD", scale: 3 });
  });
  it("is empty for an unsupported currency, never violating the FK", () => {
    expect(currencyFields("XYZ", true)).toEqual({});
  });
});
