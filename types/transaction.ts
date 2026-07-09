export type TransactionType = "income" | "spending" | "bill" | "transfer";
export type TransactionFilter = "all" | TransactionType;

export interface Transaction {
  id: string;
  merchant: string;
  category: string;
  account: string;
  type: TransactionType;
  /** ISO date, yyyy-mm-dd */
  date: string;
  /** Always positive — sign and color are derived from `type` at render time. */
  amount: number;
  notes?: string;
  recurring?: boolean;
}
