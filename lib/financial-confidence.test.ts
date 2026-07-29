import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getFinancialConfidence } from "./financial-confidence";

const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

/**
 * Minimal chainable Supabase mock. Each from(table) returns a thenable builder
 * that resolves to canned data; upsert() is recorded so we can assert whether a
 * write happened. Query filter methods are no-ops (RLS/user scoping is not what
 * these tests exercise).
 */
function mockSupabase(snapshots: Array<Record<string, unknown>>) {
  const upsertCalls: Array<{ table: string }> = [];
  const dataByTable: Record<string, { data: unknown }> = {
    financial_confidence_snapshots: { data: snapshots },
    // A $1,000 checking balance on the cache-miss path.
    accounts: {
      data: [{ current_balance_minor: 100000, currency_code: "USD", type: "depository", subtype: "checking" }],
    },
    transactions: { data: [] },
    recurring_transactions: { data: [] },
  };
  const from = (table: string) => {
    const result = dataByTable[table] ?? { data: [] };
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      gte: () => builder,
      lte: () => builder,
      order: () => builder,
      limit: () => builder,
      upsert: () => {
        upsertCalls.push({ table });
        return Promise.resolve({ error: null });
      },
      then: (resolve: (v: unknown) => unknown) => resolve(result),
    };
    return builder;
  };
  return { supabase: { from } as unknown as SupabaseClient, upsertCalls };
}

describe("getFinancialConfidence — daily read-through cache", () => {
  it("CACHE HIT: today's snapshot exists → returns it, writes nothing", async () => {
    const { supabase, upsertCalls } = mockSupabase([
      { score: 82, safe_to_spend_minor: 88000, currency_code: "USD", snapshot_date: today },
      { score: 78, safe_to_spend_minor: 80000, currency_code: "USD", snapshot_date: yesterday },
    ]);

    const result = await getFinancialConfidence(supabase, "user-1");

    expect(result.score).toBe(82);
    expect(result.safeToSpend).toBe(880); // read from safe_to_spend_minor, exact
    expect(result.previousScore).toBe(78);
    expect(result.isImproving).toBe(true);
    expect(result.isFirstReading).toBe(false);
    expect(upsertCalls).toHaveLength(0); // NO write on a cache hit — the F-3 fix
  });

  it("CACHE MISS: no snapshot for today → computes and writes exactly once", async () => {
    const { supabase, upsertCalls } = mockSupabase([
      { score: 70, safe_to_spend_minor: 50000, currency_code: "USD", snapshot_date: yesterday },
    ]);

    const result = await getFinancialConfidence(supabase, "user-1");

    expect(upsertCalls).toHaveLength(1); // written once, first read of the day
    expect(upsertCalls[0].table).toBe("financial_confidence_snapshots");
    expect(result.safeToSpend).toBe(1000); // computed live from the $1,000 balance
    expect(result.previousScore).toBe(70); // prior day's snapshot
    expect(typeof result.score).toBe("number");
  });

  it("CACHE MISS on a brand-new user (no snapshots) → first reading, one write", async () => {
    const { supabase, upsertCalls } = mockSupabase([]);

    const result = await getFinancialConfidence(supabase, "user-1");

    expect(upsertCalls).toHaveLength(1);
    expect(result.previousScore).toBeNull();
    expect(result.isFirstReading).toBe(true);
    expect(result.isImproving).toBe(false);
  });

  it("does not treat a cached score of 0 as a miss (falsy-0 guard)", async () => {
    const { supabase, upsertCalls } = mockSupabase([
      { score: 0, safe_to_spend_minor: 0, currency_code: "USD", snapshot_date: today },
    ]);

    const result = await getFinancialConfidence(supabase, "user-1");

    expect(result.score).toBe(0);
    expect(upsertCalls).toHaveLength(0); // a real 0 is still a cache hit
  });
});
