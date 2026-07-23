import { describe, it, expect } from "vitest";
import { Money, Rounding } from "./money";
import { getCurrency, UnknownCurrencyError } from "./currencies";

describe("currency registry", () => {
  it("knows the standard minor-unit exceptions, never assuming 2", () => {
    expect(getCurrency("USD").scale).toBe(2);
    expect(getCurrency("JPY").scale).toBe(0);
    expect(getCurrency("KWD").scale).toBe(3);
  });

  it("rejects unknown currencies instead of defaulting a scale", () => {
    expect(() => getCurrency("XYZ")).toThrow(UnknownCurrencyError);
    expect(() => Money.ofMinor(100, "XYZ")).toThrow(UnknownCurrencyError);
  });
});

describe("construction and exact representation", () => {
  it("stores minor units verbatim", () => {
    expect(Money.ofMinor(1234, "USD").toMinor()).toBe(BigInt(1234));
    expect(Money.ofMinor("9007199254740993", "USD").toMinor()).toBe(BigInt("9007199254740993"));
  });

  it("rejects non-integer or unsafe number minor units", () => {
    expect(() => Money.ofMinor(12.5, "USD")).toThrow();
    expect(() => Money.ofMinor(Number.MAX_SAFE_INTEGER + 1, "USD")).toThrow();
  });

  it("parses decimal strings exactly per currency scale", () => {
    expect(Money.fromDecimalString("12.34", "USD").toMinor()).toBe(BigInt(1234));
    expect(Money.fromDecimalString("-0.05", "USD").toMinor()).toBe(BigInt(-5));
    expect(Money.fromDecimalString("1234", "JPY").toMinor()).toBe(BigInt(1234));
    expect(Money.fromDecimalString("1.234", "KWD").toMinor()).toBe(BigInt(1234));
    expect(Money.fromDecimalString("100", "USD").toMinor()).toBe(BigInt(10000));
  });

  it("rejects malformed decimal strings", () => {
    expect(() => Money.fromDecimalString("12.3.4", "USD")).toThrow();
    expect(() => Money.fromDecimalString("abc", "USD")).toThrow();
  });
});

describe("float boundary conversion (Plaid)", () => {
  it("converts external numbers without float leakage", () => {
    // 12.34 is not exactly representable; naive *100 gives 1233.9999999999998.
    expect(Money.fromExternalNumber(12.34, "USD").toMinor()).toBe(BigInt(1234));
    expect(Money.fromExternalNumber(0.1 + 0.2, "USD").toMinor()).toBe(BigInt(30)); // 0.30, not 0.30000000000000004
    expect(Money.fromExternalNumber(19.99, "USD").toMinor()).toBe(BigInt(1999));
    expect(Money.fromExternalNumber(1000, "JPY").toMinor()).toBe(BigInt(1000));
  });

  it("rejects non-finite external input", () => {
    expect(() => Money.fromExternalNumber(NaN, "USD")).toThrow();
    expect(() => Money.fromExternalNumber(Infinity, "USD")).toThrow();
  });
});

describe("deterministic arithmetic (no float)", () => {
  it("adds and subtracts exactly, even where floats drift", () => {
    // The classic 0.1 + 0.2 !== 0.3 float failure, done right.
    const sum = Money.fromDecimalString("0.10", "USD").add(Money.fromDecimalString("0.20", "USD"));
    expect(sum.toDecimalString()).toBe("0.30");
    expect(sum.toMinor()).toBe(BigInt(30));

    const many = Array.from({ length: 10 }, () => Money.fromDecimalString("0.10", "USD"));
    const total = many.reduce((acc, m) => acc.add(m), Money.zero("USD"));
    expect(total.toDecimalString()).toBe("1.00"); // float would give 0.9999999999999999
  });

  it("negates, abs, and multiplies by integer scalars", () => {
    const m = Money.ofMinor(-1500, "USD");
    expect(m.abs().toMinor()).toBe(BigInt(1500));
    expect(m.negate().toMinor()).toBe(BigInt(1500));
    expect(Money.ofMinor(199, "USD").multiply(3).toMinor()).toBe(BigInt(597));
  });

  it("refuses to mix currencies", () => {
    expect(() => Money.ofMinor(100, "USD").add(Money.ofMinor(100, "EUR"))).toThrow(/mismatched/i);
    expect(() => Money.ofMinor(100, "USD").compare(Money.ofMinor(100, "EUR"))).toThrow();
  });

  it("is deterministic: identical inputs yield identical outputs", () => {
    const a = () => Money.fromDecimalString("33.33", "USD").multiply(7).subtract(Money.ofMinor(1, "USD"));
    expect(a().toMinor()).toBe(a().toMinor());
    expect(a().toMinor()).toBe(BigInt(23330)); // 3333*7 - 1
  });
});

