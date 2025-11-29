import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Payments E2E Integration Tests
 * Tests complete payment workflows including recording, reconciliation, and refunds
 */
describe('Payments (e2e)', () => {
    let app: INestApplication;
    let accessToken: string;
    let companyId: string;
    let occupancyId: string;
    let tenantId: string;
    let invoiceId: string;
    let paymentId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule]
        }).compile();

        app = moduleFixture.createNestApplication();

        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true
            })
        );

        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Payment Setup', () => {
        it('should register company and user', async () => {
            const registerRes = await request(app.getHttpServer())
                .post('/api/v1/companies/register')
                .send({
                    companyName: `Payment Test Co ${Date.now()}`,
                    slug: `pay-test-${Date.now()}`,
                    email: `pay-owner-${Date.now()}@example.com`,
                    password: 'Test@1234',
                    firstName: 'Payment',
                    lastName: 'Owner',
                    country: 'US',
                    currency: 'USD'
                })
                .expect(201);

            accessToken = registerRes.body.tokens.accessToken;
            companyId = registerRes.body.company.id;
        });

        it('should create complete occupancy setup', async () => {
            // Create compound
            const compoundRes = await request(app.getHttpServer())
                .post('/api/v1/compounds')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    name: `Payment Test Compound ${Date.now()}`,
                    location: 'Test Location',
                    totalUnits: 10
                })
                .expect(201);

            // Get compound and create apartment
            const compoundsRes = await request(app.getHttpServer())
                .get('/api/v1/compounds')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            const compoundId = compoundsRes.body.data[0].id;

            const apartmentRes = await request(app.getHttpServer())
                .post('/api/v1/apartments')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    compoundId,
                    unitNumber: `Unit-PAY-${Date.now()}`,
                    bedrooms: 2,
                    bathrooms: 1,
                    squareFeet: 1000,
                    status: 'available'
                })
                .expect(201);

            // Create tenant
            const tenantRes = await request(app.getHttpServer())
                .post('/api/v1/tenants')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    firstName: `PaymentTenant${Date.now()}`,
                    lastName: 'TestUser',
                    email: `tenant-pay-${Date.now()}@example.com`,
                    phoneNumber: '+1234567890',
                    idType: 'passport',
                    idNumber: `PAY-${Date.now()}`
                })
                .expect(201);

            tenantId = tenantRes.body.id;

            // Create occupancy
            const occupancyRes = await request(app.getHttpServer())
                .post('/api/v1/occupancies')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    apartmentId: apartmentRes.body.id,
                    tenantId,
                    moveInDate: new Date('2024-01-01'),
                    moveOutDate: new Date('2025-01-01'),
                    monthlyRent: 2000,
                    depositAmount: 4000,
                    leaseTermMonths: 12,
                    status: 'active'
                })
                .expect(201);

            occupancyId = occupancyRes.body.id;
        });

        it('should create invoice for payment testing', async () => {
            const invoiceRes = await request(app.getHttpServer())
                .post('/api/v1/invoices')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    invoiceNumber: `INV-PAY-${Date.now()}`,
                    occupancyId,
                    tenantId,
                    invoiceDate: new Date(),
                    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                    lineItems: [
                        {
                            description: 'Monthly Rent',
                            quantity: 1,
                            unitPrice: 2000,
                            amount: 2000,
                            type: 'rent'
                        }
                    ],
                    subtotal: 2000,
                    taxAmount: 0,
                    totalAmount: 2000,
                    notes: 'Payment test invoice'
                })
                .expect(201);

            invoiceId = invoiceRes.body.id;
        });
    });

    describe('Payment Recording', () => {
        it('should record full payment', async () => {
            const paymentRes = await request(app.getHttpServer())
                .post(`/api/v1/invoices/${invoiceId}/payment`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    amount: 2000
                })
                .expect(200);

            expect(paymentRes.body.amountPaid).toBe(2000);
            expect(paymentRes.body.status).toBe('paid');
            paymentId = paymentRes.body.id || invoiceId; // Store for later use
        });

        it('should get payments for invoice', async () => {
            const paymentsRes = await request(app.getHttpServer())
                .get(`/api/v1/payments/invoice/${invoiceId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(Array.isArray(paymentsRes.body)).toBe(true);
            expect(paymentsRes.body.length).toBeGreaterThan(0);
        });
    });

    describe('Partial Payment Handling', () => {
        it('should record multiple partial payments', async () => {
            // Create new invoice
            const invoiceRes = await request(app.getHttpServer())
                .post('/api/v1/invoices')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    invoiceNumber: `INV-PARTIAL-${Date.now()}`,
                    occupancyId,
                    tenantId,
                    invoiceDate: new Date(),
                    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                    lineItems: [
                        {
                            description: 'Monthly Rent',
                            quantity: 1,
                            unitPrice: 2000,
                            amount: 2000,
                            type: 'rent'
                        }
                    ],
                    subtotal: 2000,
                    taxAmount: 0,
                    totalAmount: 2000
                })
                .expect(201);

            const newInvoiceId = invoiceRes.body.id;

            // First partial payment - 500
            const payment1Res = await request(app.getHttpServer())
                .post(`/api/v1/invoices/${newInvoiceId}/payment`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ amount: 500 })
                .expect(200);

            expect(payment1Res.body.amountPaid).toBe(500);
            expect(payment1Res.body.status).toBe('overdue');

            // Second partial payment - 800
            const payment2Res = await request(app.getHttpServer())
                .post(`/api/v1/invoices/${newInvoiceId}/payment`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ amount: 800 })
                .expect(200);

            expect(payment2Res.body.amountPaid).toBe(1300);
            expect(payment2Res.body.status).toBe('overdue');

            // Final partial payment - 700
            const payment3Res = await request(app.getHttpServer())
                .post(`/api/v1/invoices/${newInvoiceId}/payment`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ amount: 700 })
                .expect(200);

            expect(payment3Res.body.amountPaid).toBe(2000);
            expect(payment3Res.body.status).toBe('paid');
        });
    });

    describe('Payment Validation', () => {
        it('should prevent payment on non-existent invoice', async () => {
            return request(app.getHttpServer())
                .post('/api/v1/invoices/non-existent-id/payment')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ amount: 100 })
                .expect(404);
        });

        it('should prevent negative payment amount', async () => {
            return request(app.getHttpServer())
                .post(`/api/v1/invoices/${invoiceId}/payment`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ amount: -100 })
                .expect(400);
        });

        it('should prevent zero payment amount', async () => {
            return request(app.getHttpServer())
                .post(`/api/v1/invoices/${invoiceId}/payment`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ amount: 0 })
                .expect(400);
        });

        it('should prevent overpayment', async () => {
            // Create new invoice
            const invoiceRes = await request(app.getHttpServer())
                .post('/api/v1/invoices')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    invoiceNumber: `INV-OVERPAY-${Date.now()}`,
                    occupancyId,
                    tenantId,
                    invoiceDate: new Date(),
                    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                    lineItems: [
                        {
                            description: 'Monthly Rent',
                            quantity: 1,
                            unitPrice: 2000,
                            amount: 2000,
                            type: 'rent'
                        }
                    ],
                    subtotal: 2000,
                    taxAmount: 0,
                    totalAmount: 2000
                })
                .expect(201);

            return request(app.getHttpServer())
                .post(`/api/v1/invoices/${invoiceRes.body.id}/payment`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ amount: 2500 }) // More than invoice total
                .expect(400);
        });
    });

    describe('Payment Reconciliation', () => {
        it('should get all payments for tenant', async () => {
            const paymentsRes = await request(app.getHttpServer())
                .get(`/api/v1/payments/tenant/${tenantId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(Array.isArray(paymentsRes.body)).toBe(true);
        });

        it('should get all payments for occupancy', async () => {
            const paymentsRes = await request(app.getHttpServer())
                .get(`/api/v1/payments/occupancy/${occupancyId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(Array.isArray(paymentsRes.body)).toBe(true);
        });

        it('should get all payments with pagination', async () => {
            const paymentsRes = await request(app.getHttpServer())
                .get('/api/v1/payments?page=1&limit=10')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(paymentsRes.body).toHaveProperty('data');
            expect(paymentsRes.body).toHaveProperty('meta');
        });

        it('should get payment statistics', async () => {
            const statsRes = await request(app.getHttpServer())
                .get('/api/v1/payments/stats')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(statsRes.body).toHaveProperty('totalPayments');
            expect(statsRes.body).toHaveProperty('totalAmount');
            expect(statsRes.body).toHaveProperty('averagePayment');
            expect(statsRes.body).toHaveProperty('paymentMethods');
        });
    });

    describe('Payment Methods', () => {
        it('should record payment with method', async () => {
            // Create new invoice
            const invoiceRes = await request(app.getHttpServer())
                .post('/api/v1/invoices')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    invoiceNumber: `INV-METHOD-${Date.now()}`,
                    occupancyId,
                    tenantId,
                    invoiceDate: new Date(),
                    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                    lineItems: [
                        {
                            description: 'Monthly Rent',
                            quantity: 1,
                            unitPrice: 2000,
                            amount: 2000,
                            type: 'rent'
                        }
                    ],
                    subtotal: 2000,
                    taxAmount: 0,
                    totalAmount: 2000
                })
                .expect(201);

            const paymentRes = await request(app.getHttpServer())
                .post(`/api/v1/invoices/${invoiceRes.body.id}/payment`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    amount: 2000,
                    paymentMethod: 'bank_transfer',
                    referenceNumber: `REF-${Date.now()}`
                })
                .expect(200);

            expect(paymentRes.body).toHaveProperty('paymentMethod');
        });

        it('should support multiple payment methods', async () => {
            // Create new invoice
            const invoiceRes = await request(app.getHttpServer())
                .post('/api/v1/invoices')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    invoiceNumber: `INV-MULTI-METHOD-${Date.now()}`,
                    occupancyId,
                    tenantId,
                    invoiceDate: new Date(),
                    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                    lineItems: [
                        {
                            description: 'Monthly Rent',
                            quantity: 1,
                            unitPrice: 2000,
                            amount: 2000,
                            type: 'rent'
                        }
                    ],
                    subtotal: 2000,
                    taxAmount: 0,
                    totalAmount: 2000
                })
                .expect(201);

            const newInvoiceId = invoiceRes.body.id;

            // Cash payment
            await request(app.getHttpServer())
                .post(`/api/v1/invoices/${newInvoiceId}/payment`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    amount: 1000,
                    paymentMethod: 'cash'
                })
                .expect(200);

            // Check payment
            await request(app.getHttpServer())
                .post(`/api/v1/invoices/${newInvoiceId}/payment`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    amount: 1000,
                    paymentMethod: 'check',
                    referenceNumber: `CHECK-${Date.now()}`
                })
                .expect(200);
        });
    });

    describe('Payment Refunds', () => {
        it('should refund overpaid amount', async () => {
            // Create new invoice
            const invoiceRes = await request(app.getHttpServer())
                .post('/api/v1/invoices')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    invoiceNumber: `INV-REFUND-${Date.now()}`,
                    occupancyId,
                    tenantId,
                    invoiceDate: new Date(),
                    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                    lineItems: [
                        {
                            description: 'Monthly Rent',
                            quantity: 1,
                            unitPrice: 2000,
                            amount: 2000,
                            type: 'rent'
                        }
                    ],
                    subtotal: 2000,
                    taxAmount: 0,
                    totalAmount: 2000
                })
                .expect(201);

            const refundInvoiceId = invoiceRes.body.id;

            // Record payment
            await request(app.getHttpServer())
                .post(`/api/v1/invoices/${refundInvoiceId}/payment`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ amount: 2000 })
                .expect(200);

            // Request refund
            const refundRes = await request(app.getHttpServer())
                .post(`/api/v1/payments/${refundInvoiceId}/refund`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    amount: 500,
                    reason: 'Partial refund for damages'
                })
                .expect(200);

            expect(refundRes.body).toHaveProperty('refundAmount');
        });
    });

    describe('Payment Audit Trail', () => {
        it('should track payment history', async () => {
            const historyRes = await request(app.getHttpServer())
                .get(`/api/v1/invoices/${invoiceId}/payment-history`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(Array.isArray(historyRes.body)).toBe(true);
            if (historyRes.body.length > 0) {
                expect(historyRes.body[0]).toHaveProperty('amount');
                expect(historyRes.body[0]).toHaveProperty('date');
                expect(historyRes.body[0]).toHaveProperty('paymentMethod');
            }
        });

        it('should record payment metadata', async () => {
            const invoiceRes = await request(app.getHttpServer())
                .post('/api/v1/invoices')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    invoiceNumber: `INV-AUDIT-${Date.now()}`,
                    occupancyId,
                    tenantId,
                    invoiceDate: new Date(),
                    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                    lineItems: [
                        {
                            description: 'Monthly Rent',
                            quantity: 1,
                            unitPrice: 2000,
                            amount: 2000,
                            type: 'rent'
                        }
                    ],
                    subtotal: 2000,
                    taxAmount: 0,
                    totalAmount: 2000
                })
                .expect(201);

            const auditInvoiceId = invoiceRes.body.id;

            const paymentRes = await request(app.getHttpServer())
                .post(`/api/v1/invoices/${auditInvoiceId}/payment`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    amount: 2000,
                    notes: 'Payment received via bank transfer'
                })
                .expect(200);

            expect(paymentRes.body).toHaveProperty('createdAt');
            expect(paymentRes.body).toHaveProperty('updatedAt');
        });
    });
});
