import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Companies E2E Integration Tests
 * Tests complete company management workflows including registration, settings, and multi-tenancy
 */
describe('Companies (e2e)', () => {
    let app: INestApplication;
    let accessToken: string;
    let secondAccessToken: string;
    let companyId: string;
    let secondCompanyId: string;

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

    describe('Company Registration', () => {
        it('should register new company successfully', async () => {
            const registerRes = await request(app.getHttpServer())
                .post('/api/v1/companies/register')
                .send({
                    companyName: `Test Company ${Date.now()}`,
                    slug: `test-company-${Date.now()}`,
                    email: `owner-${Date.now()}@example.com`,
                    password: 'Test@1234',
                    firstName: 'John',
                    lastName: 'Owner',
                    country: 'US',
                    currency: 'USD'
                })
                .expect(201);

            expect(registerRes.body).toHaveProperty('company');
            expect(registerRes.body).toHaveProperty('user');
            expect(registerRes.body).toHaveProperty('tokens');
            expect(registerRes.body.company).toHaveProperty('id');
            expect(registerRes.body.user).toHaveProperty('id');

            accessToken = registerRes.body.tokens.accessToken;
            companyId = registerRes.body.company.id;
        });

        it('should prevent duplicate company slug', async () => {
            const slug = `unique-slug-${Date.now()}`;

            // First registration
            await request(app.getHttpServer())
                .post('/api/v1/companies/register')
                .send({
                    companyName: `Company A ${Date.now()}`,
                    slug,
                    email: `owner-a-${Date.now()}@example.com`,
                    password: 'Test@1234',
                    firstName: 'John',
                    lastName: 'Owner',
                    country: 'US',
                    currency: 'USD'
                })
                .expect(201);

            // Second registration with same slug
            return request(app.getHttpServer())
                .post('/api/v1/companies/register')
                .send({
                    companyName: `Company B ${Date.now()}`,
                    slug,
                    email: `owner-b-${Date.now()}@example.com`,
                    password: 'Test@1234',
                    firstName: 'Jane',
                    lastName: 'Owner',
                    country: 'US',
                    currency: 'USD'
                })
                .expect(409); // Conflict
        });

        it('should prevent duplicate email registration', async () => {
            const email = `unique-email-${Date.now()}@example.com`;

            // First registration
            await request(app.getHttpServer())
                .post('/api/v1/companies/register')
                .send({
                    companyName: `Company 1 ${Date.now()}`,
                    slug: `slug-1-${Date.now()}`,
                    email,
                    password: 'Test@1234',
                    firstName: 'John',
                    lastName: 'Owner',
                    country: 'US',
                    currency: 'USD'
                })
                .expect(201);

            // Second registration with same email
            return request(app.getHttpServer())
                .post('/api/v1/companies/register')
                .send({
                    companyName: `Company 2 ${Date.now()}`,
                    slug: `slug-2-${Date.now()}`,
                    email,
                    password: 'Test@1234',
                    firstName: 'Jane',
                    lastName: 'Owner',
                    country: 'US',
                    currency: 'USD'
                })
                .expect(400); // Bad request / duplicate email
        });
    });

    describe('Company Retrieval', () => {
        it('should get company by ID', async () => {
            const getRes = await request(app.getHttpServer())
                .get(`/api/v1/companies/${companyId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(getRes.body.id).toBe(companyId);
            expect(getRes.body).toHaveProperty('companyName');
            expect(getRes.body).toHaveProperty('slug');
        });

        it('should get company by slug', async () => {
            const getRes = await request(app.getHttpServer())
                .get(`/api/v1/companies/slug/test-company-${Date.now().toString().slice(-4)}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(getRes.body).toHaveProperty('id');
        });

        it('should return 404 for non-existent company', async () => {
            return request(app.getHttpServer())
                .get('/api/v1/companies/non-existent-id')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(404);
        });
    });

    describe('Company Updates', () => {
        it('should update company information', async () => {
            const updateRes = await request(app.getHttpServer())
                .patch(`/api/v1/companies/${companyId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    companyName: 'Updated Company Name'
                })
                .expect(200);

            expect(updateRes.body.companyName).toBe('Updated Company Name');
        });

        it('should update multiple company fields', async () => {
            const updateRes = await request(app.getHttpServer())
                .patch(`/api/v1/companies/${companyId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    companyName: 'Multi Update Company',
                    country: 'UK',
                    currency: 'GBP'
                })
                .expect(200);

            expect(updateRes.body.companyName).toBe('Multi Update Company');
            expect(updateRes.body.country).toBe('UK');
            expect(updateRes.body.currency).toBe('GBP');
        });

        it('should prevent slug update to existing slug', async () => {
            // Create second company
            const secondRegisterRes = await request(app.getHttpServer())
                .post('/api/v1/companies/register')
                .send({
                    companyName: `Second Company ${Date.now()}`,
                    slug: `second-${Date.now()}`,
                    email: `owner-second-${Date.now()}@example.com`,
                    password: 'Test@1234',
                    firstName: 'Jane',
                    lastName: 'Owner',
                    country: 'US',
                    currency: 'USD'
                })
                .expect(201);

            secondCompanyId = secondRegisterRes.body.company.id;
            secondAccessToken = secondRegisterRes.body.tokens.accessToken;

            // Try to update first company's slug to match second company
            return request(app.getHttpServer())
                .patch(`/api/v1/companies/${companyId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    slug: `second-${Date.now().toString().slice(-4)}`
                })
                .expect(409); // Conflict
        });
    });

    describe('Company Settings Management', () => {
        it('should get default company settings', async () => {
            const settingsRes = await request(app.getHttpServer())
                .get(`/api/v1/companies/${companyId}/settings`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(settingsRes.body).toHaveProperty('companyId');
            expect(settingsRes.body).toHaveProperty('defaultInvoiceDueDay');
            expect(settingsRes.body).toHaveProperty('enableInvoiceReminders');
        });

        it('should update invoice settings', async () => {
            const updateRes = await request(app.getHttpServer())
                .patch(`/api/v1/companies/${companyId}/settings`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    defaultInvoiceDueDay: 10,
                    enableInvoiceReminders: true,
                    reminderDaysBeforeDue: 5
                })
                .expect(200);

            expect(updateRes.body.defaultInvoiceDueDay).toBe(10);
            expect(updateRes.body.enableInvoiceReminders).toBe(true);
            expect(updateRes.body.reminderDaysBeforeDue).toBe(5);
        });

        it('should update notification settings', async () => {
            const updateRes = await request(app.getHttpServer())
                .patch(`/api/v1/companies/${companyId}/settings`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    notificationEmail: 'admin@mycompany.com',
                    enableOverdueNotifications: true
                })
                .expect(200);

            expect(updateRes.body.notificationEmail).toBe('admin@mycompany.com');
            expect(updateRes.body.enableOverdueNotifications).toBe(true);
        });

        it('should update payment settings', async () => {
            const updateRes = await request(app.getHttpServer())
                .patch(`/api/v1/companies/${companyId}/settings`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    enableOnlinePayments: true,
                    preferredPaymentGateway: 'stripe',
                    enableLateFees: true,
                    lateFeePercentage: 5
                })
                .expect(200);

            expect(updateRes.body.enableOnlinePayments).toBe(true);
            expect(updateRes.body.preferredPaymentGateway).toBe('stripe');
            expect(updateRes.body.enableLateFees).toBe(true);
            expect(updateRes.body.lateFeePercentage).toBe(5);
        });

        it('should update feature toggles', async () => {
            const updateRes = await request(app.getHttpServer())
                .patch(`/api/v1/companies/${companyId}/settings`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    enableTenantPortal: true,
                    autoGenerateInvoices: true
                })
                .expect(200);

            expect(updateRes.body.enableTenantPortal).toBe(true);
            expect(updateRes.body.autoGenerateInvoices).toBe(true);
        });

        it('should validate settings constraints', async () => {
            // Try invalid due day
            return request(app.getHttpServer())
                .patch(`/api/v1/companies/${companyId}/settings`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    defaultInvoiceDueDay: 50 // Invalid: > 31
                })
                .expect(400);
        });

        it('should validate late fee percentage', async () => {
            return request(app.getHttpServer())
                .patch(`/api/v1/companies/${companyId}/settings`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    lateFeePercentage: 150 // Invalid: > 100
                })
                .expect(400);
        });

        it('should cache settings for performance', async () => {
            // Get settings first time
            const firstRes = await request(app.getHttpServer())
                .get(`/api/v1/companies/${companyId}/settings`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            // Get settings second time (should come from cache)
            const secondRes = await request(app.getHttpServer())
                .get(`/api/v1/companies/${companyId}/settings`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(firstRes.body).toEqual(secondRes.body);
        });
    });

    describe('Multi-Tenancy Isolation', () => {
        it('should not allow company A to access company B data', async () => {
            // Company A tries to access Company B's data
            return request(app.getHttpServer())
                .get(`/api/v1/companies/${secondCompanyId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(403); // Forbidden - different company
        });

        it('should not allow company A to update company B settings', async () => {
            return request(app.getHttpServer())
                .patch(`/api/v1/companies/${secondCompanyId}/settings`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    defaultInvoiceDueDay: 15
                })
                .expect(403); // Forbidden
        });

        it('should allow company A to access own data with different tokens', async () => {
            const res1 = await request(app.getHttpServer())
                .get(`/api/v1/companies/${companyId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            const res2 = await request(app.getHttpServer())
                .get(`/api/v1/companies/${secondCompanyId}`)
                .set('Authorization', `Bearer ${secondAccessToken}`)
                .expect(200);

            expect(res1.body.id).toBe(companyId);
            expect(res2.body.id).toBe(secondCompanyId);
        });
    });

    describe('Company Soft Delete', () => {
        it('should deactivate company', async () => {
            // Create temporary company for deletion test
            const tempRegisterRes = await request(app.getHttpServer())
                .post('/api/v1/companies/register')
                .send({
                    companyName: `Temp Company ${Date.now()}`,
                    slug: `temp-${Date.now()}`,
                    email: `temp-owner-${Date.now()}@example.com`,
                    password: 'Test@1234',
                    firstName: 'Temp',
                    lastName: 'Owner',
                    country: 'US',
                    currency: 'USD'
                })
                .expect(201);

            const tempCompanyId = tempRegisterRes.body.company.id;
            const tempAccessToken = tempRegisterRes.body.tokens.accessToken;

            // Deactivate company
            const deleteRes = await request(app.getHttpServer())
                .delete(`/api/v1/companies/${tempCompanyId}`)
                .set('Authorization', `Bearer ${tempAccessToken}`)
                .expect(200);

            expect(deleteRes.body.message).toContain('deleted');
        });
    });

    describe('Currency Management', () => {
        it('should get supported currencies', async () => {
            const currenciesRes = await request(app.getHttpServer())
                .get('/api/v1/companies/currencies')
                .expect(200);

            expect(currenciesRes.body).toHaveProperty('currencies');
            expect(Array.isArray(currenciesRes.body.currencies)).toBe(true);
            expect(currenciesRes.body.currencies.length).toBeGreaterThan(0);
        });

        it('should have currency with metadata', async () => {
            const currenciesRes = await request(app.getHttpServer())
                .get('/api/v1/companies/currencies')
                .expect(200);

            const currency = currenciesRes.body.currencies[0];
            expect(currency).toHaveProperty('code');
            expect(currency).toHaveProperty('name');
            expect(currency).toHaveProperty('symbol');
        });

        it('should allow switching currency on company', async () => {
            const updateRes = await request(app.getHttpServer())
                .patch(`/api/v1/companies/${companyId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    currency: 'EUR'
                })
                .expect(200);

            expect(updateRes.body.currency).toBe('EUR');
        });
    });

    describe('Company Validation', () => {
        it('should require valid email during registration', async () => {
            return request(app.getHttpServer())
                .post('/api/v1/companies/register')
                .send({
                    companyName: `Invalid Company ${Date.now()}`,
                    slug: `invalid-${Date.now()}`,
                    email: 'invalid-email',
                    password: 'Test@1234',
                    firstName: 'John',
                    lastName: 'Owner',
                    country: 'US',
                    currency: 'USD'
                })
                .expect(400);
        });

        it('should require strong password during registration', async () => {
            return request(app.getHttpServer())
                .post('/api/v1/companies/register')
                .send({
                    companyName: `Weak Pass Company ${Date.now()}`,
                    slug: `weak-${Date.now()}`,
                    email: `weak-${Date.now()}@example.com`,
                    password: '123', // Too weak
                    firstName: 'John',
                    lastName: 'Owner',
                    country: 'US',
                    currency: 'USD'
                })
                .expect(400);
        });

        it('should require valid slug format', async () => {
            return request(app.getHttpServer())
                .post('/api/v1/companies/register')
                .send({
                    companyName: `Invalid Slug Company ${Date.now()}`,
                    slug: 'ab', // Too short
                    email: `slug-test-${Date.now()}@example.com`,
                    password: 'Test@1234',
                    firstName: 'John',
                    lastName: 'Owner',
                    country: 'US',
                    currency: 'USD'
                })
                .expect(400);
        });
    });

    describe('Company Information Completeness', () => {
        it('should store and retrieve all company information', async () => {
            const getRes = await request(app.getHttpServer())
                .get(`/api/v1/companies/${companyId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(getRes.body).toHaveProperty('id');
            expect(getRes.body).toHaveProperty('companyName');
            expect(getRes.body).toHaveProperty('slug');
            expect(getRes.body).toHaveProperty('country');
            expect(getRes.body).toHaveProperty('currency');
            expect(getRes.body).toHaveProperty('isActive');
            expect(getRes.body).toHaveProperty('createdAt');
            expect(getRes.body).toHaveProperty('updatedAt');
        });
    });
});
