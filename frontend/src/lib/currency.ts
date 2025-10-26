/**
 * Currency Configuration for Frontend
 * Provides currency metadata and formatting utilities for international operations
 */

export type Currency =
  // Major World Currencies
  | 'USD' // US Dollar
  | 'EUR' // Euro
  | 'GBP' // British Pound
  | 'JPY' // Japanese Yen
  | 'CNY' // Chinese Yuan
  | 'CHF' // Swiss Franc
  | 'CAD' // Canadian Dollar
  | 'AUD' // Australian Dollar
  | 'NZD' // New Zealand Dollar
  | 'SGD' // Singapore Dollar
  | 'HKD' // Hong Kong Dollar
  // African Currencies (East Africa Priority)
  | 'KES' // Kenyan Shilling
  | 'TZS' // Tanzanian Shilling
  | 'UGX' // Ugandan Shilling
  | 'ZAR' // South African Rand
  | 'NGN' // Nigerian Naira
  | 'EGP' // Egyptian Pound
  | 'GHS' // Ghanaian Cedi
  | 'RWF' // Rwandan Franc
  | 'ETB' // Ethiopian Birr
  // Middle East
  | 'AED' // UAE Dirham
  | 'SAR' // Saudi Riyal
  // South Asia
  | 'INR' // Indian Rupee
  | 'PKR' // Pakistani Rupee
  // Latin America
  | 'BRL' // Brazilian Real
  | 'MXN'; // Mexican Peso

export interface CurrencyMetadata {
  code: Currency;
  name: string;
  symbol: string;
  decimalPlaces: number;
  locale: string;
}

/**
 * Complete currency configuration for all supported currencies
 */
export const CURRENCY_CONFIG: Record<Currency, CurrencyMetadata> = {
  // Major World Currencies
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    decimalPlaces: 2,
    locale: 'en-US',
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    decimalPlaces: 2,
    locale: 'de-DE',
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    decimalPlaces: 2,
    locale: 'en-GB',
  },
  JPY: {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    decimalPlaces: 0,
    locale: 'ja-JP',
  },
  CNY: {
    code: 'CNY',
    name: 'Chinese Yuan',
    symbol: '¥',
    decimalPlaces: 2,
    locale: 'zh-CN',
  },
  CHF: {
    code: 'CHF',
    name: 'Swiss Franc',
    symbol: 'CHF',
    decimalPlaces: 2,
    locale: 'de-CH',
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    decimalPlaces: 2,
    locale: 'en-CA',
  },
  AUD: {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    decimalPlaces: 2,
    locale: 'en-AU',
  },
  NZD: {
    code: 'NZD',
    name: 'New Zealand Dollar',
    symbol: 'NZ$',
    decimalPlaces: 2,
    locale: 'en-NZ',
  },
  SGD: {
    code: 'SGD',
    name: 'Singapore Dollar',
    symbol: 'S$',
    decimalPlaces: 2,
    locale: 'en-SG',
  },
  HKD: {
    code: 'HKD',
    name: 'Hong Kong Dollar',
    symbol: 'HK$',
    decimalPlaces: 2,
    locale: 'en-HK',
  },

  // African Currencies (East Africa Priority)
  KES: {
    code: 'KES',
    name: 'Kenyan Shilling',
    symbol: 'KSh',
    decimalPlaces: 2,
    locale: 'en-KE',
  },
  TZS: {
    code: 'TZS',
    name: 'Tanzanian Shilling',
    symbol: 'TSh',
    decimalPlaces: 2,
    locale: 'sw-TZ',
  },
  UGX: {
    code: 'UGX',
    name: 'Ugandan Shilling',
    symbol: 'USh',
    decimalPlaces: 0,
    locale: 'en-UG',
  },
  ZAR: {
    code: 'ZAR',
    name: 'South African Rand',
    symbol: 'R',
    decimalPlaces: 2,
    locale: 'en-ZA',
  },
  NGN: {
    code: 'NGN',
    name: 'Nigerian Naira',
    symbol: '₦',
    decimalPlaces: 2,
    locale: 'en-NG',
  },
  EGP: {
    code: 'EGP',
    name: 'Egyptian Pound',
    symbol: 'E£',
    decimalPlaces: 2,
    locale: 'ar-EG',
  },
  GHS: {
    code: 'GHS',
    name: 'Ghanaian Cedi',
    symbol: 'GH₵',
    decimalPlaces: 2,
    locale: 'en-GH',
  },
  RWF: {
    code: 'RWF',
    name: 'Rwandan Franc',
    symbol: 'FRw',
    decimalPlaces: 0,
    locale: 'rw-RW',
  },
  ETB: {
    code: 'ETB',
    name: 'Ethiopian Birr',
    symbol: 'Br',
    decimalPlaces: 2,
    locale: 'am-ET',
  },

  // Middle East
  AED: {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'د.إ',
    decimalPlaces: 2,
    locale: 'ar-AE',
  },
  SAR: {
    code: 'SAR',
    name: 'Saudi Riyal',
    symbol: 'ر.س',
    decimalPlaces: 2,
    locale: 'ar-SA',
  },

  // South Asia
  INR: {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    decimalPlaces: 2,
    locale: 'en-IN',
  },
  PKR: {
    code: 'PKR',
    name: 'Pakistani Rupee',
    symbol: 'Rs',
    decimalPlaces: 2,
    locale: 'en-PK',
  },

  // Latin America
  BRL: {
    code: 'BRL',
    name: 'Brazilian Real',
    symbol: 'R$',
    decimalPlaces: 2,
    locale: 'pt-BR',
  },
  MXN: {
    code: 'MXN',
    name: 'Mexican Peso',
    symbol: '$',
    decimalPlaces: 2,
    locale: 'es-MX',
  },
};

