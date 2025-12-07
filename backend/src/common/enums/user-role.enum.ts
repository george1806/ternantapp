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
 * - Manages workers in their company
 * - Full access to company data
 * - Cannot manage other companies
 *
 * WORKER (Company Employee):
 * - Belongs to a company (managed by Owner)
 * - Registers apartments, units, tenants, etc.
 * - No user management access
 * - Limited to their company's data
 *
 * Author: george1806
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
  WORKER = 'WORKER',
}
