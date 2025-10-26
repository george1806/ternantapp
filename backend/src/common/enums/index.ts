/**
 * User roles for RBAC
 */
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN', // Platform-level admin
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  AUDITOR = 'AUDITOR',
  TENANT_PORTAL = 'TENANT_PORTAL',
}

/**
 * User account status
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

/**
 * Tenant status
 */
export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/**
 * Occupancy status
 */
export enum OccupancyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/**
 * Rent cycle types
 */
export enum RentCycle {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

/**
 * Invoice status
 */
export enum InvoiceStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

/**
 * Payment methods
 */
export enum PaymentMethod {
  CASH = 'CASH',
  BANK = 'BANK',
  MOBILE = 'MOBILE',
  CARD = 'CARD',
  OTHER = 'OTHER',
}

/**
 * Reminder types
 */
export enum ReminderType {
  DUE_SOON = 'DUE_SOON',
  OVERDUE = 'OVERDUE',
  RECEIPT = 'RECEIPT',
  WELCOME = 'WELCOME',
}

/**
 * Reminder status
 */
export enum ReminderStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

/**
 * File entity types
 */
export enum FileEntityType {
  COMPANY = 'COMPANY',
  USER = 'USER',
  APARTMENT = 'APARTMENT',
  TENANT = 'TENANT',
  INVOICE = 'INVOICE',
  PAYMENT = 'PAYMENT',
  OTHER = 'OTHER',
}

/**
 * Supported currencies for international operations
 * Includes major world currencies plus regional African currencies
 */
export enum Currency {
  // Major World Currencies
  USD = 'USD', // US Dollar
  EUR = 'EUR', // Euro
  GBP = 'GBP', // British Pound
  JPY = 'JPY', // Japanese Yen
  CNY = 'CNY', // Chinese Yuan
  CHF = 'CHF', // Swiss Franc
  CAD = 'CAD', // Canadian Dollar
  AUD = 'AUD', // Australian Dollar
  NZD = 'NZD', // New Zealand Dollar
  SGD = 'SGD', // Singapore Dollar
  HKD = 'HKD', // Hong Kong Dollar

  // African Currencies (East Africa Priority)
  KES = 'KES', // Kenyan Shilling
  TZS = 'TZS', // Tanzanian Shilling
  UGX = 'UGX', // Ugandan Shilling
  ZAR = 'ZAR', // South African Rand
  NGN = 'NGN', // Nigerian Naira
  EGP = 'EGP', // Egyptian Pound
  GHS = 'GHS', // Ghanaian Cedi
  RWF = 'RWF', // Rwandan Franc
  ETB = 'ETB', // Ethiopian Birr

  // Middle East
  AED = 'AED', // UAE Dirham
  SAR = 'SAR', // Saudi Riyal

  // South Asia
  INR = 'INR', // Indian Rupee
  PKR = 'PKR', // Pakistani Rupee

  // Latin America
  BRL = 'BRL', // Brazilian Real
  MXN = 'MXN', // Mexican Peso
}
