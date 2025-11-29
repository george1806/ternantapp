import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Invoices E2E Integration Tests
 * Tests complete invoice workflows including creation, generation, and payment recording
 */
describe('Invoices (e2e)', () => {
    let app: INestApplication;
    let accessToken: string;
    let companyId: string;
    let occupancyId: string;
    let tenantId: string;
    let invoiceId: string;

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

    describe('Invoice Creation Flow', () => {
        it('should register company and user for invoice tests', async () => {
            const registerRes = await request(app.getHttpServer())
                .post('/api/v1/companies/register')
                .send({
                    companyName: `Test Company ${Date.now()}`,
                    slug: `test-company-${Date.now()}`,
                    email: `owner-${Date.now()}@example.com`,
                    password: 'Test@1234',
                    firstName: 'Invoice',
                    lastName: 'Owner',
                    country: 'US',
                    currency: 'USD'
                })
                .expect(201);

            expect(registerRes.body).toHaveProperty('tokens');
            expect(registerRes.body).toHaveProperty('company');
            expect(registerRes.body).toHaveProperty('user');

            accessToken = registerRes.body.tokens.accessToken;
            companyId = registerRes.body.company.id;
        });

        it('should create compound for invoice tests', async () => {
            const compoundRes = await request(app.getHttpServer())
                .post('/api/v1/compounds')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    name: `Test Compound ${Date.now()}`,
                    location: 'Test Location',
                    totalUnits: 10
                })
                .expect(201);

            expect(compoundRes.body).toHaveProperty('id');
        });

        it('should create apartment for invoice tests', async () => {
            // First get the compound
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
                    unitNumber: `Unit-${Date.now()}`,
                    bedrooms: 2,
                    bathrooms: 1,
                    squareFeet: 1000,
                    status: 'available'
                })
                .expect(201);

            expect(apartmentRes.body).toHaveProperty('id');
        });

        it('should create tenant for invoice tests', async () => {
            const tenantRes = await request(app.getHttpServer())
                .post('/api/v1/tenants')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    firstName: `Tenant${Date.now()}`,
                    lastName: 'TestUser',
                    email: `tenant-${Date.now()}@example.com`,
                    phoneNumber: '+1234567890',
                    idType: 'passport',
                    idNumber: `ID-${Date.now()}`
                })
                .expect(201);

            expect(tenantRes.body).toHaveProperty('id');
            tenantId = tenantRes.body.id;
        });

        it('should create occupancy for invoice tests', async () => {
            // Get apartment
            const apartmentsRes = await request(app.getHttpServer())
                .get('/api/v1/apartments')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            const apartmentId = apartmentsRes.body.data[0].id;

            const occupancyRes = await request(app.getHttpServer())
                .post('/api/v1/occupancies')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    apartmentId,
                    tenantId,
                    moveInDate: new Date('2024-01-01'),
                    moveOutDate: new Date('2025-01-01'),
                    monthlyRent: 1500,
                    depositAmount: 3000,
                    leaseTermMonths: 12,
                    status: 'active'
                })
                .expect(201);

            expect(occupancyRes.body).toHaveProperty('id');
            occupancyId = occupancyRes.body.id;
        });

        it('should create invoice manually', async () => {
            const invoiceRes = await request(app.getHttpServer())
                .post('/api/v1/invoices')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    invoiceNumber: `INV-${Date.now()}`,
                    occupancyId,
                    tenantId,
                    invoiceDate: new Date(),
                    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                    lineItems: [
                        {
                            description: 'Monthly Rent',
                            quantity: 1,
                            unitPrice: 1500,
                            amount: 1500,
                            type: 'rent'
                        }
                    ],
                    subtotal: 1500,
                    taxAmount: 0,
                    totalAmount: 1500,
                    notes: 'Invoice for January 2024'
                })
                .expect(201);

            expect(invoiceRes.body).toHaveProperty('id');
            expect(invoiceRes.body.status).toBe('draft');
            expect(invoiceRes.body.totalAmount).toBe(1500);
            invoiceId = invoiceRes.body.id;
        });

        it('should prevent duplicate invoice numbers', async () => {
            const invoiceNumber = `UNIQUE-INV-${Date.now()}`;

            // Create first invoice
            await request(app.getHttpServer())
                .post('/api/v1/invoices')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    invoiceNumber,
                    occupancyId,
                    tenantId,
                    invoiceDate: new Date(),
                    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                    lineItems: [
                        {
                            description: 'Monthly Rent',
                            quantity: 1,
                            unitPrice: 1500,
                            amount: 1500,
                            type: 'rent'
                        }
                    ],
                    subtotal: 1500,
                    taxAmount: 0,
                    totalAmount: 1500
                })
                .expect(201);

            // Try to create second invoice with same number
            return request(app.getHttpServer())
                .post('/api/v1/invoices')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    invoiceNumber,
                    occupancyId,
                    tenantId,
                    invoiceDate: new Date(),
                    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                    lineItems: [
                        {
                            description: 'Monthly Rent',
                            quantity: 1,
                            unitPrice: 1500,
                            amount: 1500,
                            type: 'rent'
                        }
                    ],
                    subtotal: 1500,
                    taxAmount: 0,
                    totalAmount: 1500
                })
                .expect(409);
        });
    });

    describe('Invoice Auto-Generation', () => {
        it('should generate rent invoice for occupancy', async () => {
            const month = new Date().toISOString().slice(0, 7);

            const genRes = await request(app.getHttpServer())
                .post('/api/v1/invoices/generate-rent')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    occupancyId,
                    month,
                    dueDay: 5
                })
                .expect(201);

            expect(genRes.body).toHaveProperty('id');
            expect(genRes.body.status).toBe('draft');
            expect(genRes.body.totalAmount).toBe(1500);
        });

        it('should prevent duplicate rent invoice generation', async () => {
            const month = new Date().toISOString().slice(0, 7);

            // Generate first invoice
            await request(app.getHttpServer())
                .post('/api/v1/invoices/generate-rent')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    occupancyId,
                    month: '2024-03',
                    dueDay: 5
                })
                .expect(201);

            // Try to generate duplicate
            return request(app.getHttpServer())
                .post('/api/v1/invoices/generate-rent')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    occupancyId,
                    month: '2024-03',
                    dueDay: 5
                })
                .expect(409);
        });
    });

    describe('Invoice Status Transitions', () => {
        it('should update invoice status from draft to sent', async () => {
            const statusRes = await request(app.getHttpServer())
                .patch(`/api/v1/invoices/${invoiceId}/status`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    status: 'sent'
                })
                .expect(200);

            expect(statusRes.body.status).toBe('sent');
        });

        it('should mark invoice as sent', async () => {
            // Create a new invoice for this test
            const invoiceRes = await request(app.getHttpServer())
                .post('/api/v1/invoices')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    invoiceNumber: `INV-SENT-${Date.now()}`,
                    occupancyId,
                    tenantId,
                    invoiceDate: new Date(),
                    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                    lineItems: [
                        {
                            description: 'Monthly Rent',
                            quantity: 1,
                            unitPrice: 1500,
                            amount: 1500,
                            type: 'rent'
                        }
                    ],
                    subtotal: 1500,
                    taxAmount: 0,
                    totalAmount: 1500
                })
                .expect(201);

            const newInvoiceId = invoiceRes.body.id;

            const sentRes = await request(app.getHttpServer())
                .post(`/api/v1/invoices/${newInvoiceId}/send`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(sentRes.body.status).toBe('sent');
        });
    });

    describe('Payment Recording', () => {
        it('should record payment on invoice', async () => {
            // Create invoice
            const invoiceRes = await request(app.getHttpServer())
                .post('/api/v1/invoices')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    invoiceNumber: `INV-PAYMENT-${Date.now()}`,
                    occupancyId,
                    tenantId,
                    invoiceDate: new Date(),
                    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                    lineItems: [
                        {
                            description: 'Monthly Rent',
                            quantity: 1,
                            unitPrice: 1500,
                            amount: 1500,
                            type: 'rent'
                        }
                    ],
                    subtotal: 1500,
                    taxAmount: 0,
                    totalAmount: 1500
                })
                .expect(201);

            const testInvoiceId = invoiceRes.body.id;

            // Record payment
            const paymentRes = await request(app.getHttpServer())
                .post(`/api/v1/invoices/${testInvoiceId}/payment`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    amount: 1500
                })
                .expect(200);

            expect(paymentRes.body.amountPaid).toBe(1500);
            expect(paymentRes.body.status).toBe('paid');
        });

        it('should prevent overpayment', async () => {
            // Create invoice
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
                            unitPrice: 1500,
                            amount: 1500,
                            type: 'rent'
                        }
                    ],
                    subtotal: 1500,
                    taxAmount: 0,
                    totalAmount: 1500
                })
                .expect(201);

            const testInvoiceId = invoiceRes.body.id;

            // Try to record overpayment
            return request(app.getHttpServer())
                .post(`/api/v1/invoices/${testInvoiceId}/payment`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    amount: 2000
                })
                .expect(400);
        });

        it('should record partial payment', async () => {
            // Create invoice
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
                            unitPrice: 1500,
                            amount: 1500,
                            type: 'rent'
                        }
                    ],
                    subtotal: 1500,
                    taxAmount: 0,
                    totalAmount: 1500
                })
                .expect(201);

            const testInvoiceId = invoiceRes.body.id;

            // Record partial payment
            const paymentRes = await request(app.getHttpServer())
                .post(`/api/v1/invoices/${testInvoiceId}/payment`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    amount: 750
                })
                .expect(200);

            expect(paymentRes.body.amountPaid).toBe(750);
            expect(paymentRes.body.status).toBe('overdue');

            // Record second partial payment
            const secondPaymentRes = await request(app.getHttpServer())
                .post(`/api/v1/invoices/${testInvoiceId}/payment`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    amount: 750
                })
                .expect(200);

            expect(secondPaymentRes.body.amountPaid).toBe(1500);
            expect(secondPaymentRes.body.status).toBe('paid');
        });
    });

    describe('Invoice Retrieval', () => {
        it('should get invoice by ID', async () => {
            const getRes = await request(app.getHttpServer())
                .get(`/api/v1/invoices/${invoiceId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(getRes.body).toHaveProperty('id');
            expect(getRes.body.id).toBe(invoiceId);
        });

        it('should get invoices by tenant', async () => {
            const listRes = await request(app.getHttpServer())
                .get(`/api/v1/invoices/tenant/${tenantId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(Array.isArray(listRes.body)).toBe(true);
        });

        it('should get invoices by occupancy', async () => {
            const listRes = await request(app.getHttpServer())
                .get(`/api/v1/invoices/occupancy/${occupancyId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(Array.isArray(listRes.body)).toBe(true);
        });

        it('should get all invoices with pagination', async () => {
            const listRes = await request(app.getHttpServer())
                .get('/api/v1/invoices?page=1&limit=10')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(listRes.body).toHaveProperty('data');
            expect(listRes.body).toHaveProperty('meta');
            expect(listRes.body.meta).toHaveProperty('total');
            expect(listRes.body.meta).toHaveProperty('page');
            expect(listRes.body.meta).toHaveProperty('limit');
        });

        it('should filter invoices by status', async () => {
            const listRes = await request(app.getHttpServer())
                .get('/api/v1/invoices?status=draft')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(listRes.body).toHaveProperty('data');
        });

        it('should get overdue invoices', async () => {
            const overdueRes = await request(app.getHttpServer())
                .get('/api/v1/invoices/overdue')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(Array.isArray(overdueRes.body)).toBe(true);
        });

        it('should get invoices due soon', async () => {
            const dueRes = await request(app.getHttpServer())
                .get('/api/v1/invoices/due-soon?daysAhead=7')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(Array.isArray(dueRes.body)).toBe(true);
        });

        it('should get invoice statistics', async () => {
            const statsRes = await request(app.getHttpServer())
                .get('/api/v1/invoices/stats')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(statsRes.body).toHaveProperty('totalInvoices');
            expect(statsRes.body).toHaveProperty('totalRevenue');
            expect(statsRes.body).toHaveProperty('paidAmount');
            expect(statsRes.body).toHaveProperty('pendingAmount');
        });
    });

    describe('Invoice Cancellation', () => {
        it('should cancel draft invoice', async () => {
            // Create invoice
            const invoiceRes = await request(app.getHttpServer())
                .post('/api/v1/invoices')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    invoiceNumber: `INV-CANCEL-${Date.now()}`,
                    occupancyId,
                    tenantId,
                    invoiceDate: new Date(),
                    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                    lineItems: [
                        {
                            description: 'Monthly Rent',
                            quantity: 1,
                            unitPrice: 1500,
                            amount: 1500,
                            type: 'rent'
                        }
                    ],
                    subtotal: 1500,
                    taxAmount: 0,
                    totalAmount: 1500
                })
                .expect(201);

            const testInvoiceId = invoiceRes.body.id;

            const cancelRes = await request(app.getHttpServer())
                .post(`/api/v1/invoices/${testInvoiceId}/cancel`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(cancelRes.body.status).toBe('cancelled');
        });

        it('should prevent cancellation of paid invoice', async () => {
            // Create and pay invoice
            const invoiceRes = await request(app.getHttpServer())
                .post('/api/v1/invoices')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    invoiceNumber: `INV-NO-CANCEL-${Date.now()}`,
                    occupancyId,
                    tenantId,
                    invoiceDate: new Date(),
                    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                    lineItems: [
                        {
                            description: 'Monthly Rent',
                            quantity: 1,
                            unitPrice: 1500,
                            amount: 1500,
                            type: 'rent'
                        }
                    ],
                    subtotal: 1500,
                    taxAmount: 0,
                    totalAmount: 1500
                })
                .expect(201);

            const testInvoiceId = invoiceRes.body.id;

            // Record full payment
            await request(app.getHttpServer())
                .post(`/api/v1/invoices/${testInvoiceId}/payment`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ amount: 1500 })
                .expect(200);

            // Try to cancel paid invoice
            return request(app.getHttpServer())
                .post(`/api/v1/invoices/${testInvoiceId}/cancel`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(400);
        });
    });

    describe('Bulk Invoice Generation', () => {
        it('should bulk generate rent invoices', async () => {
            const month = new Date().toISOString().slice(0, 7);

            const bulkRes = await request(app.getHttpServer())
                .post('/api/v1/invoices/bulk-generate')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    month,
                    dueDay: 5,
                    skipExisting: true
                })
                .expect(201);

            expect(bulkRes.body).toHaveProperty('processed');
            expect(bulkRes.body).toHaveProperty('created');
            expect(bulkRes.body).toHaveProperty('skipped');
            expect(bulkRes.body).toHaveProperty('failed');
            expect(bulkRes.body).toHaveProperty('createdInvoiceIds');
            expect(bulkRes.body).toHaveProperty('totalAmount');
        });

        it('should bulk generate with specific occupancies', async () => {
            const month = new Date().toISOString().slice(0, 7);

            const bulkRes = await request(app.getHttpServer())
                .post('/api/v1/invoices/bulk-generate')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    month,
                    dueDay: 5,
                    occupancyIds: [occupancyId],
                    skipExisting: true
                })
                .expect(201);

            expect(bulkRes.body.processed).toBeGreaterThan(0);
        });
    });
});
