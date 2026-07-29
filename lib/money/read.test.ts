import { describe, it, expect, vi } from "vitest";
import { moneyFromRow, sumRows } from "./read";

describe("moneyFromRow", () => {
  it("prefers the exact minor column", () => {
    const row = { current_balance: 12.34, current_balance_minor: 1234, currency_code: "USD" };
    expect(moneyFromRow(row, "current_balance")?.toMinor()).toBe(BigInt(1234));
  });

  it("accepts a string minor value (large bigint from PostgREST)", () => {
    const row = { amount_minor: "9007199254740993", currency_code: "USD" };
    expect(moneyFromRow(row, "amount")?.toMinor()).toBe(BigInt("9007199254740993"));
  });

  it("falls back to the legacy numeric column when minor is null", () => {
    const row = { amount: 19.99, amount_minor: null, currency_code: "USD" };
    expect(moneyFromRow(row, "amount")?.toMinor()).toBe(BigInt(1999));
  });

  it("falls back when the minor key is entirely absent", () => {
    const row = { amount: 5, currency_code: "USD" };
    expect(moneyFromRow(row, "amount")?.toMinor()).toBe(BigInt(500));
  });

  it("returns null only when both minor and legacy are null", () => {
    expect(moneyFromRow({ amount: null, amount_minor: null, currency_code: "USD" }, "amount")).toBeNull();
  });

  it("reads the row currency and respects its scale", () => {
    expect(moneyFromRow({ amount_minor: 1000, currency_code: "JPY" }, "amount")?.toDecimalString()).toBe("1000");
    expect(moneyFromRow({ amount_minor: 1234, currency_code: "KWD" }, "amount")?.toDecimalString()).toBe("1.234");
  });

  it("uses the fallback currency when the row has none", () => {
    expect(moneyFromRow({ amount_minor: 1234 }, "amount", { fallbackCurrency: "USD" })?.currency).toBe("USD");
  });

  it("treats a minor value of 0 as a real zero, NOT as absent (falsy-0 bug guard)", () => {
    // A naive `if (minor)` would skip 0 and fall through to legacy 5.00 → wrong.
    const row = { amount: 5.0, amount_minor: 0, currency_code: "USD" };
    expect(moneyFromRow(row, "amount")?.toMinor()).toBe(BigInt(0));
  });
});

describe("moneyFromRow — resilience (a bad row must never crash a render)", () => {
  it("does not throw on an unsupported currency_code; degrades to legacy", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    // 'XYZ' isn't in the registry: the minor path can't build Money, so it must
    // fall through to legacy (which also can't interpret XYZ → null) WITHOUT throwing.
    expect(() => moneyFromRow({ amount_minor: 100, amount: 1.0, currency_code: "XYZ" }, "amount")).not.toThrow();
    expect(moneyFromRow({ amount_minor: 100, amount: 1.0, currency_code: "XYZ" }, "amount")).toBeNull();
    spy.mockRestore();
  });

  it("degrades a non-integer minor value to the legacy column instead of throwing", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const m = moneyFromRow({ amount_minor: 12.5, amount: 12.34, currency_code: "USD" }, "amount");
    expect(m?.toMinor()).toBe(BigInt(1234)); // used the legacy value
    spy.mockRestore();
  });
});

describe("sumRows (exact aggregation — the operation floats used to corrupt)", () => {
  it("sums minor values with no float drift", () => {
    const rows = Array.from({ length: 10 }, () => ({ amount_minor: 10, currency_code: "USD" })); // 10 × $0.10
    expect(sumRows(rows, "amount", "USD").toDecimalString()).toBe("1.00"); // float would give 0.9999999999999999
  });

  it("sums a mix of exact-minor and legacy-fallback rows correctly", () => {
    const rows = [
      { amount: 0.1, amount_minor: 10, currency_code: "USD" }, // exact path
      { amount: 0.2, amount_minor: null, currency_code: "USD" }, // legacy fallback
    ];
    expect(sumRows(rows, "amount", "USD").toDecimalString()).toBe("0.30");
  });

  it("applies a filter and skips null-value rows", () => {
    const rows = [
      { amount_minor: 500, type: "expense", currency_code: "USD" },
      { amount_minor: 300, type: "income", currency_code: "USD" },
      { amount_minor: null, amount: null, type: "expense", currency_code: "USD" },
    ];
    const total = sumRows(rows, "amount", "USD", { filter: (r) => r.type === "expense" });
    expect(total.toMinor()).toBe(BigInt(500));
  });

  it("returns zero in the given currency when nothing sums", () => {
    const total = sumRows([], "amount", "USD");
    expect(total.isZero()).toBe(true);
    expect(total.currency).toBe("USD");
  });
});
