-- ============================================================================
-- Money — Phase 5a: relax legacy columns to NULLABLE (companion to legacy-removal)
-- ============================================================================
-- The legacy-removal code deploy stops writing EVERY legacy money column (the
-- app now writes only the integer `*_minor` columns + currency_code/scale) and
-- stops writing the legacy per-row `currency` text column. Any of those columns
-- that is currently NOT NULL without a default would make an INSERT that omits
-- it fail. This migration drops NOT NULL on all of them so the legacy-free code
-- is safe to deploy.
--
-- `drop not null` is idempotent-safe: it is a no-op (no error) on a column that
-- is already nullable, so listing every legacy column defensively is correct
-- even where the constraint was already absent. Every column named here exists
-- (each is read by the Phase 1 backfill).
--
-- Order: apply THIS (safe, non-destructive) -> deploy legacy-removal code ->
-- bake -> apply the Phase 5 contract migration (which drops these columns).
-- Sorts before 20260729222649_money_phase5_contract.sql by timestamp.
--
-- Reversal: not required (Phase 5 drops these columns anyway).
-- ============================================================================

begin;

-- Legacy numeric money columns (superseded by *_minor).
alter table public.accounts                       alter column current_balance              drop not null;
alter table public.accounts                       alter column available_balance            drop not null;
alter table public.transactions                   alter column amount                       drop not null;
alter table public.recurring_transactions         alter column amount                       drop not null;
alter table public.goals                          alter column current_amount               drop not null;
alter table public.goals                          alter column target_amount                drop not null;
alter table public.budgets                        alter column amount                       drop not null;
alter table public.financial_confidence_snapshots alter column safe_to_spend                drop not null;
alter table public.profiles                       alter column monthly_income               drop not null;
alter table public.loan_details                   alter column last_payment_amount          drop not null;
alter table public.loan_details                   alter column minimum_payment_amount       drop not null;
alter table public.loan_details                   alter column origination_principal_amount drop not null;
alter table public.loan_details                   alter column ytd_interest_paid            drop not null;
alter table public.loan_details                   alter column ytd_principal_paid           drop not null;
alter table public.loan_balance_snapshots         alter column balance                      drop not null;
alter table public.subscription_price_history     alter column amount                       drop not null;
alter table public.net_worth_snapshots            alter column total_balance                drop not null;
alter table public.net_worth_snapshots            alter column cash                         drop not null;
alter table public.net_worth_snapshots            alter column savings                      drop not null;
alter table public.net_worth_snapshots            alter column investments                  drop not null;
alter table public.net_worth_snapshots            alter column debt                         drop not null;

-- Legacy per-row currency text columns (superseded by currency_code + scale).
alter table public.accounts                       alter column currency                     drop not null;
alter table public.transactions                   alter column currency                     drop not null;
alter table public.profiles                       alter column currency                     drop not null;

commit;
