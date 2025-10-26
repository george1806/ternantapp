import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { Payment } from '../../modules/payments/entities/payment.entity';
import { Invoice } from '../../modules/invoices/entities/invoice.entity';
import { PaymentMethod } from '../../common/enums';

/**
 * Payment Seeder
 * Creates test payments for invoices
 *
 * Author: george1806
 */
export class PaymentSeeder {
    constructor(private readonly dataSource: DataSource) {}

    async run(invoices: Invoice[]): Promise<Payment[]> {
        const paymentRepository = this.dataSource.getRepository(Payment);

        console.log('💳 Seeding payments...');

        const savedPayments: Payment[] = [];

        // Only create payments for paid or partially paid invoices
        const paidInvoices = invoices.filter((inv) => inv.amountPaid > 0);

        for (const invoice of paidInvoices) {
            // Determine if full or partial payment
            const isFullPayment = invoice.amountPaid >= invoice.totalAmount;

            if (isFullPayment) {
                // Single full payment
                const paymentData = {
                    companyId: invoice.companyId,
                    invoiceId: invoice.id,
                    amount: invoice.amountPaid,
                    paidAt: invoice.paidDate || new Date(),
                    method: faker.helpers.arrayElement([
                        PaymentMethod.BANK,
                        PaymentMethod.MOBILE,
                        PaymentMethod.CASH,
                        PaymentMethod.CARD
                    ]),
                    reference: `PAY-${faker.string.alphanumeric(10).toUpperCase()}`,
                    metadata: {
                        channel: faker.helpers.arrayElement([
                            'M-Pesa',
                            'Bank Transfer',
                            'Cash',
                            'Card'
                        ]),
                        processedBy: faker.person.fullName()
                    },
                    notes: undefined,
                    isActive: true
                };

                let payment = await paymentRepository.findOne({
                    where: {
                        companyId: invoice.companyId,
                        reference: paymentData.reference
                    }
                });

                if (!payment) {
                    payment = paymentRepository.create(paymentData);
                    await paymentRepository.save(payment);
                    savedPayments.push(payment);
                } else {
                    savedPayments.push(payment);
                }
            } else {
                // Partial payment - might have multiple payments
                const paymentCount = faker.number.int({ min: 1, max: 3 });
                let remainingAmount = invoice.amountPaid;

                for (let i = 0; i < paymentCount && remainingAmount > 0; i++) {
                    const paymentAmount =
                        i === paymentCount - 1
                            ? remainingAmount
                            : faker.number.int({
                                  min: Math.min(1000, Math.floor(remainingAmount / 2)),
                                  max: Math.floor(remainingAmount / 2)
                              });

                    const fromDate = new Date(invoice.invoiceDate);
                    const toDate = invoice.paidDate
                        ? new Date(invoice.paidDate)
                        : new Date();

                    const paymentData = {
                        companyId: invoice.companyId,
                        invoiceId: invoice.id,
                        amount: paymentAmount,
                        paidAt:
                            fromDate < toDate
                                ? faker.date.between({ from: fromDate, to: toDate })
                                : toDate,
                        method: faker.helpers.arrayElement([
                            PaymentMethod.BANK,
                            PaymentMethod.MOBILE,
                            PaymentMethod.CASH
                        ]),
                        reference: `PAY-${faker.string.alphanumeric(10).toUpperCase()}`,
                        metadata: {
                            channel: faker.helpers.arrayElement([
                                'M-Pesa',
                                'Bank Transfer',
                                'Cash'
                            ]),
                            processedBy: faker.person.fullName()
                        },
                        notes: `Partial payment ${i + 1}/${paymentCount}`,
                        isActive: true
                    };

                    let payment = await paymentRepository.findOne({
                        where: {
                            companyId: invoice.companyId,
                            reference: paymentData.reference
                        }
                    });

                    if (!payment) {
                        payment = paymentRepository.create(paymentData);
                        await paymentRepository.save(payment);
                        savedPayments.push(payment);
                    } else {
                        savedPayments.push(payment);
                    }

                    remainingAmount -= paymentAmount;
                }
            }
        }

        console.log(`  ✓ Created ${savedPayments.length} payments`);
        console.log(`✅ Seeded ${savedPayments.length} payments\n`);
        return savedPayments;
    }

    async clear(): Promise<void> {
        const paymentRepository = this.dataSource.getRepository(Payment);
        await paymentRepository.clear();
        console.log('🗑️  Cleared all payments');
    }
}
