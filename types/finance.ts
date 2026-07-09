export type AccountType = "checking" | "savings" | "credit" | "investment";

export interface Account {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  balanceCents: number;
  last4: string;
}

export type TransactionCategory =
  | "income"
  | "housing"
  | "food"
  | "transport"
  | "subscriptions"
  | "shopping"
  | "health"
  | "other";

export interface Transaction {
  id: string;
  accountId: string;
  merchant: string;
  category: TransactionCategory;
  amountCents: number; // negative = expense, positive = income
  date: string; // ISO date
}

export interface Budget {
  id: string;
  category: TransactionCategory;
  label: string;
  limitCents: number;
  spentCents: number;
}

export interface BalancePoint {
  date: string;
  balanceCents: number;
}

// Added for the newer hooks/useMoneyMood.ts and hooks/useFinancialConfidence.ts.
// Unrelated to the cents-based types above — kept in the same file only
// because that's where those hooks already look for it.
export type MoodTone = "success" | "warning" | "danger" | "neutral";

export interface Mood {
  emoji: string;
  label: string;
  tone: MoodTone;
}

export interface FinancialConfidence {
  score: number;
  previousScore: number;
  label: string;
  isImproving: boolean;
}