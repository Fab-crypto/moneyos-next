-- ============================================================================
-- Rollback for Money Phase 5 (CONTRACT).
-- ============================================================================
-- Reconstructs the dropped legacy numeric (and legacy `currency` text) columns
-- from the retained integer minor values: legacy = minor / 10^scale, which is
-- exact. Run only if Phase 5 must be undone AND the application code has been
-- reverted to read/write the legacy columns again.
--
--   psql "$DATABASE_URL" -f supabase/rollbacks/20260729222649_money_phase5_contract.down.sql
--
-- Note: the *_minor / currency_code / scale columns and their NOT NULL
-- constraints remain (they are the source of truth); this only restores the
-- legacy mirror. NOT NULL constraints added by Phase 5 are left in place.
-- ============================================================================

begin;

-- Re-add legacy money columns (nullable) + legacy currency text columns.
alter table public.accounts
  add column if not exists current_balance numeric,
  add column if not exists available_balance numeric,
  add column if not exists currency text;
alter table public.transactions
  add column if not exists amount numeric,
  add column if not exists currency text;
alter table public.recurring_transactions          add column if not exists amount numeric;
alter table public.goals
  add column if not exists current_amount numeric,
  add column if not exists target_amount numeric;
alter table public.budgets                         add column if not exists amount numeric;
alter table public.financial_confidence_snapshots  add column if not exists safe_to_spend numeric;
alter table public.profiles
  add column if not exists monthly_income numeric,
  add column if not exists currency text;
alter table public.loan_details
  add column if not exists last_payment_amount numeric,
  add column if not exists minimum_payment_amount numeric,
  add column if not exists origination_principal_amount numeric,
  add column if not exists ytd_interest_paid numeric,
  add column if not exists ytd_principal_paid numeric;
alter table public.loan_balance_snapshots          add column if not exists balance numeric;
alter table public.subscription_price_history      add column if not exists amount numeric;
alter table public.net_worth_snapshots
  add column if not exists total_balance numeric,
  add column if not exists cash numeric,
  add column if not exists savings numeric,
  add column if not exists investments numeric,
  add column if not exists debt numeric;

-- Reconstruct legacy money values from minor (exact division).
do $$
declare fld record;
begin
  for fld in select * from (values
    ('accounts','current_balance','current_balance_minor'),
    ('accounts','available_balance','available_balance_minor'),
    ('transactions','amount','amount_minor'),
    ('recurring_transactions','amount','amount_minor'),
    ('goals','current_amount','current_amount_minor'),
    ('goals','target_amount','target_amount_minor'),
    ('budgets','amount','amount_minor'),
    ('financial_confidence_snapshots','safe_to_spend','safe_to_spend_minor'),
    ('profiles','monthly_income','monthly_income_minor'),
    ('loan_details','last_payment_amount','last_payment_amount_minor'),
    ('loan_details','minimum_payment_amount','minimum_payment_amount_minor'),
    ('loan_details','origination_principal_amount','origination_principal_amount_minor'),
    ('loan_details','ytd_interest_paid','ytd_interest_paid_minor'),
    ('loan_details','ytd_principal_paid','ytd_principal_paid_minor'),
    ('loan_balance_snapshots','balance','balance_minor'),
    ('subscription_price_history','amount','amount_minor'),
    ('net_worth_snapshots','total_balance','total_balance_minor'),
    ('net_worth_snapshots','cash','cash_minor'),
    ('net_worth_snapshots','savings','savings_minor'),
    ('net_worth_snapshots','investments','investments_minor'),
    ('net_worth_snapshots','debt','debt_minor')
  ) as t(tbl, vcol, mcol)
  loop
    execute format(
      'update public.%1$I set %2$I = %3$I::numeric / (10::numeric ^ scale) where %3$I is not null',
      fld.tbl, fld.vcol, fld.mcol
    );
  end loop;
end $$;

-- Restore legacy `currency` text from currency_code.
update public.accounts     set currency = currency_code where currency is null;
update public.transactions set currency = currency_code where currency is null;
update public.profiles     set currency = currency_code where currency is null;

commit;
