# MoneyOS database migrations

Versioned SQL migrations applied with the [Supabase CLI](https://supabase.com/docs/guides/cli). Migrations are the **only** sanctioned way the production schema changes — no ad-hoc SQL against prod.

## Applying migrations

```bash
# one-time: install the CLI and link to the project
brew install supabase/tap/supabase
supabase link --project-ref abkccdbbdfjrfskrssil

# review what will run, then apply
supabase db push --dry-run
supabase db push
```

`supabase db push` runs every file in `migrations/` not yet recorded in the remote `supabase_migrations.schema_migrations` table, in timestamp order, each in its own transaction.

> **Rule:** review every migration's `--dry-run` output before pushing to production. Prefer testing against a Supabase branch or a staging project first.

## Rollbacks

Migrations are forward-only. For each reversible migration a companion script lives in `rollbacks/`, run manually only if needed:

```bash
psql "$DATABASE_URL" -f supabase/rollbacks/<timestamp>_<name>.down.sql
```

---

## Money representation migration — the 5-phase plan

Moving money from `numeric` (deserialized to lossy JS floats in the app) to integer minor units. Done as a parallel-change sequence so every step is independently deployable and reversible; the old columns stay authoritative until the very end.

| Phase | Migration / change | Status |
|-------|--------------------|--------|
| **1. Expand** | `20260723101126_money_phase1_expand.sql` — add `currencies` table + nullable `*_minor` / `currency_code` / `scale` columns; backfill losslessly; self-verify. | ✅ **Applied + verified in prod** |
| **2. Backfill hardening** | Folded into Phase 1 (self-verifying reconciliation block). | ✅ Done |
| **3. Dual-write** | App code writes **both** old numeric and new `*_minor` in one atomic row upsert. **On by default in code** (no env needed). | ✅ Deployed |
| **4. Cutover** | App reads switch to `*_minor` via `lib/money/read` (with legacy fallback). | ✅ Deployed |
| **5. Contract** | New migration: `*_minor` / `currency_code` `NOT NULL`; drop old numeric + legacy `currency` columns. **Delete dual-write code here.** Point of no return — only after bake. | ⬜ Pending bake |

## Dual-write: kill-switch, rollback, and removal

Dual-write (Phase 3) is **on by default in application code** — `isMoneyDualWriteEnabled()` in `lib/money/persistence.ts` returns true with no env configuration. This removes any dependency on a Vercel flag for the normal path. It applies identically to the **web app and the iOS/App Store build**: the iOS app is a Capacitor WebView of `moneyos.dev` (see `capacitor.config.ts`), so it runs the same deployed server + client code — server-side money writes (Plaid sync, confidence, loans, recurring) dual-write regardless of client, and client-side writes (goals, profile) use the same served bundle. There is no native-side money config to set or mis-set.

**Emergency kill-switch (temporary rollback):** if a regression appears, set **both** env vars and redeploy:

```
MONEY_DUAL_WRITE=false
NEXT_PUBLIC_MONEY_DUAL_WRITE=false
```

Writes then populate only the legacy numeric columns. This is safe because reads (`lib/money/read.ts`) already fall back to the legacy column when `*_minor` is null. `NEXT_PUBLIC_` requires a **rebuild** (uncheck "use existing build cache") since it is inlined at build time; the server flag takes effect on any redeploy. Full rollback of the code change is a normal `git revert` of the dual-write PR.

**⚠️ Removal milestone (Phase 5):** dual-write is temporary migration scaffolding, not a permanent feature. When Phase 5 drops the legacy numeric columns and `*_minor` becomes the sole source of truth, **delete** `isMoneyDualWriteEnabled`, the `MONEY_DUAL_WRITE` / `NEXT_PUBLIC_MONEY_DUAL_WRITE` flags, and the legacy branch of `moneyField` / `currencyFields`; call sites then write minor units unconditionally. Do not leave the flag hard-coded in the codebase past Phase 5.

**Before Phase 5 can run:** re-backfill any rows written while dual-write was off (minor NULL) so no value is lost when the legacy column is dropped. Query pattern: `... WHERE <legacy> IS NOT NULL AND <minor> IS NULL`.

### Phase 1 safety summary

- **Additive only** — no existing column altered/dropped; the app keeps running unchanged after apply.
- **Atomic** — single transaction; a failure rolls back everything.
- **Self-verifying** — re-derives every backfilled total from the untouched source columns and aborts if any minor-unit sum fails to reconcile.
- **Verified lossless before authoring** — every stored money value is a whole minor unit (no sub-cent precision) and every row is USD, so each value converts exactly.
- **Integrity-enforced** — composite FK `(currency_code, scale) → currencies(code, scale)` makes it impossible for a row's scale to drift from its currency.

The application-side domain (`lib/money`, ISO 4217 registry + `Money` value object) mirrors `currencies` here and is unit-tested (`npm test`).
