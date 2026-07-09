import type { Account, Budget, BalancePoint, Transaction } from "@/types/finance";
export const mockUser = {
  full_name: "Fabian Oduk",
};

export const mockSettings = {
  monthlyBudget: 320000,
};

export function getNetWorth(accounts: Account[]) {
  return {
    netWorth: getTotalNetWorth(accounts),
  };
}
export const mockAccounts: Account[] = [
  { id: "acc_1", name: "Everyday Checking", institution: "First Harbor Bank", type: "checking", balanceCents: 482310, last4: "4821" },
  { id: "acc_2", name: "High-Yield Savings", institution: "First Harbor Bank", type: "savings", balanceCents: 1240055, last4: "9012" },
  { id: "acc_3", name: "Sapphire Reserve", institution: "Chase", type: "credit", balanceCents: -128460, last4: "5533" },
  { id: "acc_4", name: "Brokerage", institution: "Fidelity", type: "investment", balanceCents: 3420190, last4: "7719" },
];

export const mockTransactions: Transaction[] = [
  { id: "t1", accountId: "acc_1", merchant: "Acme Corp Payroll", category: "income", amountCents: 520000, date: "2026-07-01" },
  { id: "t2", accountId: "acc_3", merchant: "Blue Bottle Coffee", category: "food", amountCents: -680, date: "2026-07-02" },
  { id: "t3", accountId: "acc_3", merchant: "Whole Foods Market", category: "food", amountCents: -8420, date: "2026-07-02" },
  { id: "t4", accountId: "acc_1", merchant: "Westview Apartments", category: "housing", amountCents: -240000, date: "2026-07-01" },
];

export const mockBudgets: Budget[] = [
  { id: "b1", category: "housing", label: "Housing", limitCents: 250000, spentCents: 240000 },
  { id: "b2", category: "food", label: "Food & Groceries", limitCents: 90000, spentCents: 64100 },
  { id: "b3", category: "transport", label: "Transport", limitCents: 30000, spentCents: 21400 },
];

export const mockBalanceHistory: BalancePoint[] = [
  { date: "2026-01-01", balanceCents: 4120000 },
  { date: "2026-02-01", balanceCents: 4210000 },
  { date: "2026-03-01", balanceCents: 4180000 },
  { date: "2026-04-01", balanceCents: 4390000 },
  { date: "2026-05-01", balanceCents: 4520000 },
  { date: "2026-06-01", balanceCents: 4610000 },
  { date: "2026-07-01", balanceCents: 5034365 },
];

export function getTotalNetWorth(accounts: Account[]) {
  return accounts.reduce((sum, account) => sum + account.balanceCents, 0);
}
