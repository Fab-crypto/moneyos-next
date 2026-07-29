-- ============================================================================
-- Money representation — Phase 5 of 5: CONTRACT
-- ============================================================================
-- Drops the legacy numeric money columns (and legacy `currency` text columns).
-- After this, the integer *_minor columns + currency_code/scale are the SOLE
-- source of truth for money.
--
-- ⚠️  IRREVERSIBLE-IN-PRACTICE — POINT OF NO RETURN. Do NOT apply until every
--     success criterion in supabase/README.md holds. A rollback exists
--     (supabase/rollbacks/20260729222649_money_phase5_contract.down.sql) that
--     reconstructs the legacy columns from the minor values, but only run this
--     once you truly intend to retire the legacy representation.
--
-- ⚠️  ORDER OF OPERATIONS — the deployed application code MUST already have been
--     changed and deployed to STOP reading and writing the legacy columns
--     BEFORE this runs. Otherwise the still-live old code errors on every money
--     write (writing to columns that no longer exist). Required code change,
--     deployed + baked first:
--       * lib/money/persistence.ts — delete isMoneyDualWriteEnabled + the legacy
--         branch of moneyField/currencyFields; write minor units unconditionally.
--       * remove explicit legacy `currency:` writes (plaid-sync.ts).
--       * lib/money/read.ts — drop the legacy-column fallback in moneyFromRow.
--     Sequence: (1) deploy legacy-free code, (2) bake, (3) apply THIS migration.
--
-- Safety built in: this migration first re-backfills any straggler gap rows,
-- then HARD-ASSERTS that no row has a value with a null minor unit. If a single
-- value would be lost, it RAISES and drops nothing (whole txn rolls back).
-- ============================================================================

begin;

-- ── 1. Safety re-backfill — close any gap rows written while dual-write was off.
-- 1a. currency_code (preserve legacy `currency` where the table has one).
update public.accounts     set currency_code = coalesce(currency, 'USD') where currency_code is null;
update public.transactions set currency_code = coalesce(currency, 'USD') where currency_code is null;
update public.profiles     set currency_code = coalesce(currency, 'USD') where currency_code is null;
update public.recurring_transactions          set currency_code = 'USD' where currency_code is null;
update public.goals                           set currency_code = 'USD' where currency_code is null;
update public.budgets                         set currency_code = 'USD' where currency_code is null;
update public.financial_confidence_snapshots  set currency_code = 'USD' where currency_code is null;
update public.loan_details                    set currency_code = 'USD' where currency_code is null;
update public.loan_balance_snapshots          set currency_code = 'USD' where currency_code is null;
update public.subscription_price_history      set currency_code = 'USD' where currency_code is null;
update public.net_worth_snapshots             set currency_code = 'USD' where currency_code is null;

-- 1b. scale from the registry (so 1c's exponentiation is defined).
do $$
declare t text;
begin
  foreach t in array array['accounts','transactions','profiles','recurring_transactions','goals','budgets',
    'financial_confidence_snapshots','loan_details','loan_balance_snapshots','subscription_price_history','net_worth_snapshots']
  loop
    execute format('update public.%1$I x set scale = c.scale from public.currencies c where c.code = x.currency_code and x.scale is null', t);
  end loop;
end $$;

-- 1c. minor units from legacy where still missing.
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
      'update public.%1$I set %3$I = round(%2$I * (10::numeric ^ scale))::bigint where %2$I is not null and %3$I is null',
      fld.tbl, fld.vcol, fld.mcol
    );
  end loop;
end $$;

-- ── 2. HARD ASSERT: no value may be lost. Abort (drop nothing) if any gap remains.
do $$
declare fld record; bad bigint;
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
    execute format('select count(*) from public.%1$I where %2$I is not null and %3$I is null', fld.tbl, fld.vcol, fld.mcol) into bad;
    if bad > 0 then
      raise exception 'Phase 5 ABORT: %.% has % row(s) with a value but no minor unit — re-backfill first. Nothing dropped.', fld.tbl, fld.vcol, bad;
    end if;
  end loop;
  raise notice 'Phase 5: zero gap rows verified across all money columns — safe to drop legacy.';
end $$;

-- ── 3. Enforce NOT NULL where the data supports it (adaptive — never fails on a
--       legitimately-nullable column such as available_balance_minor).
do $$
declare fld record; nulls bigint;
begin
  for fld in select * from (values
    ('accounts','currency_code'),('accounts','scale'),('accounts','current_balance_minor'),('accounts','available_balance_minor'),
    ('transactions','currency_code'),('transactions','scale'),('transactions','amount_minor'),
    ('recurring_transactions','currency_code'),('recurring_transactions','scale'),('recurring_transactions','amount_minor'),
    ('goals','currency_code'),('goals','scale'),('goals','current_amount_minor'),('goals','target_amount_minor'),
    ('budgets','currency_code'),('budgets','scale'),('budgets','amount_minor'),
    ('financial_confidence_snapshots','currency_code'),('financial_confidence_snapshots','scale'),('financial_confidence_snapshots','safe_to_spend_minor'),
    ('profiles','currency_code'),('profiles','scale'),('profiles','monthly_income_minor'),
    ('loan_details','currency_code'),('loan_details','scale'),
    ('loan_balance_snapshots','currency_code'),('loan_balance_snapshots','scale'),('loan_balance_snapshots','balance_minor'),
    ('subscription_price_history','currency_code'),('subscription_price_history','scale'),('subscription_price_history','amount_minor'),
    ('net_worth_snapshots','currency_code'),('net_worth_snapshots','scale')
  ) as t(tbl, col)
  loop
    execute format('select count(*) from public.%1$I where %2$I is null', fld.tbl, fld.col) into nulls;
    if nulls = 0 then
      execute format('alter table public.%1$I alter column %2$I set not null', fld.tbl, fld.col);
      raise notice '  NOT NULL set on %.%', fld.tbl, fld.col;
    else
      raise notice '  %.% left nullable (% null row(s) — legitimately optional)', fld.tbl, fld.col, nulls;
    end if;
  end loop;
end $$;

-- ── 4. Drop legacy columns. POINT OF NO RETURN.
alter table public.accounts
  drop column if exists current_balance,
  drop column if exists available_balance,
  drop column if exists currency;
alter table public.transactions
  drop column if exists amount,
  drop column if exists currency;
alter table public.recurring_transactions          drop column if exists amount;
alter table public.goals
  drop column if exists current_amount,
  drop column if exists target_amount;
alter table public.budgets                         drop column if exists amount;
alter table public.financial_confidence_snapshots  drop column if exists safe_to_spend;
alter table public.profiles
  drop column if exists monthly_income,
  drop column if exists currency;
alter table public.loan_details
  drop column if exists last_payment_amount,
  drop column if exists minimum_payment_amount,
  drop column if exists origination_principal_amount,
  drop column if exists ytd_interest_paid,
  drop column if exists ytd_principal_paid;
alter table public.loan_balance_snapshots          drop column if exists balance;
alter table public.subscription_price_history      drop column if exists amount;
alter table public.net_worth_snapshots
  drop column if exists total_balance,
  drop column if exists cash,
  drop column if exists savings,
  drop column if exists investments,
  drop column if exists debt;

commit;
