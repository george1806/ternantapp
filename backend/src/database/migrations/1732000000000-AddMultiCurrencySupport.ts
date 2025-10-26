import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Multi-Currency Support Migration
 *
 * This migration converts the currency column from VARCHAR to ENUM
 * to support international operations with validated currency codes.
 *
 * Supported currencies include:
 * - Major world currencies (USD, EUR, GBP, JPY, etc.)
 * - East African currencies (KES, TZS, UGX, RWF, ETB)
 * - Other regional currencies
 *
 * Author: george1806
 * Date: 2025-10-26
 */
export class AddMultiCurrencySupport1732000000000
  implements MigrationInterface
{
  name = 'AddMultiCurrencySupport1732000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update existing NULL or invalid currency values to USD (default)
    await queryRunner.query(`
      UPDATE \`companies\`
      SET \`currency\` = 'USD'
      WHERE \`currency\` IS NULL
         OR \`currency\` NOT IN (
           'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CHF', 'CAD', 'AUD', 'NZD', 'SGD', 'HKD',
           'KES', 'TZS', 'UGX', 'ZAR', 'NGN', 'EGP', 'GHS', 'RWF', 'ETB',
           'AED', 'SAR',
           'INR', 'PKR',
           'BRL', 'MXN'
         )
    `);

    // Convert currency column from VARCHAR to ENUM
    await queryRunner.query(`
      ALTER TABLE \`companies\`
      MODIFY COLUMN \`currency\` ENUM(
        'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CHF', 'CAD', 'AUD', 'NZD', 'SGD', 'HKD',
        'KES', 'TZS', 'UGX', 'ZAR', 'NGN', 'EGP', 'GHS', 'RWF', 'ETB',
        'AED', 'SAR',
        'INR', 'PKR',
        'BRL', 'MXN'
      ) NOT NULL DEFAULT 'USD'
    `);

    console.log('✓ Multi-currency support enabled');
    console.log('✓ Currency column converted to ENUM type');
    console.log('✓ All companies migrated to valid currency codes');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert currency column back to VARCHAR
    await queryRunner.query(`
      ALTER TABLE \`companies\`
      MODIFY COLUMN \`currency\` VARCHAR(50) NOT NULL DEFAULT 'USD'
    `);

    console.log('⚠ Multi-currency support rolled back');
    console.log('⚠ Currency column reverted to VARCHAR type');
  }
}
