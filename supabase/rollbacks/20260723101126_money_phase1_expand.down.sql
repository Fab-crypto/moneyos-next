-- ============================================================================
-- Rollback for Money Phase 1 (EXPAND).
-- ============================================================================
-- Phase 1 is purely additive, so this reversal is clean and total-safe: it
-- drops only the columns and the currency registry it introduced. No original
-- money value is touched — the untouched numeric columns remain the source of
-- truth throughout Phase 1, so reverting loses nothing.
--
-- Run manually against the linked project if Phase 1 must be undone before the
-- later Dual-write/Cutover phases:
--   psql "$DATABASE_URL" -f supabase/rollbacks/20260723101126_money_phase1_expand.down.sql
-- Do NOT run this after Phase 5 (Contract) has dropped the old numeric columns.
-- ============================================================================

begin;

alter table public.accounts                       drop constraint if exists accounts_currency_fk;
alter table public.transactions                   drop constraint if exists transactions_currency_fk;
alter table public.recurring_transactions         drop constraint if exists recurring_transactions_currency_fk;
alter table public.goals                          drop constraint if exists goals_currency_fk;
alter table public.budgets                        drop constraint if exists budgets_currency_fk;
alter table public.financial_confidence_snapshots drop constraint if exists fcs_currency_fk;
alter table public.profiles                       drop constraint if exists profiles_currency_fk;
alter table public.loan_details                   drop constraint if exists loan_details_currency_fk;
alter table public.loan_balance_snapshots         drop constraint if exists loan_balance_snapshots_currency_fk;
alter table public.subscription_price_history     drop constraint if exists subscription_price_history_currency_fk;
alter table public.net_worth_snapshots            drop constraint if exists net_worth_snapshots_currency_fk;

alter table public.accounts
  drop column if exists current_balance_minor,
  drop column if exists available_balance_minor,
  drop column if exists currency_code,
  drop column if exists scale;

alter table public.transactions
  drop column if exists amount_minor, drop column if exists currency_code, drop column if exists scale;

alter table public.recurring_transactions
  drop column if exists amount_minor, drop column if exists currency_code, drop column if exists scale;

alter table public.goals
  drop column if exists current_amount_minor, drop column if exists target_amount_minor,
  drop column if exists currency_code, drop column if exists scale;

alter table public.budgets
  drop column if exists amount_minor, drop column if exists currency_code, drop column if exists scale;

alter table public.financial_confidence_snapshots
  drop column if exists safe_to_spend_minor, drop column if exists currency_code, drop column if exists scale;

alter table public.profiles
  drop column if exists monthly_income_minor, drop column if exists currency_code, drop column if exists scale;

alter table public.loan_details
  drop column if exists last_payment_amount_minor,
  drop column if exists minimum_payment_amount_minor,
  drop column if exists origination_principal_amount_minor,
  drop column if exists ytd_interest_paid_minor,
  drop column if exists ytd_principal_paid_minor,
  drop column if exists currency_code, drop column if exists scale;

alter table public.loan_balance_snapshots
  drop column if exists balance_minor, drop column if exists currency_code, drop column if exists scale;

alter table public.subscription_price_history
  drop column if exists amount_minor, drop column if exists currency_code, drop column if exists scale;

alter table public.net_worth_snapshots
  drop column if exists total_balance_minor, drop column if exists cash_minor, drop column if exists savings_minor,
  drop column if exists investments_minor, drop column if exists debt_minor,
  drop column if exists currency_code, drop column if exists scale;

drop table if exists public.currencies;

commit;
