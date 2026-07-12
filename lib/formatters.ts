interface FormatMoneyOptions {
  decimals?: number;
  absolute?: boolean;
}

export function formatMoney(amount: number, options: FormatMoneyOptions = {}): string {
  const { decimals = 2, absolute = false } = options;
  const value = absolute ? Math.abs(amount) : amount;

  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Maps a real Financial Confidence score to calm, non-evaluative
 * language — deliberately avoids anything that reads as a judgment
 * (no "Poor" or "Needs Attention"), matching the app's tone even when
 * the underlying number is low.
 */
export function getConfidenceLabel(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Steady";
  if (score >= 40) return "Building";
  return "Getting Started";
}
