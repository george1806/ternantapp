import { Currency } from '../enums';

/**
 * Currency metadata interface
 */
export interface CurrencyMetadata {
  code: Currency;
  name: string;
  symbol: string;
  decimalPlaces: number;
  locale: string;
}

/**
 * Complete currency configuration for all supported currencies
 * Provides metadata for formatting and display purposes
 */
export const CURRENCY_CONFIG: Record<Currency, CurrencyMetadata> = {
  // Major World Currencies
  [Currency.USD]: {
    code: Currency.USD,
    name: 'US Dollar',
    symbol: '$',
    decimalPlaces: 2,
    locale: 'en-US',
  },
  [Currency.EUR]: {
    code: Currency.EUR,
    name: 'Euro',
    symbol: '€',
    decimalPlaces: 2,
    locale: 'de-DE',
  },
  [Currency.GBP]: {
    code: Currency.GBP,
    name: 'British Pound',
    symbol: '£',
    decimalPlaces: 2,
    locale: 'en-GB',
  },
  [Currency.JPY]: {
    code: Currency.JPY,
    name: 'Japanese Yen',
    symbol: '¥',
    decimalPlaces: 0,
    locale: 'ja-JP',
  },
  [Currency.CNY]: {
    code: Currency.CNY,
    name: 'Chinese Yuan',
    symbol: '¥',
    decimalPlaces: 2,
    locale: 'zh-CN',
  },
  [Currency.CHF]: {
    code: Currency.CHF,
    name: 'Swiss Franc',
    symbol: 'CHF',
    decimalPlaces: 2,
    locale: 'de-CH',
  },
  [Currency.CAD]: {
    code: Currency.CAD,
    name: 'Canadian Dollar',
    symbol: 'C$',
    decimalPlaces: 2,
    locale: 'en-CA',
  },
  [Currency.AUD]: {
    code: Currency.AUD,
    name: 'Australian Dollar',
    symbol: 'A$',
    decimalPlaces: 2,
    locale: 'en-AU',
  },
  [Currency.NZD]: {
    code: Currency.NZD,
    name: 'New Zealand Dollar',
    symbol: 'NZ$',
    decimalPlaces: 2,
    locale: 'en-NZ',
  },
  [Currency.SGD]: {
    code: Currency.SGD,
    name: 'Singapore Dollar',
    symbol: 'S$',
    decimalPlaces: 2,
    locale: 'en-SG',
  },
  [Currency.HKD]: {
    code: Currency.HKD,
    name: 'Hong Kong Dollar',
    symbol: 'HK$',
    decimalPlaces: 2,
    locale: 'en-HK',
  },

  // African Currencies (East Africa Priority)
  [Currency.KES]: {
    code: Currency.KES,
    name: 'Kenyan Shilling',
    symbol: 'KSh',
    decimalPlaces: 2,
    locale: 'en-KE',
  },
  [Currency.TZS]: {
    code: Currency.TZS,
    name: 'Tanzanian Shilling',
    symbol: 'TSh',
    decimalPlaces: 2,
    locale: 'sw-TZ',
  },
  [Currency.UGX]: {
    code: Currency.UGX,
    name: 'Ugandan Shilling',
    symbol: 'USh',
    decimalPlaces: 0,
    locale: 'en-UG',
  },
  [Currency.ZAR]: {
    code: Currency.ZAR,
    name: 'South African Rand',
    symbol: 'R',
    decimalPlaces: 2,
    locale: 'en-ZA',
  },
  [Currency.NGN]: {
    code: Currency.NGN,
    name: 'Nigerian Naira',
    symbol: '₦',
    decimalPlaces: 2,
    locale: 'en-NG',
  },
  [Currency.EGP]: {
    code: Currency.EGP,
    name: 'Egyptian Pound',
    symbol: 'E£',
    decimalPlaces: 2,
    locale: 'ar-EG',
  },
  [Currency.GHS]: {
    code: Currency.GHS,
    name: 'Ghanaian Cedi',
    symbol: 'GH₵',
    decimalPlaces: 2,
    locale: 'en-GH',
  },
  [Currency.RWF]: {
    code: Currency.RWF,
    name: 'Rwandan Franc',
    symbol: 'FRw',
    decimalPlaces: 0,
    locale: 'rw-RW',
  },
  [Currency.ETB]: {
    code: Currency.ETB,
    name: 'Ethiopian Birr',
    symbol: 'Br',
    decimalPlaces: 2,
    locale: 'am-ET',
  },

  // Middle East
  [Currency.AED]: {
    code: Currency.AED,
    name: 'UAE Dirham',
    symbol: 'د.إ',
    decimalPlaces: 2,
    locale: 'ar-AE',
  },
  [Currency.SAR]: {
    code: Currency.SAR,
    name: 'Saudi Riyal',
    symbol: 'ر.س',
    decimalPlaces: 2,
    locale: 'ar-SA',
  },

  // South Asia
  [Currency.INR]: {
    code: Currency.INR,
    name: 'Indian Rupee',
    symbol: '₹',
    decimalPlaces: 2,
    locale: 'en-IN',
  },
  [Currency.PKR]: {
    code: Currency.PKR,
    name: 'Pakistani Rupee',
    symbol: 'Rs',
    decimalPlaces: 2,
    locale: 'en-PK',
  },

  // Latin America
  [Currency.BRL]: {
    code: Currency.BRL,
    name: 'Brazilian Real',
    symbol: 'R$',
    decimalPlaces: 2,
    locale: 'pt-BR',
  },
  [Currency.MXN]: {
    code: Currency.MXN,
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
  currencyCode: Currency | string,
): CurrencyMetadata {
  const metadata = CURRENCY_CONFIG[currencyCode as Currency];
  if (!metadata) {
    // Fallback to USD if currency not found
    return CURRENCY_CONFIG[Currency.USD];
  }
  return metadata;
}

/**
 * Format amount with currency
 */
export function formatCurrency(
  amount: number,
  currencyCode: Currency | string,
): string {
  const metadata = getCurrencyMetadata(currencyCode);

  return new Intl.NumberFormat(metadata.locale, {
    style: 'currency',
    currency: metadata.code,
    minimumFractionDigits: metadata.decimalPlaces,
    maximumFractionDigits: metadata.decimalPlaces,
  }).format(amount);
}

/**
 * Get list of all available currencies
 */
export function getAvailableCurrencies(): CurrencyMetadata[] {
  return Object.values(CURRENCY_CONFIG);
}

/**
 * Validate currency code
 */
export function isValidCurrency(currencyCode: string): boolean {
  return currencyCode in CURRENCY_CONFIG;
}
