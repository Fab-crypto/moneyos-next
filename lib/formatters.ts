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
