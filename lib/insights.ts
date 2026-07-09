import type { Transaction } from "@/types/finance";

export type Insight = {
  id: string;
  text: string;
};

export function generateInsights(transactions: Transaction[]): Insight[] {
  const foodSpend = transactions
    .filter((t) => t.category === "food")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return [
    {
      id: "insight_1",
      text: foodSpend > 0
        ? "Food spending is active this week, but your overall budget still looks healthy."
        : "Your spending looks calm today. You are staying within your normal rhythm.",
    },
  ];
}