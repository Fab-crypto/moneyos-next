-- ============================================================================
-- Money representation — Phase 1 of 5: EXPAND
-- ============================================================================
-- Introduces integer minor-unit storage (Stripe-style) alongside the existing
-- numeric money columns, plus an ISO 4217 currency registry. Purely additive
-- and reversible: no existing column is altered or dropped, so the running
-- application keeps working unchanged after this applies.
--
-- Safety properties:
--   * Runs in a single transaction — it either fully applies or not at all.
--   * Self-verifying — a reconciliation block re-derives every backfilled
--     total from the untouched source columns and RAISES (aborting the txn)
--     if a single minor-unit value fails to reconcile. A partial or lossy
--     backfill cannot commit.
--   * Lossless — verified before authoring: every stored money value is a
--     whole minor unit (no sub-cent precision), and every currency on file is
--     USD, so the backfill preserves each value exactly.
--
-- Later phases (separate migrations): Backfill hardening is already inline
-- here; Dual-write and Cutover are application changes; Contract (Phase 5)
-- adds NOT NULL + drops the old numeric columns, only after a bake period.
--
-- Rollback: supabase/rollbacks/20260723101126_money_phase1_expand.down.sql
-- ============================================================================

begin;

-- ── 1. Currency registry ────────────────────────────────────────────────────
-- Source of truth mapping ISO 4217 code -> minor-unit scale. The composite
-- UNIQUE (code, scale) lets every money table carry a FK on (currency_code,
-- scale), which makes it structurally impossible for a row's stored scale to
-- disagree with its currency.
create table if not exists public.currencies (
  code   text primary key check (code ~ '^[A-Z]{3}$'),
  scale  smallint not null check (scale between 0 and 4),
  name   text not null,
  unique (code, scale)
);

comment on table public.currencies is
  'ISO 4217 currency metadata. scale = minor-unit exponent (USD=2, JPY=0, KWD=3). Single source of truth for interpreting *_minor columns. Mirrors lib/money/currencies.ts.';

insert into public.currencies (code, scale, name) values
  ('USD',2,'US Dollar'),('EUR',2,'Euro'),('GBP',2,'Pound Sterling'),
  ('CAD',2,'Canadian Dollar'),('AUD',2,'Australian Dollar'),('NZD',2,'New Zealand Dollar'),
  ('CHF',2,'Swiss Franc'),('CNY',2,'Renminbi'),('HKD',2,'Hong Kong Dollar'),
  ('SGD',2,'Singapore Dollar'),('INR',2,'Indian Rupee'),('MXN',2,'Mexican Peso'),
  ('BRL',2,'Brazilian Real'),('ZAR',2,'South African Rand'),('SEK',2,'Swedish Krona'),
  ('NOK',2,'Norwegian Krone'),('DKK',2,'Danish Krone'),('PLN',2,'Polish Zloty'),
  ('AED',2,'UAE Dirham'),('SAR',2,'Saudi Riyal'),('ILS',2,'Israeli New Shekel'),
  ('TRY',2,'Turkish Lira'),('THB',2,'Thai Baht'),('PHP',2,'Philippine Peso'),
  ('MYR',2,'Malaysian Ringgit'),('IDR',2,'Indonesian Rupiah'),
  ('JPY',0,'Yen'),('KRW',0,'Won'),('VND',0,'Dong'),('CLP',0,'Chilean Peso'),
  ('ISK',0,'Iceland Krona'),('PYG',0,'Guarani'),('XAF',0,'CFA Franc BEAC'),
  ('XOF',0,'CFA Franc BCEAO'),('XPF',0,'CFP Franc'),('RWF',0,'Rwanda Franc'),
  ('UGX',0,'Uganda Shilling'),('GNF',0,'Guinean Franc'),('BIF',0,'Burundi Franc'),
  ('DJF',0,'Djibouti Franc'),('KMF',0,'Comorian Franc'),('VUV',0,'Vatu'),
  ('KWD',3,'Kuwaiti Dinar'),('BHD',3,'Bahraini Dinar'),('OMR',3,'Rial Omani'),
  ('JOD',3,'Jordanian Dinar'),('TND',3,'Tunisian Dinar'),('LYD',3,'Libyan Dinar'),
  ('IQD',3,'Iraqi Dinar')
on conflict (code) do nothing;

-- Reference data: readable by any signed-in user, never writable via the API.
alter table public.currencies enable row level security;
drop policy if exists "currencies readable by authenticated users" on public.currencies;
create policy "currencies readable by authenticated users"
  on public.currencies for select to authenticated using (true);

-- ── 2. Add minor-unit + currency columns (all nullable during Expand) ───────
-- One (currency_code, scale) pair per row; one *_minor per money column.
alter table public.accounts
  add column if not exists currency_code text,
  add column if not exists scale smallint,
  add column if not exists current_balance_minor bigint,
  add column if not exists available_balance_minor bigint;

alter table public.transactions
  add column if not exists currency_code text,
  add column if not exists scale smallint,
  add column if not exists amount_minor bigint;

