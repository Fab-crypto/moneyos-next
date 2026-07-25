import { describe, it, expect } from "vitest";
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
