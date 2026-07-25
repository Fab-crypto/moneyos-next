import { describe, it, expect, vi, afterEach } from "vitest";
import { logMoneyWriteError } from "./log";

afterEach(() => vi.restoreAllMocks());

describe("logMoneyWriteError (structured failure logging)", () => {
  it("emits a single structured JSON line with queryable fields", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logMoneyWriteError({
      op: "financial_confidence_snapshots.upsert",
      table: "financial_confidence_snapshots",
      userId: "user-123",
      error: new Error("duplicate key value violates unique constraint"),
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload).toMatchObject({
      level: "error",
      event: "money_write_failed",
      op: "financial_confidence_snapshots.upsert",
      table: "financial_confidence_snapshots",
      user_id: "user-123",
      message: "duplicate key value violates unique constraint",
    });
    // dual_write reflects the flag state at failure time — present for triage.
    expect(typeof payload.dual_write).toBe("boolean");
  });

  it("stringifies non-Error throwables and tolerates a missing userId", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logMoneyWriteError({ op: "accounts.update", table: "accounts", error: "PostgREST 500" });
    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload.message).toBe("PostgREST 500");
    expect(payload.user_id).toBeNull();
  });
});