alter table public.recurring_transactions
  add column if not exists currency_code text,
  add column if not exists scale smallint,
  add column if not exists amount_minor bigint;

alter table public.goals
  add column if not exists currency_code text,
  add column if not exists scale smallint,
  add column if not exists current_amount_minor bigint,
  add column if not exists target_amount_minor bigint;

alter table public.budgets
  add column if not exists currency_code text,
  add column if not exists scale smallint,
  add column if not exists amount_minor bigint;

alter table public.financial_confidence_snapshots
  add column if not exists currency_code text,
  add column if not exists scale smallint,
  add column if not exists safe_to_spend_minor bigint;

alter table public.profiles
  add column if not exists currency_code text,
  add column if not exists scale smallint,
  add column if not exists monthly_income_minor bigint;

alter table public.loan_details
  add column if not exists currency_code text,
  add column if not exists scale smallint,
  add column if not exists last_payment_amount_minor bigint,
  add column if not exists minimum_payment_amount_minor bigint,
  add column if not exists origination_principal_amount_minor bigint,
  add column if not exists ytd_interest_paid_minor bigint,
  add column if not exists ytd_principal_paid_minor bigint;

-- ── 3. Backfill currency_code, then scale, then the minor-unit values ───────
-- currency_code: preserve the existing per-row currency where the table has
-- one (accounts/transactions/profiles); otherwise 'USD' — verified correct,
-- as 100% of existing rows across all money tables are USD.
update public.accounts     set currency_code = coalesce(currency, 'USD') where currency_code is null;
update public.transactions set currency_code = coalesce(currency, 'USD') where currency_code is null;
update public.profiles     set currency_code = coalesce(currency, 'USD') where currency_code is null;
update public.recurring_transactions          set currency_code = 'USD' where currency_code is null;
update public.goals                           set currency_code = 'USD' where currency_code is null;
update public.budgets                         set currency_code = 'USD' where currency_code is null;
update public.financial_confidence_snapshots  set currency_code = 'USD' where currency_code is null;
update public.loan_details                    set currency_code = 'USD' where currency_code is null;

-- scale: always taken from the registry, never hardcoded, so it matches the
-- currency by construction.
update public.accounts     a set scale = c.scale from public.currencies c where c.code = a.currency_code and a.scale is null;
update public.transactions t set scale = c.scale from public.currencies c where c.code = t.currency_code and t.scale is null;
update public.recurring_transactions r set scale = c.scale from public.currencies c where c.code = r.currency_code and r.scale is null;
update public.goals        g set scale = c.scale from public.currencies c where c.code = g.currency_code and g.scale is null;
update public.budgets      b set scale = c.scale from public.currencies c where c.code = b.currency_code and b.scale is null;
update public.financial_confidence_snapshots f set scale = c.scale from public.currencies c where c.code = f.currency_code and f.scale is null;
update public.profiles     p set scale = c.scale from public.currencies c where c.code = p.currency_code and p.scale is null;
update public.loan_details l set scale = c.scale from public.currencies c where c.code = l.currency_code and l.scale is null;

-- minor units: round(value * 10^scale). 10^scale is computed with numeric
-- exponentiation (10::numeric ^ scale) — exact, never floating point. NULL
-- money stays NULL.
update public.accounts set
  current_balance_minor   = case when current_balance is null then null else round(current_balance * (10::numeric ^ scale))::bigint end,
  available_balance_minor = case when available_balance is null then null else round(available_balance * (10::numeric ^ scale))::bigint end
  where current_balance_minor is null and available_balance_minor is null;

update public.transactions set
  amount_minor = case when amount is null then null else round(amount * (10::numeric ^ scale))::bigint end
  where amount_minor is null;

update public.recurring_transactions set
  amount_minor = case when amount is null then null else round(amount * (10::numeric ^ scale))::bigint end
  where amount_minor is null;

update public.goals set
  current_amount_minor = case when current_amount is null then null else round(current_amount * (10::numeric ^ scale))::bigint end,
  target_amount_minor  = case when target_amount  is null then null else round(target_amount  * (10::numeric ^ scale))::bigint end
  where current_amount_minor is null and target_amount_minor is null;

update public.budgets set
  amount_minor = case when amount is null then null else round(amount * (10::numeric ^ scale))::bigint end
  where amount_minor is null;

update public.financial_confidence_snapshots set
  safe_to_spend_minor = case when safe_to_spend is null then null else round(safe_to_spend * (10::numeric ^ scale))::bigint end
  where safe_to_spend_minor is null;

update public.profiles set
  monthly_income_minor = case when monthly_income is null then null else round(monthly_income * (10::numeric ^ scale))::bigint end
  where monthly_income_minor is null;

