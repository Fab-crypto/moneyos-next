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

describe("dual-write flag", () => {
  it("is off unless explicitly enabled", () => {
    delete process.env.MONEY_DUAL_WRITE;
    delete process.env.NEXT_PUBLIC_MONEY_DUAL_WRITE;
    expect(isMoneyDualWriteEnabled()).toBe(false);
    process.env.MONEY_DUAL_WRITE = "false";
    expect(isMoneyDualWriteEnabled()).toBe(false);
    process.env.MONEY_DUAL_WRITE = "true";
    expect(isMoneyDualWriteEnabled()).toBe(true);
  });

  it("is enabled by the client (NEXT_PUBLIC) flag too, for client-side writes", () => {
    delete process.env.MONEY_DUAL_WRITE;
    process.env.NEXT_PUBLIC_MONEY_DUAL_WRITE = "true";
    expect(isMoneyDualWriteEnabled()).toBe(true);
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
