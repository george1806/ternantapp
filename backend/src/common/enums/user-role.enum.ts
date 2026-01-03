/**
 * User Role Hierarchy
 *
 * ADMIN (Platform Admin):
 * - Manages ALL users across ALL companies
 * - Oversees entire platform
 * - Can view/manage all companies
 * - Super admin privileges
 *
 * OWNER (Company Owner):
 * - Owns a company
 * - Manages staff in their company
 * - Full access to company data
 * - Cannot manage other companies
 *
 * STAFF (Company Employee):
 * - Belongs to a company (managed by Owner)
 * - Registers apartments, units, tenants, etc.
 * - No user management access
 * - Limited to their company's data
 *
 * AUDITOR (Read-Only Access):
 * - Can view company data but cannot modify
 * - Useful for accountants, auditors, reporting
 * - Read-only access to their company's data
 *
 * Author: george1806
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
  STAFF = 'STAFF',
  AUDITOR = 'AUDITOR',
}