/**
 * Get currency metadata by code
 */
export function getCurrencyMetadata(
  currencyCode: Currency | string = 'USD',
): CurrencyMetadata {
  const metadata = CURRENCY_CONFIG[currencyCode as Currency];
  if (!metadata) {
    // Fallback to USD if currency not found
    return CURRENCY_CONFIG.USD;
  }
  return metadata;
}

/**
 * Format amount with currency
 * Supports all international currencies with proper locale formatting
 */
export function formatCurrency(
  amount: number,
  currencyCode: Currency | string = 'USD',
): string {
  const metadata = getCurrencyMetadata(currencyCode);

  try {
    return new Intl.NumberFormat(metadata.locale, {
      style: 'currency',
      currency: metadata.code,
      minimumFractionDigits: metadata.decimalPlaces,
      maximumFractionDigits: metadata.decimalPlaces,
    }).format(amount);
  } catch (error) {
    // Fallback formatting if Intl fails
    return `${metadata.symbol}${amount.toFixed(metadata.decimalPlaces)}`;
  }
}

/**
 * Get currency symbol only
 */
export function getCurrencySymbol(currencyCode: Currency | string = 'USD'): string {
  return getCurrencyMetadata(currencyCode).symbol;
}

/**
 * Get list of all available currencies
 * Sorted by region for better UX
 */
export function getAvailableCurrencies(): CurrencyMetadata[] {
  return Object.values(CURRENCY_CONFIG);
}

/**
 * Get currencies grouped by region
 */
export function getCurrenciesByRegion(): Record<string, CurrencyMetadata[]> {
  return {
    'Major Currencies': [
      CURRENCY_CONFIG.USD,
      CURRENCY_CONFIG.EUR,
      CURRENCY_CONFIG.GBP,
      CURRENCY_CONFIG.JPY,
      CURRENCY_CONFIG.CNY,
    ],
    'East Africa': [
      CURRENCY_CONFIG.KES,
      CURRENCY_CONFIG.TZS,
      CURRENCY_CONFIG.UGX,
      CURRENCY_CONFIG.RWF,
      CURRENCY_CONFIG.ETB,
    ],
    Africa: [
      CURRENCY_CONFIG.ZAR,
      CURRENCY_CONFIG.NGN,
      CURRENCY_CONFIG.EGP,
      CURRENCY_CONFIG.GHS,
    ],
    'Middle East': [CURRENCY_CONFIG.AED, CURRENCY_CONFIG.SAR],
    Asia: [
      CURRENCY_CONFIG.SGD,
      CURRENCY_CONFIG.HKD,
      CURRENCY_CONFIG.INR,
      CURRENCY_CONFIG.PKR,
    ],
    Americas: [
      CURRENCY_CONFIG.CAD,
      CURRENCY_CONFIG.BRL,
      CURRENCY_CONFIG.MXN,
    ],
    Oceania: [CURRENCY_CONFIG.AUD, CURRENCY_CONFIG.NZD],
    Europe: [CURRENCY_CONFIG.CHF],
  };
}

/**
 * Validate currency code
 */
export function isValidCurrency(currencyCode: string): boolean {
  return currencyCode in CURRENCY_CONFIG;
}
