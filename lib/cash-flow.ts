import type { Transaction } from "@/types/finance";

export interface CashFlow {
  income: number;
  expenses: number;
  net: number;
}

export function getCashFlow(transactions: Transaction[]): CashFlow {
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    income,
    expenses,
    net: income - expenses,
  };
}