export type TransactionType = "income" | "spending" | "bill" | "transfer";
export type TransactionFilter = "all" | TransactionType;

export interface Transaction {
  id: string;
  merchant: string;
  category: string;
  account: string;
  accountId: string;
  type: TransactionType;
  date: string;
  amount: number;
  notes?: string;
  recurring?: boolean;
}
