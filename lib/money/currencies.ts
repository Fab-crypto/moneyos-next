/**
 * ISO 4217 currency metadata. `scale` is the minor-unit exponent: the number
 * of decimal places the currency subdivides into. USD/EUR = 2 (cents), JPY = 0
 * (no subunit), KWD = 3 (fils). This table is the single source of truth for
 * how a stored `amount_minor` integer maps to a human decimal — business logic
 * must never hardcode 2.
 *
 * Unknown codes are rejected rather than defaulted, so a currency we haven't
 * vetted can never silently corrupt a value by assuming the wrong scale.
 */
export interface CurrencyMeta {
  readonly code: string;
  readonly scale: number;
  readonly name: string;
}

// Curated for v1: every standard-minor-unit currency we expect, plus every
// non-2-decimal exception so the "never assume 2" rule holds from day one.
// Extend deliberately — add a row here, never widen a default.
const CURRENCIES: Readonly<Record<string, CurrencyMeta>> = Object.freeze({
  // 2-decimal majors
  USD: { code: "USD", scale: 2, name: "US Dollar" },
  EUR: { code: "EUR", scale: 2, name: "Euro" },
  GBP: { code: "GBP", scale: 2, name: "Pound Sterling" },
  CAD: { code: "CAD", scale: 2, name: "Canadian Dollar" },
  AUD: { code: "AUD", scale: 2, name: "Australian Dollar" },
  NZD: { code: "NZD", scale: 2, name: "New Zealand Dollar" },
  CHF: { code: "CHF", scale: 2, name: "Swiss Franc" },
  CNY: { code: "CNY", scale: 2, name: "Renminbi" },
  HKD: { code: "HKD", scale: 2, name: "Hong Kong Dollar" },
  SGD: { code: "SGD", scale: 2, name: "Singapore Dollar" },
  INR: { code: "INR", scale: 2, name: "Indian Rupee" },
  MXN: { code: "MXN", scale: 2, name: "Mexican Peso" },
  BRL: { code: "BRL", scale: 2, name: "Brazilian Real" },
  ZAR: { code: "ZAR", scale: 2, name: "South African Rand" },
  SEK: { code: "SEK", scale: 2, name: "Swedish Krona" },
  NOK: { code: "NOK", scale: 2, name: "Norwegian Krone" },
  DKK: { code: "DKK", scale: 2, name: "Danish Krone" },
  PLN: { code: "PLN", scale: 2, name: "Polish Zloty" },
  AED: { code: "AED", scale: 2, name: "UAE Dirham" },
  SAR: { code: "SAR", scale: 2, name: "Saudi Riyal" },
  ILS: { code: "ILS", scale: 2, name: "Israeli New Shekel" },
  TRY: { code: "TRY", scale: 2, name: "Turkish Lira" },
  THB: { code: "THB", scale: 2, name: "Thai Baht" },
  PHP: { code: "PHP", scale: 2, name: "Philippine Peso" },
  MYR: { code: "MYR", scale: 2, name: "Malaysian Ringgit" },
  IDR: { code: "IDR", scale: 2, name: "Indonesian Rupiah" },

  // 0-decimal (no minor unit)
  JPY: { code: "JPY", scale: 0, name: "Yen" },
  KRW: { code: "KRW", scale: 0, name: "Won" },
  VND: { code: "VND", scale: 0, name: "Dong" },
  CLP: { code: "CLP", scale: 0, name: "Chilean Peso" },
  ISK: { code: "ISK", scale: 0, name: "Iceland Krona" },
  PYG: { code: "PYG", scale: 0, name: "Guarani" },
  XAF: { code: "XAF", scale: 0, name: "CFA Franc BEAC" },
  XOF: { code: "XOF", scale: 0, name: "CFA Franc BCEAO" },
  XPF: { code: "XPF", scale: 0, name: "CFP Franc" },
  RWF: { code: "RWF", scale: 0, name: "Rwanda Franc" },
  UGX: { code: "UGX", scale: 0, name: "Uganda Shilling" },
  GNF: { code: "GNF", scale: 0, name: "Guinean Franc" },
  BIF: { code: "BIF", scale: 0, name: "Burundi Franc" },
  DJF: { code: "DJF", scale: 0, name: "Djibouti Franc" },
  KMF: { code: "KMF", scale: 0, name: "Comorian Franc" },
  VUV: { code: "VUV", scale: 0, name: "Vatu" },

  // 3-decimal
  KWD: { code: "KWD", scale: 3, name: "Kuwaiti Dinar" },
  BHD: { code: "BHD", scale: 3, name: "Bahraini Dinar" },
  OMR: { code: "OMR", scale: 3, name: "Rial Omani" },
  JOD: { code: "JOD", scale: 3, name: "Jordanian Dinar" },
  TND: { code: "TND", scale: 3, name: "Tunisian Dinar" },
  LYD: { code: "LYD", scale: 3, name: "Libyan Dinar" },
  IQD: { code: "IQD", scale: 3, name: "Iraqi Dinar" },
});

export class UnknownCurrencyError extends Error {
  constructor(code: string) {
    super(
      `Unknown currency "${code}". Add it to lib/money/currencies.ts with its ISO 4217 minor-unit scale — MoneyOS never assumes a default scale.`
    );
    this.name = "UnknownCurrencyError";
  }
}

/** Returns currency metadata, or throws — never defaults an unknown scale. */
export function getCurrency(code: string): CurrencyMeta {
  const meta = CURRENCIES[code];
  if (!meta) throw new UnknownCurrencyError(code);
  return meta;
}

export function isSupportedCurrency(code: string): boolean {
  return code in CURRENCIES;
}

export function supportedCurrencyCodes(): string[] {
  return Object.keys(CURRENCIES);
}
