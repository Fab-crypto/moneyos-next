import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { plaidClient } from "@/lib/plaid";

export async function syncLoanDetails(
  admin: SupabaseClient<any, "public", any>,
  userId: string,
  accessToken: string,
  accountIdByPlaidId: Map<string, string>
): Promise<void> {
  let liabilities: Awaited<ReturnType<typeof plaidClient.liabilitiesGet>>["data"]["liabilities"];
  try {
    const response = await plaidClient.liabilitiesGet({ access_token: accessToken });
    liabilities = response.data.liabilities;
  } catch {
    return;
  }

  const rows: Record<string, unknown>[] = [];
  const now = new Date().toISOString();

  for (const credit of liabilities.credit ?? []) {
    if (!credit.account_id) continue;
    const accountId = accountIdByPlaidId.get(credit.account_id);
    if (!accountId) continue;
    const purchaseApr = credit.aprs?.find((a) => a.apr_type === "purchase_apr");
    rows.push({
      user_id: userId,
      account_id: accountId,
      loan_type: "credit",
      interest_rate_percentage: purchaseApr?.apr_percentage ?? null,
      last_payment_amount: credit.last_payment_amount,
      last_payment_date: credit.last_payment_date,
      next_payment_due_date: credit.next_payment_due_date,
      minimum_payment_amount: credit.minimum_payment_amount,
      is_overdue: credit.is_overdue,
      origination_date: null,
      origination_principal_amount: null,
      ytd_interest_paid: null,
      ytd_principal_paid: null,
      details: {
        aprs: credit.aprs,
        last_statement_balance: credit.last_statement_balance,
        last_statement_issue_date: credit.last_statement_issue_date,
      },
      updated_at: now,
    });
  }

  for (const mortgage of liabilities.mortgage ?? []) {
    if (!mortgage.account_id) continue;
    const accountId = accountIdByPlaidId.get(mortgage.account_id);
    if (!accountId) continue;
    rows.push({
      user_id: userId,
      account_id: accountId,
      loan_type: "mortgage",
      interest_rate_percentage: mortgage.interest_rate?.percentage ?? null,
      last_payment_amount: mortgage.last_payment_amount,
      last_payment_date: mortgage.last_payment_date,
      next_payment_due_date: mortgage.next_payment_due_date,
      minimum_payment_amount: mortgage.next_monthly_payment ?? null,
      is_overdue: (mortgage.past_due_amount ?? 0) > 0,
      origination_date: mortgage.origination_date,
      origination_principal_amount: mortgage.origination_principal_amount,
      ytd_interest_paid: mortgage.ytd_interest_paid,
      ytd_principal_paid: mortgage.ytd_principal_paid,
      details: {
        property_address: mortgage.property_address,
        has_pmi: mortgage.has_pmi,
        has_prepayment_penalty: mortgage.has_prepayment_penalty,
        loan_term: mortgage.loan_term,
        loan_type_description: mortgage.loan_type_description,
        maturity_date: mortgage.maturity_date,
        escrow_balance: mortgage.escrow_balance,
        current_late_fee: mortgage.current_late_fee,
        past_due_amount: mortgage.past_due_amount,
      },
      updated_at: now,
    });
  }

  for (const student of liabilities.student ?? []) {
    if (!student.account_id) continue;
    const accountId = accountIdByPlaidId.get(student.account_id);
    if (!accountId) continue;
    rows.push({
      user_id: userId,
      account_id: accountId,
      loan_type: "student",
      interest_rate_percentage: student.interest_rate_percentage,
      last_payment_amount: student.last_payment_amount,
      last_payment_date: student.last_payment_date,
      next_payment_due_date: student.next_payment_due_date,
      minimum_payment_amount: student.minimum_payment_amount,
      is_overdue: student.is_overdue,
      origination_date: student.origination_date,
      origination_principal_amount: student.origination_principal_amount,
      ytd_interest_paid: student.ytd_interest_paid,
      ytd_principal_paid: student.ytd_principal_paid,
      details: {
        loan_name: student.loan_name,
        guarantor: student.guarantor,
        repayment_plan: student.repayment_plan,
        loan_status: student.loan_status,
        pslf_status: student.pslf_status,
        expected_payoff_date: student.expected_payoff_date,
        outstanding_interest_amount: student.outstanding_interest_amount,
      },
      updated_at: now,
    });
  }

  if (rows.length === 0) return;

  const { error } = await admin.from("loan_details").upsert(rows, { onConflict: "account_id" });
  if (error) {
    console.error(`[loans] failed to upsert loan details for user=${userId}:`, error);
  }
}
