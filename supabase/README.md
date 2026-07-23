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
| **1. Expand** | `20260723101126_money_phase1_expand.sql` — add `currencies` table + nullable `*_minor` / `currency_code` / `scale` columns; backfill losslessly; self-verify. | **Authored — awaiting review + `db push`** |
| **2. Backfill hardening** | Folded into Phase 1 (self-verifying reconciliation block). | Done |
| **3. Dual-write** | App code writes **both** old numeric and new `*_minor`; reads still use old. Instantly reversible. | Pending Phase 1 applied |
| **4. Cutover** | App reads switch to `*_minor` via the `Money` domain; still dual-writing. Bake. | Pending |
| **5. Contract** | New migration: `*_minor` / `currency_code` `NOT NULL`; drop old numeric + legacy `currency` columns. Point of no return — only after bake. | Pending |

### Phase 1 safety summary

- **Additive only** — no existing column altered/dropped; the app keeps running unchanged after apply.
- **Atomic** — single transaction; a failure rolls back everything.
- **Self-verifying** — re-derives every backfilled total from the untouched source columns and aborts if any minor-unit sum fails to reconcile.
- **Verified lossless before authoring** — every stored money value is a whole minor unit (no sub-cent precision) and every row is USD, so each value converts exactly.
- **Integrity-enforced** — composite FK `(currency_code, scale) → currencies(code, scale)` makes it impossible for a row's scale to drift from its currency.

The application-side domain (`lib/money`, ISO 4217 registry + `Money` value object) mirrors `currencies` here and is unit-tested (`npm test`).