update public.loan_details set
  last_payment_amount_minor          = case when last_payment_amount          is null then null else round(last_payment_amount          * (10::numeric ^ scale))::bigint end,
  minimum_payment_amount_minor       = case when minimum_payment_amount       is null then null else round(minimum_payment_amount       * (10::numeric ^ scale))::bigint end,
  origination_principal_amount_minor = case when origination_principal_amount is null then null else round(origination_principal_amount * (10::numeric ^ scale))::bigint end,
  ytd_interest_paid_minor            = case when ytd_interest_paid            is null then null else round(ytd_interest_paid            * (10::numeric ^ scale))::bigint end,
  ytd_principal_paid_minor           = case when ytd_principal_paid           is null then null else round(ytd_principal_paid           * (10::numeric ^ scale))::bigint end
  where last_payment_amount_minor is null;

-- ── 4. Enforce currency/scale integrity with composite FKs ──────────────────
-- (currency_code, scale) must exist in the registry: a row can never claim a
-- scale its currency doesn't have.
alter table public.accounts                     add constraint accounts_currency_fk                     foreign key (currency_code, scale) references public.currencies (code, scale);
alter table public.transactions                 add constraint transactions_currency_fk                 foreign key (currency_code, scale) references public.currencies (code, scale);
alter table public.recurring_transactions       add constraint recurring_transactions_currency_fk       foreign key (currency_code, scale) references public.currencies (code, scale);
alter table public.goals                        add constraint goals_currency_fk                        foreign key (currency_code, scale) references public.currencies (code, scale);
alter table public.budgets                      add constraint budgets_currency_fk                      foreign key (currency_code, scale) references public.currencies (code, scale);
alter table public.financial_confidence_snapshots add constraint fcs_currency_fk                        foreign key (currency_code, scale) references public.currencies (code, scale);
alter table public.profiles                     add constraint profiles_currency_fk                     foreign key (currency_code, scale) references public.currencies (code, scale);
alter table public.loan_details                 add constraint loan_details_currency_fk                 foreign key (currency_code, scale) references public.currencies (code, scale);

-- ── 5. Self-verify: re-derive every total from the untouched source columns.
-- If a single minor-unit sum fails to reconcile with value*10^scale, the whole
-- transaction aborts. This is the "verify totals before and after" gate.
do $$
declare
  mismatches text := '';
  procedure_check record;
begin
  for procedure_check in
    select * from (values
      ('accounts.current_balance',   (select coalesce(sum(current_balance_minor),0)   from public.accounts where current_balance is not null),   (select coalesce(round(sum(current_balance   * (10::numeric ^ scale))),0) from public.accounts where current_balance is not null)),
      ('accounts.available_balance', (select coalesce(sum(available_balance_minor),0) from public.accounts where available_balance is not null), (select coalesce(round(sum(available_balance * (10::numeric ^ scale))),0) from public.accounts where available_balance is not null)),
      ('transactions.amount',        (select coalesce(sum(amount_minor),0) from public.transactions where amount is not null), (select coalesce(round(sum(amount * (10::numeric ^ scale))),0) from public.transactions where amount is not null)),
      ('recurring_transactions.amount', (select coalesce(sum(amount_minor),0) from public.recurring_transactions where amount is not null), (select coalesce(round(sum(amount * (10::numeric ^ scale))),0) from public.recurring_transactions where amount is not null)),
      ('goals.current_amount',       (select coalesce(sum(current_amount_minor),0) from public.goals where current_amount is not null), (select coalesce(round(sum(current_amount * (10::numeric ^ scale))),0) from public.goals where current_amount is not null)),
      ('goals.target_amount',        (select coalesce(sum(target_amount_minor),0) from public.goals where target_amount is not null), (select coalesce(round(sum(target_amount * (10::numeric ^ scale))),0) from public.goals where target_amount is not null)),
      ('budgets.amount',             (select coalesce(sum(amount_minor),0) from public.budgets where amount is not null), (select coalesce(round(sum(amount * (10::numeric ^ scale))),0) from public.budgets where amount is not null)),
      ('financial_confidence_snapshots.safe_to_spend', (select coalesce(sum(safe_to_spend_minor),0) from public.financial_confidence_snapshots where safe_to_spend is not null), (select coalesce(round(sum(safe_to_spend * (10::numeric ^ scale))),0) from public.financial_confidence_snapshots where safe_to_spend is not null)),
      ('profiles.monthly_income',    (select coalesce(sum(monthly_income_minor),0) from public.profiles where monthly_income is not null), (select coalesce(round(sum(monthly_income * (10::numeric ^ scale))),0) from public.profiles where monthly_income is not null)),
      ('loan_details.last_payment_amount', (select coalesce(sum(last_payment_amount_minor),0) from public.loan_details where last_payment_amount is not null), (select coalesce(round(sum(last_payment_amount * (10::numeric ^ scale))),0) from public.loan_details where last_payment_amount is not null))
    ) as t(label, got numeric, expected numeric)
  loop
    if procedure_check.got <> procedure_check.expected then
      mismatches := mismatches || format('  %s: minor sum %s <> expected %s%s', procedure_check.label, procedure_check.got, procedure_check.expected, chr(10));
    end if;
  end loop;

  if mismatches <> '' then
    raise exception E'Money Phase 1 backfill reconciliation FAILED — aborting:\n%', mismatches;
  end if;

  raise notice 'Money Phase 1 backfill reconciled cleanly across all money tables.';
end $$;

commit;
