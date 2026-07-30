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
| **4b. Legacy removal** | Code writes minor-only; all reads on `*_minor`; dual-write flag deleted. Relax migration (`…222000_relax_legacy`) drops legacy `NOT NULL`. | 🏗️ Built (`refactor/remove-legacy-money-columns`), pending deploy+bake |
| **5. Contract** | Migration: `*_minor` `NOT NULL`; drop old numeric + legacy `currency` columns. Point of no return — only after 4b bakes. | ⬜ Pending bake |

## Legacy removal → Phase 5 sequencing

Dual-write scaffolding has been **removed** (branch `refactor/remove-legacy-money-columns`). Money writes are now **minor-only**: `moneyField` writes just `<base>_minor`, `currencyFields` always writes `currency_code`/`scale` for a supported currency, and the `MONEY_DUAL_WRITE` / `NEXT_PUBLIC_MONEY_DUAL_WRITE` flag + `isMoneyDualWriteEnabled` are gone. Every read path consumes `*_minor` (via `moneyFromRow` / `sumRows` / `moneyNumber`); no code, export, or AI-context builder references a legacy numeric or legacy `currency` column. This applies identically to the web app and the iOS/App Store build (Capacitor WebView of `moneyos.dev` — same served bundle; no native money config).

**Strict deploy order (do not deviate):**

1. **Apply `20260729222000_money_phase5a_relax_legacy.sql`** — drops `NOT NULL` on every legacy money column + the legacy `currency` columns. Safe/non-destructive; required so minor-only inserts don't violate `NOT NULL`. Apply this **before** deploying the legacy-free code.
2. **Deploy the legacy-removal code** (this branch).
3. **Bake** — observe the success criteria below (esp. zero `money_write_failed`) over the agreed window. Because writes are minor-only, verification must run against **staging with the legacy columns dropped** (or nulled), since the change to the `select` lists cannot be statically proven — an old row's legacy column is simply no longer read.
4. **Apply `20260729222649_money_phase5_contract.sql`** (contract) — re-backfills any gap rows, hard-asserts zero data loss, sets `*_minor` `NOT NULL`, then drops the legacy columns. Point of no return.

**Rollback:** before step 4, a normal `git revert` of the legacy-removal PR restores dual-write; the relax migration needs no reversal (it only loosens constraints). After step 4, use `supabase/rollbacks/20260729222649_...down.sql` (reconstructs legacy = `minor / 10^scale`).

**Before the contract migration can run:** re-backfill any rows written while dual-write was off (minor NULL) so no value is lost when the legacy column is dropped. Query pattern: `... WHERE <legacy> IS NOT NULL AND <minor> IS NULL`. (Prod was at 0 gap rows as of 2026-07-29.)

### Success criteria for removing dual-write (single source of truth)

Do **not** drop the legacy write path (Phase 5) until **all** of the following hold. This checklist is authoritative — nothing else should gate the removal:

- [ ] **100% of production data migrated & verified** — every money row has a non-null `*_minor`; zero gap rows across all tables.
- [ ] **Reconciliation reports zero mismatches** — `minor == round(legacy × 10^scale)` for every row (`node` reconciliation job over all money columns).
- [ ] **All reads use minor units exclusively** — no read path consumes a legacy numeric column. (Server read paths verified on the `feat/money-dual-write-default-on` branch: dashboard, analytics, mo page + chat, transactions, accounts, goals, loans, subscriptions, reviews, financial-confidence.)
- [ ] **No legacy dependencies remain** — no code, export, report, or AI-context builder references the legacy `<amount>` / `<balance>` columns.
- [ ] **Stable production behavior over the observation period** — 24–48h (or agreed window) with **zero `money_write_failed`** log events under normal traffic.
- [ ] **Rollback no longer depends on the legacy representation** — the kill-switch and any rollback plan operate without needing the old columns.

Only when every box is checked: run the Phase 5 migration (`NOT NULL` + drop legacy columns) **and** delete the dual-write code (flag, `isMoneyDualWriteEnabled`, legacy branches of `moneyField`/`currencyFields`, structured-log call sites that reference dual-write state) in the same change.

### Post-Phase-5 audit (required)

After Phase 5, run a comprehensive audit — **financial correctness, database consistency, performance, security, scalability, App Store production readiness** — then proceed with the remaining high-priority security findings in order: **F-2** (explicit `user_id` filters on every user-scoped query), **F-3** (Financial Confidence caching to end recompute-on-read), **F-7** (security headers: HSTS, CSP, `nosniff`, `X-Frame-Options: DENY`) before public launch.

### Phase 1 safety summary

- **Additive only** — no existing column altered/dropped; the app keeps running unchanged after apply.
- **Atomic** — single transaction; a failure rolls back everything.
- **Self-verifying** — re-derives every backfilled total from the untouched source columns and aborts if any minor-unit sum fails to reconcile.
- **Verified lossless before authoring** — every stored money value is a whole minor unit (no sub-cent precision) and every row is USD, so each value converts exactly.
- **Integrity-enforced** — composite FK `(currency_code, scale) → currencies(code, scale)` makes it impossible for a row's scale to drift from its currency.

The application-side domain (`lib/money`, ISO 4217 registry + `Money` value object) mirrors `currencies` here and is unit-tested (`npm test`).
