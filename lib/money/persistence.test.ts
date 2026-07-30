import { describe, it, expect } from "vitest";
import { moneyField, moneyFieldFromMoney, currencyFields, moneyFromExternal } from "./persistence";
import { Money } from "./money";

describe("moneyField (minor-only — legacy columns dropped in Phase 5)", () => {
  it("writes only the integer <base>_minor column, as an exact string", () => {
    expect(moneyField("amount", 12.34, "USD")).toEqual({ amount_minor: "1234" });
    // classic float that must not leak into storage
    expect(moneyField("amount", 0.1 + 0.2, "USD")).toEqual({ amount_minor: "30" });
  });

  it("never emits the legacy numeric column", () => {
    const frag = moneyField("current_balance", 1000, "USD");
    expect(frag).toEqual({ current_balance_minor: "100000" });
    expect("current_balance" in frag).toBe(false);
  });

  it("respects currency scale for the minor column", () => {
    expect(moneyField("amount", 1000, "JPY")).toEqual({ amount_minor: "1000" });
    expect(moneyField("amount", 1.234, "KWD")).toEqual({ amount_minor: "1234" });
  });

  it("idempotent: identical input yields identical column fragments (safe to retry)", () => {
    expect(moneyField("amount", 19.99, "USD")).toEqual(moneyField("amount", 19.99, "USD"));
  });

  it("writes minor: null for an absent amount", () => {
    expect(moneyField("available_balance", null, "USD")).toEqual({ available_balance_minor: null });
    expect(moneyField("available_balance", undefined, "USD")).toEqual({ available_balance_minor: null });
  });

  it("unsupported currency writes minor: null (never crashes ingestion)", () => {
    expect(moneyField("amount", 9.99, "XYZ")).toEqual({ amount_minor: null });
  });
});

describe("moneyFieldFromMoney (copy an already-exact Money into a row)", () => {
  it("writes the Money's minor units directly, no float round-trip", () => {
    expect(moneyFieldFromMoney("balance", Money.ofMinor(100000, "USD"))).toEqual({ balance_minor: "100000" });
    expect(moneyFieldFromMoney("balance", Money.zero("USD"))).toEqual({ balance_minor: "0" });
  });
  it("writes minor: null for a null value", () => {
    expect(moneyFieldFromMoney("balance", null)).toEqual({ balance_minor: null });
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

describe("currencyFields (always written for a supported currency)", () => {
  it("emits currency_code + registry scale", () => {
    expect(currencyFields("USD")).toEqual({ currency_code: "USD", scale: 2 });
    expect(currencyFields("JPY")).toEqual({ currency_code: "JPY", scale: 0 });
    expect(currencyFields("KWD")).toEqual({ currency_code: "KWD", scale: 3 });
  });
  it("is empty for an unsupported currency, never violating the FK", () => {
    expect(currencyFields("XYZ")).toEqual({});
  });
});
