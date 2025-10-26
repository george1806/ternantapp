import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { Invoice } from '../../modules/invoices/entities/invoice.entity';
import { Occupancy } from '../../modules/occupancies/entities/occupancy.entity';

/**
 * Invoice Seeder
 * Creates test invoices for occupancies
 *
 * Author: george1806
 */
export class InvoiceSeeder {
    constructor(private readonly dataSource: DataSource) {}

    async run(occupancies: Occupancy[]): Promise<Invoice[]> {
        const invoiceRepository = this.dataSource.getRepository(Invoice);

        console.log('🧾 Seeding invoices...');

        const savedInvoices: Invoice[] = [];

        for (const occupancy of occupancies) {
            // Generate 3-6 invoices per occupancy (simulate rent history)
            const invoiceCount = faker.number.int({ min: 3, max: 6 });

            for (let i = 0; i < invoiceCount; i++) {
                const invoiceDate = new Date(occupancy.leaseStartDate);
                invoiceDate.setMonth(invoiceDate.getMonth() + i);

                const dueDate = new Date(invoiceDate);
                dueDate.setDate(dueDate.getDate() + 7);

                const now = new Date();
                const isPastDue = dueDate < now;
                const isPaid = faker.datatype.boolean({ probability: 0.7 }); // 70% paid

                const lineItems: Array<{
                    description: string;
                    quantity: number;
                    unitPrice: number;
                    amount: number;
                    type?: 'rent' | 'utility' | 'maintenance' | 'other';
                }> = [
                    {
                        description: 'Monthly Rent',
                        quantity: 1,
                        unitPrice: occupancy.monthlyRent,
                        amount: occupancy.monthlyRent,
                        type: 'rent' as const
                    }
                ];

                // Sometimes add utilities
                if (faker.datatype.boolean({ probability: 0.3 })) {
                    const utilityAmount = faker.number.int({ min: 2000, max: 5000 });
                    lineItems.push({
                        description: 'Utilities',
                        quantity: 1,
                        unitPrice: utilityAmount,
                        amount: utilityAmount,
                        type: 'utility' as const
                    });
                }

                const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
                const taxAmount = 0; // No tax for now
                const totalAmount = subtotal + taxAmount;

                const amountPaid = isPaid
                    ? totalAmount
                    : faker.number.int({ min: 0, max: totalAmount });

                let status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
                if (amountPaid >= totalAmount) {
                    status = 'paid';
                } else if (isPastDue && amountPaid === 0) {
                    status = 'overdue';
                } else if (amountPaid > 0) {
                    status = 'sent'; // Partially paid
                } else {
                    status = 'sent';
                }

                const invoiceData = {
                    companyId: occupancy.companyId,
                    occupancyId: occupancy.id,
                    tenantId: occupancy.tenantId,
                    invoiceNumber: `INV-${occupancy.companyId.substring(0, 8)}-${Date.now()}-${i}`,
                    invoiceDate,
                    dueDate,
                    status,
                    lineItems,
                    subtotal,
                    taxAmount,
                    totalAmount,
                    amountPaid,
                    paidDate: isPaid
                        ? faker.date.between({ from: invoiceDate, to: dueDate })
                        : undefined,
                    notes: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
                    isActive: true
                };

                let invoice = await invoiceRepository.findOne({
                    where: {
                        companyId: occupancy.companyId,
                        invoiceNumber: invoiceData.invoiceNumber
                    }
                });

                if (!invoice) {
                    invoice = invoiceRepository.create(invoiceData);
                    await invoiceRepository.save(invoice);
                    savedInvoices.push(invoice);
                } else {
                    savedInvoices.push(invoice);
                }
            }
        }

        console.log(`  ✓ Created ${savedInvoices.length} invoices`);
        console.log(`✅ Seeded ${savedInvoices.length} invoices\n`);
        return savedInvoices;
    }

    async clear(): Promise<void> {
        const invoiceRepository = this.dataSource.getRepository(Invoice);
        await invoiceRepository.clear();
        console.log('🗑️  Cleared all invoices');
    }
}
