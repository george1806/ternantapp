import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Critical Business Workflows E2E Tests
 * Tests complete end-to-end scenarios simulating real-world usage patterns
 */
describe('Critical Business Workflows (e2e)', () => {
    let app: INestApplication;
    let accessToken: string;
    let companyId: string;

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

    describe('Complete Lease & Invoicing Workflow', () => {
        let compoundId: string;
        let apartmentId: string;
        let tenantId: string;
        let occupancyId: string;
        let invoiceIds: string[] = [];

        it('Step 1: Register property management company', async () => {
            const registerRes = await request(app.getHttpServer())
                .post('/api/v1/companies/register')
                .send({
                    companyName: `Property Management Co ${Date.now()}`,
                    slug: `pmco-${Date.now()}`,
                    email: `pm-${Date.now()}@example.com`,
                    password: 'SecurePass@123',
                    firstName: 'Robert',
                    lastName: 'Manager',
                    country: 'US',
                    currency: 'USD'
                })
                .expect(201);

            expect(registerRes.body).toHaveProperty('tokens');
            accessToken = registerRes.body.tokens.accessToken;
            companyId = registerRes.body.company.id;
        });

        it('Step 2: Create property compound', async () => {
            const compoundRes = await request(app.getHttpServer())
                .post('/api/v1/compounds')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    name: 'Skyline Apartments Complex',
                    location: '123 Main Street, Downtown',
                    totalUnits: 50
                })
                .expect(201);

            compoundId = compoundRes.body.id;
        });

        it('Step 3: Add apartment units to compound', async () => {
            const apartmentRes = await request(app.getHttpServer())
                .post('/api/v1/apartments')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    compoundId,
                    unitNumber: '201',
                    bedrooms: 2,
                    bathrooms: 1,
                    squareFeet: 850,
                    status: 'available'
                })
                .expect(201);

            apartmentId = apartmentRes.body.id;
        });

        it('Step 4: Register tenant in system', async () => {
            const tenantRes = await request(app.getHttpServer())
                .post('/api/v1/tenants')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    firstName: 'Alice',
                    lastName: 'Johnson',
                    email: 'alice.johnson@example.com',
                    phoneNumber: '+1-555-0101',
                    idType: 'driver_license',
                    idNumber: 'DL123456789'
                })
                .expect(201);

            tenantId = tenantRes.body.id;
        });

        it('Step 5: Create lease/occupancy agreement', async () => {
            const occupancyRes = await request(app.getHttpServer())
                .post('/api/v1/occupancies')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    apartmentId,
                    tenantId,
                    moveInDate: new Date('2024-01-01'),
                    moveOutDate: new Date('2025-12-31'),
                    monthlyRent: 1250,
                    depositAmount: 2500,
                    leaseTermMonths: 24,
                    status: 'active'
                })
                .expect(201);

            occupancyId = occupancyRes.body.id;
            expect(occupancyRes.body.status).toBe('active');
        });

        it('Step 6: Record security deposit payment', async () => {
            const depositRes = await request(app.getHttpServer())
                .post(`/api/v1/occupancies/${occupancyId}/deposit`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    amount: 2500
                })
                .expect(200);

            expect(depositRes.body.depositPaid).toBeGreaterThanOrEqual(2500);
        });

        it('Step 7: Generate monthly rent invoices for entire year', async () => {
            const months = [
                '2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06',
                '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12'
            ];

            for (const month of months) {
                const invoiceRes = await request(app.getHttpServer())
                    .post('/api/v1/invoices/generate-rent')
                    .set('Authorization', `Bearer ${accessToken}`)
                    .send({
                        occupancyId,
                        month,
                        dueDay: 5
                    })
                    .expect(201);

                invoiceIds.push(invoiceRes.body.id);
                expect(invoiceRes.body.totalAmount).toBe(1250);
            }
        });

        it('Step 8: Send first three months of invoices to tenant', async () => {
            for (let i = 0; i < 3; i++) {
                const sentRes = await request(app.getHttpServer())
                    .post(`/api/v1/invoices/${invoiceIds[i]}/send`)
                    .set('Authorization', `Bearer ${accessToken}`)
                    .expect(200);

                expect(sentRes.body.status).toBe('sent');
            }
        });

        it('Step 9: Tenant pays first month fully', async () => {
            const paymentRes = await request(app.getHttpServer())
                .post(`/api/v1/invoices/${invoiceIds[0]}/payment`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    amount: 1250,
                    paymentMethod: 'bank_transfer',
                    referenceNumber: 'BANK-JAN-2024-001'
                })
                .expect(200);

            expect(paymentRes.body.amountPaid).toBe(1250);
            expect(paymentRes.body.status).toBe('paid');
        });

        it('Step 10: Tenant pays second month partially', async () => {
            const paymentRes = await request(app.getHttpServer())
                .post(`/api/v1/invoices/${invoiceIds[1]}/payment`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    amount: 625,
                    paymentMethod: 'check',
                    referenceNumber: 'CHECK-FEB-2024'
                })
                .expect(200);

            expect(paymentRes.body.amountPaid).toBe(625);
            expect(paymentRes.body.status).toBe('overdue');
        });

        it('Step 11: Tenant pays second month remainder', async () => {
            const paymentRes = await request(app.getHttpServer())
                .post(`/api/v1/invoices/${invoiceIds[1]}/payment`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    amount: 625,
                    paymentMethod: 'cash'
                })
                .expect(200);

            expect(paymentRes.body.amountPaid).toBe(1250);
            expect(paymentRes.body.status).toBe('paid');
        });

        it('Step 12: Get invoice statistics and confirm totals', async () => {
            const statsRes = await request(app.getHttpServer())
                .get('/api/v1/invoices/stats')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(statsRes.body).toHaveProperty('totalInvoices');
            expect(statsRes.body).toHaveProperty('totalRevenue');
            expect(statsRes.body).toHaveProperty('paidAmount');
            expect(statsRes.body).toHaveProperty('pendingAmount');
        });

        it('Step 13: Get overdue invoices report', async () => {
            const overdueRes = await request(app.getHttpServer())
                .get('/api/v1/invoices/overdue')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(Array.isArray(overdueRes.body)).toBe(true);
        });

        it('Step 14: Get revenue analytics', async () => {
            const revenueRes = await request(app.getHttpServer())
                .get('/api/v1/reports/revenue')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(revenueRes.body).toHaveProperty('totalRevenue');
        });
    });

    describe('Multiple Units & Tenants Workflow', () => {
        let multiCompoundId: string;
        let unitIds: string[] = [];
        let tenantIds: string[] = [];
        let occupancyIds: string[] = [];

        it('Setup: Register new company for multi-unit test', async () => {
            const registerRes = await request(app.getHttpServer())
                .post('/api/v1/companies/register')
                .send({
                    companyName: `Multi-Unit Properties ${Date.now()}`,
                    slug: `multi-unit-${Date.now()}`,
                    email: `multi-${Date.now()}@example.com`,
                    password: 'SecurePass@456',
                    firstName: 'David',
                    lastName: 'Developer',
                    country: 'US',
                    currency: 'USD'
                })
                .expect(201);

            accessToken = registerRes.body.tokens.accessToken;
        });

        it('Create compound with 5 units', async () => {
            const compoundRes = await request(app.getHttpServer())
                .post('/api/v1/compounds')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    name: 'Downtown Residential Complex',
                    location: '456 Oak Avenue',
                    totalUnits: 5
                })
                .expect(201);

            multiCompoundId = compoundRes.body.id;
        });

        it('Create 5 apartment units', async () => {
            for (let i = 1; i <= 5; i++) {
                const apartmentRes = await request(app.getHttpServer())
                    .post('/api/v1/apartments')
                    .set('Authorization', `Bearer ${accessToken}`)
                    .send({
                        compoundId: multiCompoundId,
                        unitNumber: `Unit-${i}0${i}`,
                        bedrooms: 1 + (i % 2),
                        bathrooms: 1,
                        squareFeet: 600 + i * 50,
                        status: 'available'
                    })
                    .expect(201);

                unitIds.push(apartmentRes.body.id);
            }

            expect(unitIds.length).toBe(5);
        });

        it('Register 5 tenants', async () => {
            for (let i = 1; i <= 5; i++) {
                const tenantRes = await request(app.getHttpServer())
                    .post('/api/v1/tenants')
                    .set('Authorization', `Bearer ${accessToken}`)
                    .send({
                        firstName: `Tenant${i}`,
                        lastName: 'Test',
                        email: `tenant${i}-${Date.now()}@example.com`,
                        phoneNumber: `+1-555-010${i}`,
                        idType: 'passport',
                        idNumber: `PASS${i}${Date.now().toString().slice(-6)}`
                    })
                    .expect(201);

                tenantIds.push(tenantRes.body.id);
            }

            expect(tenantIds.length).toBe(5);
        });

        it('Create occupancies for all units', async () => {
            for (let i = 0; i < 5; i++) {
                const occupancyRes = await request(app.getHttpServer())
                    .post('/api/v1/occupancies')
                    .set('Authorization', `Bearer ${accessToken}`)
                    .send({
                        apartmentId: unitIds[i],
                        tenantId: tenantIds[i],
                        moveInDate: new Date('2024-01-01'),
                        moveOutDate: new Date('2025-01-01'),
                        monthlyRent: 1000 + i * 100,
                        depositAmount: 2000 + i * 200,
                        leaseTermMonths: 12,
                        status: 'active'
                    })
                    .expect(201);

                occupancyIds.push(occupancyRes.body.id);
            }

            expect(occupancyIds.length).toBe(5);
        });

        it('Bulk generate invoices for all units', async () => {
            const bulkRes = await request(app.getHttpServer())
                .post('/api/v1/invoices/bulk-generate')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    month: '2024-01',
                    dueDay: 5,
                    skipExisting: true
                })
                .expect(201);

            expect(bulkRes.body.processed).toBeGreaterThanOrEqual(5);
            expect(bulkRes.body.created).toBeGreaterThanOrEqual(5);
            expect(bulkRes.body.totalAmount).toBeGreaterThan(0);
        });

        it('Record payments from 3 out of 5 tenants', async () => {
            const allInvoicesRes = await request(app.getHttpServer())
                .get('/api/v1/invoices')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            const invoices = allInvoicesRes.body.data;

            // Record payments for first 3 invoices
            for (let i = 0; i < Math.min(3, invoices.length); i++) {
                await request(app.getHttpServer())
                    .post(`/api/v1/invoices/${invoices[i].id}/payment`)
                    .set('Authorization', `Bearer ${accessToken}`)
                    .send({
                        amount: invoices[i].totalAmount,
                        paymentMethod: 'bank_transfer'
                    })
                    .expect(200);
            }
        });

        it('Get compound occupancy report', async () => {
            const reportRes = await request(app.getHttpServer())
                .get('/api/v1/reports/occupancy')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(reportRes.body).toHaveProperty('totalApartments');
            expect(reportRes.body).toHaveProperty('occupiedUnits');
            expect(reportRes.body).toHaveProperty('occupancyRate');
        });

        it('Get KPI dashboard data', async () => {
            const kpisRes = await request(app.getHttpServer())
                .get('/api/v1/reports/kpis')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(kpisRes.body).toHaveProperty('totalRevenue');
            expect(kpisRes.body).toHaveProperty('collectionRate');
            expect(kpisRes.body).toHaveProperty('averageRent');
        });
    });

    describe('Lease Renewal Workflow', () => {
        let renewalCompanyId: string;
        let renewalAccessToken: string;
        let renewalApartmentId: string;
        let renewalTenantId: string;
        let renewalOccupancyId: string;

        it('Setup: Register company for renewal test', async () => {
            const registerRes = await request(app.getHttpServer())
                .post('/api/v1/companies/register')
                .send({
                    companyName: `Lease Renewal Co ${Date.now()}`,
                    slug: `renewal-${Date.now()}`,
                    email: `renewal-${Date.now()}@example.com`,
                    password: 'SecurePass@789',
                    firstName: 'Emma',
                    lastName: 'Renewal',
                    country: 'US',
                    currency: 'USD'
                })
                .expect(201);

            renewalAccessToken = registerRes.body.tokens.accessToken;
            renewalCompanyId = registerRes.body.company.id;
        });

        it('Create apartment and tenant for renewal test', async () => {
            // Create compound
            const compoundRes = await request(app.getHttpServer())
                .post('/api/v1/compounds')
                .set('Authorization', `Bearer ${renewalAccessToken}`)
                .send({
                    name: 'Renewal Test Complex',
                    location: '789 Elm Street',
                    totalUnits: 10
                })
                .expect(201);

            // Create apartment
            const apartmentRes = await request(app.getHttpServer())
                .post('/api/v1/apartments')
                .set('Authorization', `Bearer ${renewalAccessToken}`)
                .send({
                    compoundId: compoundRes.body.id,
                    unitNumber: 'RenewUnit-1',
                    bedrooms: 2,
                    bathrooms: 2,
                    squareFeet: 1000,
                    status: 'available'
                })
                .expect(201);

            renewalApartmentId = apartmentRes.body.id;

            // Create tenant
            const tenantRes = await request(app.getHttpServer())
                .post('/api/v1/tenants')
                .set('Authorization', `Bearer ${renewalAccessToken}`)
                .send({
                    firstName: 'Renewal',
                    lastName: 'Tenant',
                    email: `renewal-tenant-${Date.now()}@example.com`,
                    phoneNumber: '+1-555-0100',
                    idType: 'passport',
                    idNumber: `RENEW${Date.now().toString().slice(-6)}`
                })
                .expect(201);

            renewalTenantId = tenantRes.body.id;
        });

        it('Create initial lease for 1 year', async () => {
            const leaseStartDate = new Date('2023-01-01');
            const leaseEndDate = new Date('2024-01-01');

            const occupancyRes = await request(app.getHttpServer())
                .post('/api/v1/occupancies')
                .set('Authorization', `Bearer ${renewalAccessToken}`)
                .send({
                    apartmentId: renewalApartmentId,
                    tenantId: renewalTenantId,
                    moveInDate: leaseStartDate,
                    moveOutDate: leaseEndDate,
                    monthlyRent: 1500,
                    depositAmount: 3000,
                    leaseTermMonths: 12,
                    status: 'active'
                })
                .expect(201);

            renewalOccupancyId = occupancyRes.body.id;
        });

        it('End current lease and create renewal with rent increase', async () => {
            // Mark occupancy as inactive
            await request(app.getHttpServer())
                .patch(`/api/v1/occupancies/${renewalOccupancyId}`)
                .set('Authorization', `Bearer ${renewalAccessToken}`)
                .send({
                    status: 'inactive'
                })
                .expect(200);

            // Create renewal occupancy with 5% rent increase
            const renewalRes = await request(app.getHttpServer())
                .post('/api/v1/occupancies')
                .set('Authorization', `Bearer ${renewalAccessToken}`)
                .send({
                    apartmentId: renewalApartmentId,
                    tenantId: renewalTenantId,
                    moveInDate: new Date('2024-01-01'),
                    moveOutDate: new Date('2025-01-01'),
                    monthlyRent: 1575, // 5% increase
                    depositAmount: 3000,
                    leaseTermMonths: 12,
                    status: 'active'
                })
                .expect(201);

            expect(renewalRes.body.monthlyRent).toBe(1575);
        });
    });

    describe('Error Recovery & Edge Cases', () => {
        it('Should handle graceful failure when unit is already occupied', async () => {
            // Register company
            const registerRes = await request(app.getHttpServer())
                .post('/api/v1/companies/register')
                .send({
                    companyName: `Edge Case Co ${Date.now()}`,
                    slug: `edge-${Date.now()}`,
                    email: `edge-${Date.now()}@example.com`,
                    password: 'SecurePass@Edge',
                    firstName: 'Edge',
                    lastName: 'Case',
                    country: 'US',
                    currency: 'USD'
                })
                .expect(201);

            const testAccessToken = registerRes.body.tokens.accessToken;

            // Create setup
            const compoundRes = await request(app.getHttpServer())
                .post('/api/v1/compounds')
                .set('Authorization', `Bearer ${testAccessToken}`)
                .send({
                    name: 'Edge Case Complex',
                    location: 'Test Location',
                    totalUnits: 2
                })
                .expect(201);

            const apartmentRes = await request(app.getHttpServer())
                .post('/api/v1/apartments')
                .set('Authorization', `Bearer ${testAccessToken}`)
                .send({
                    compoundId: compoundRes.body.id,
                    unitNumber: 'EdgeUnit',
                    bedrooms: 1,
                    bathrooms: 1,
                    squareFeet: 500,
                    status: 'available'
                })
                .expect(201);

            const tenant1Res = await request(app.getHttpServer())
                .post('/api/v1/tenants')
                .set('Authorization', `Bearer ${testAccessToken}`)
                .send({
                    firstName: 'Tenant1',
                    lastName: 'Edge',
                    email: `tenant1-edge-${Date.now()}@example.com`,
                    phoneNumber: '+1-555-0200',
                    idType: 'passport',
                    idNumber: `EDGE1-${Date.now()}`
                })
                .expect(201);

            const tenant2Res = await request(app.getHttpServer())
                .post('/api/v1/tenants')
                .set('Authorization', `Bearer ${testAccessToken}`)
                .send({
                    firstName: 'Tenant2',
                    lastName: 'Edge',
                    email: `tenant2-edge-${Date.now()}@example.com`,
                    phoneNumber: '+1-555-0201',
                    idType: 'passport',
                    idNumber: `EDGE2-${Date.now()}`
                })
                .expect(201);

            // Create first occupancy
            await request(app.getHttpServer())
                .post('/api/v1/occupancies')
                .set('Authorization', `Bearer ${testAccessToken}`)
                .send({
                    apartmentId: apartmentRes.body.id,
                    tenantId: tenant1Res.body.id,
                    moveInDate: new Date('2024-01-01'),
                    moveOutDate: new Date('2024-12-31'),
                    monthlyRent: 1000,
                    depositAmount: 2000,
                    leaseTermMonths: 12,
                    status: 'active'
                })
                .expect(201);

            // Try to create overlapping occupancy with same apartment
            return request(app.getHttpServer())
                .post('/api/v1/occupancies')
                .set('Authorization', `Bearer ${testAccessToken}`)
                .send({
                    apartmentId: apartmentRes.body.id,
                    tenantId: tenant2Res.body.id,
                    moveInDate: new Date('2024-06-01'),
                    moveOutDate: new Date('2025-06-01'),
                    monthlyRent: 1000,
                    depositAmount: 2000,
                    leaseTermMonths: 12,
                    status: 'active'
                })
                .expect(409); // Conflict - apartment already occupied
        });
    });
});