describe("allocation (penny-safe splitting for budgets/transfers)", () => {
  it("splits without losing or inventing units", () => {
    const parts = Money.ofMinor(1000, "USD").allocate([1, 1, 1]); // $10 / 3
    expect(parts.map((p) => p.toMinor())).toEqual([BigInt(334), BigInt(333), BigInt(333)]);
    const reassembled = parts.reduce((acc, p) => acc.add(p), Money.zero("USD"));
    expect(reassembled.toMinor()).toBe(BigInt(1000)); // sums back exactly
  });

  it("splits by weight and always reconciles to the original", () => {
    const cases: Array<[number, number[]]> = [
      [10000, [1, 1, 1, 1, 1, 1, 1]],
      [9999, [2, 3, 5]],
      [1, [1, 1, 1]],
      [12345, [10, 20, 70]],
    ];
    for (const [minor, weights] of cases) {
      const parts = Money.ofMinor(minor, "USD").allocate(weights);
      const sum = parts.reduce((acc, p) => acc.add(p), Money.zero("USD"));
      expect(sum.toMinor()).toBe(BigInt(minor));
      expect(parts).toHaveLength(weights.length);
    }
  });

  it("handles negative totals without leaking a unit", () => {
    const parts = Money.ofMinor(-1000, "USD").allocate([1, 1, 1]);
    const sum = parts.reduce((acc, p) => acc.add(p), Money.zero("USD"));
    expect(sum.toMinor()).toBe(BigInt(-1000));
  });

  it("rejects degenerate weights", () => {
    expect(() => Money.ofMinor(100, "USD").allocate([])).toThrow();
    expect(() => Money.ofMinor(100, "USD").allocate([0, 0])).toThrow();
    expect(() => Money.ofMinor(100, "USD").allocate([-1, 2])).toThrow();
  });
});

describe("rounding modes (only when precision exceeds scale)", () => {
  it("HALF_EVEN rounds ties to even", () => {
    expect(Money.fromDecimalString("0.125", "USD", Rounding.HALF_EVEN).toMinor()).toBe(BigInt(12)); // 0.12 (even)
    expect(Money.fromDecimalString("0.135", "USD", Rounding.HALF_EVEN).toMinor()).toBe(BigInt(14)); // 0.14 (even)
  });

  it("HALF_UP rounds ties away from zero", () => {
    expect(Money.fromDecimalString("0.125", "USD", Rounding.HALF_UP).toMinor()).toBe(BigInt(13));
  });

  it("DOWN truncates toward zero", () => {
    expect(Money.fromDecimalString("0.129", "USD", Rounding.DOWN).toMinor()).toBe(BigInt(12));
  });

  it("rounds up past the tie", () => {
    expect(Money.fromDecimalString("0.126", "USD", Rounding.HALF_EVEN).toMinor()).toBe(BigInt(13));
  });
});

describe("serialization and display (presentation layer only)", () => {
  it("round-trips exact decimal strings per scale", () => {
    expect(Money.ofMinor(1234, "USD").toDecimalString()).toBe("12.34");
    expect(Money.ofMinor(1234, "JPY").toDecimalString()).toBe("1234");
    expect(Money.ofMinor(1234, "KWD").toDecimalString()).toBe("1.234");
    expect(Money.ofMinor(-5, "USD").toDecimalString()).toBe("-0.05");
    expect(Money.ofMinor(0, "USD").toDecimalString()).toBe("0.00");
  });

  it("survives JSON round-trip without precision loss", () => {
    const m = Money.ofMinor("9007199254740993", "USD"); // beyond Number.MAX_SAFE_INTEGER
    const restored = Money.fromJSON(JSON.parse(JSON.stringify(m)));
    expect(restored.toMinor()).toBe(m.toMinor());
    expect(restored.equals(m)).toBe(true);
  });

  it("formats for locale display via Intl", () => {
    expect(Money.ofMinor(123456, "USD").format("en-US")).toBe("$1,234.56");
    expect(Money.ofMinor(1000, "JPY").format("en-US")).toBe("¥1,000");
  });
});
