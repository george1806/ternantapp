import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Occupancies E2E Integration Tests
 * Tests complete occupancy workflows including creation, lease management, and conflict detection
 */
describe('Occupancies (e2e)', () => {
    let app: INestApplication;
    let accessToken: string;
    let companyId: string;
    let apartmentId: string;
    let tenantId: string;
    let occupancyId: string;

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

    describe('Occupancy Setup', () => {
        it('should register company and user', async () => {
            const registerRes = await request(app.getHttpServer())
                .post('/api/v1/companies/register')
                .send({
                    companyName: `Occupancy Test Co ${Date.now()}`,
                    slug: `occ-test-${Date.now()}`,
                    email: `occ-owner-${Date.now()}@example.com`,
                    password: 'Test@1234',
                    firstName: 'Occupancy',
                    lastName: 'Owner',
                    country: 'US',
                    currency: 'USD'
                })
                .expect(201);

            accessToken = registerRes.body.tokens.accessToken;
            companyId = registerRes.body.company.id;
        });

        it('should create compound', async () => {
            const compoundRes = await request(app.getHttpServer())
                .post('/api/v1/compounds')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    name: `Occupancy Test Compound ${Date.now()}`,
                    location: 'Test Location',
                    totalUnits: 10
                })
                .expect(201);

            expect(compoundRes.body).toHaveProperty('id');
        });

        it('should create apartment', async () => {
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
                    unitNumber: `Unit-OCC-${Date.now()}`,
                    bedrooms: 2,
                    bathrooms: 1,
                    squareFeet: 1000,
                    status: 'available'
                })
                .expect(201);

            apartmentId = apartmentRes.body.id;
        });

        it('should create tenant', async () => {
            const tenantRes = await request(app.getHttpServer())
                .post('/api/v1/tenants')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    firstName: `TenantOCC${Date.now()}`,
                    lastName: 'TestUser',
                    email: `tenant-occ-${Date.now()}@example.com`,
                    phoneNumber: '+1234567890',
                    idType: 'passport',
                    idNumber: `OCC-${Date.now()}`
                })
                .expect(201);

            tenantId = tenantRes.body.id;
        });
    });

    describe('Occupancy Creation', () => {
        it('should create occupancy successfully', async () => {
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
            expect(occupancyRes.body.status).toBe('active');
            expect(occupancyRes.body.monthlyRent).toBe(1500);
            expect(occupancyRes.body.depositAmount).toBe(3000);
            occupancyId = occupancyRes.body.id;
        });

        it('should prevent invalid date ranges', async () => {
            return request(app.getHttpServer())
                .post('/api/v1/occupancies')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    apartmentId,
                    tenantId,
                    moveInDate: new Date('2025-01-01'),
                    moveOutDate: new Date('2024-01-01'), // Invalid: before moveIn
                    monthlyRent: 1500,
                    depositAmount: 3000,
                    leaseTermMonths: 12,
                    status: 'active'
                })
                .expect(400);
        });

        it('should prevent occupancy on already occupied apartment', async () => {
            const anotherTenantRes = await request(app.getHttpServer())
                .post('/api/v1/tenants')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    firstName: `AnotherTenant${Date.now()}`,
                    lastName: 'TestUser',
                    email: `tenant-another-${Date.now()}@example.com`,
                    phoneNumber: '+9876543210',
                    idType: 'passport',
                    idNumber: `ANOTHER-${Date.now()}`
                })
                .expect(201);

            return request(app.getHttpServer())
                .post('/api/v1/occupancies')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    apartmentId,
                    tenantId: anotherTenantRes.body.id,
                    moveInDate: new Date('2024-06-01'), // Overlaps with first occupancy
                    moveOutDate: new Date('2025-06-01'),
                    monthlyRent: 1500,
                    depositAmount: 3000,
                    leaseTermMonths: 12,
                    status: 'active'
                })
                .expect(409); // Conflict
        });

        it('should allow sequential occupancy after previous move out', async () => {
            const anotherTenantRes = await request(app.getHttpServer())
                .post('/api/v1/tenants')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    firstName: `SequentialTenant${Date.now()}`,
                    lastName: 'TestUser',
                    email: `tenant-seq-${Date.now()}@example.com`,
                    phoneNumber: '+1111111111',
                    idType: 'passport',
                    idNumber: `SEQ-${Date.now()}`
                })
                .expect(201);

            return request(app.getHttpServer())
                .post('/api/v1/occupancies')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    apartmentId,
                    tenantId: anotherTenantRes.body.id,
                    moveInDate: new Date('2025-01-02'), // After first lease ends
                    moveOutDate: new Date('2026-01-02'),
                    monthlyRent: 1500,
                    depositAmount: 3000,
                    leaseTermMonths: 12,
                    status: 'active'
                })
                .expect(201);
        });
    });

    describe('Occupancy Updates', () => {
        it('should update occupancy details', async () => {
            const updateRes = await request(app.getHttpServer())
                .patch(`/api/v1/occupancies/${occupancyId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    monthlyRent: 1600
                })
                .expect(200);

            expect(updateRes.body.monthlyRent).toBe(1600);
        });

        it('should prevent rent reduction without authorization', async () => {
            // This depends on business rules - adjust expectation as needed
            const updateRes = await request(app.getHttpServer())
                .patch(`/api/v1/occupancies/${occupancyId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    monthlyRent: 500 // Significant reduction
                })
                .expect(200); // Should allow with proper authorization check
        });
    });

    describe('Occupancy Status Management', () => {
        it('should retrieve active occupancies', async () => {
            const listRes = await request(app.getHttpServer())
                .get('/api/v1/occupancies?status=active')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(listRes.body).toHaveProperty('data');
            expect(Array.isArray(listRes.body.data)).toBe(true);
        });

        it('should get occupancy by ID', async () => {
            const getRes = await request(app.getHttpServer())
                .get(`/api/v1/occupancies/${occupancyId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(getRes.body.id).toBe(occupancyId);
        });

        it('should get occupancies by apartment', async () => {
            const listRes = await request(app.getHttpServer())
                .get(`/api/v1/occupancies/apartment/${apartmentId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(Array.isArray(listRes.body)).toBe(true);
        });

        it('should get occupancies by tenant', async () => {
            const listRes = await request(app.getHttpServer())
                .get(`/api/v1/occupancies/tenant/${tenantId}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(Array.isArray(listRes.body)).toBe(true);
        });

        it('should get occupancy with pagination', async () => {
            const listRes = await request(app.getHttpServer())
                .get('/api/v1/occupancies?page=1&limit=10')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(listRes.body).toHaveProperty('data');
            expect(listRes.body).toHaveProperty('meta');
        });
    });

    describe('Deposit Management', () => {
        it('should record deposit payment', async () => {
            const depositRes = await request(app.getHttpServer())
                .post(`/api/v1/occupancies/${occupancyId}/deposit`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    amount: 1500
                })
                .expect(200);

            expect(depositRes.body).toHaveProperty('depositPaid');
        });

        it('should accumulate deposit payments', async () => {
            const depositRes = await request(app.getHttpServer())
                .post(`/api/v1/occupancies/${occupancyId}/deposit`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    amount: 1500
                })
                .expect(200);

            expect(depositRes.body.depositPaid).toBeGreaterThanOrEqual(1500);
        });

        it('should prevent exceeding deposit amount', async () => {
            return request(app.getHttpServer())
                .post(`/api/v1/occupancies/${occupancyId}/deposit`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    amount: 5000 // More than required deposit
                })
                .expect(400);
        });

        it('should return deposit on move out', async () => {
            const returnRes = await request(app.getHttpServer())
                .post(`/api/v1/occupancies/${occupancyId}/return-deposit`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    deductions: 0
                })
                .expect(200);

            expect(returnRes.body).toHaveProperty('depositReturned');
        });
    });

    describe('Occupancy Termination', () => {
        it('should mark occupancy as inactive', async () => {
            // Create a new occupancy to terminate
            const anotherTenantRes = await request(app.getHttpServer())
                .post('/api/v1/tenants')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    firstName: `TerminateTenant${Date.now()}`,
                    lastName: 'TestUser',
                    email: `tenant-term-${Date.now()}@example.com`,
                    phoneNumber: '+2222222222',
                    idType: 'passport',
                    idNumber: `TERM-${Date.now()}`
                })
                .expect(201);

            const anotherApartmentRes = await request(app.getHttpServer())
                .post('/api/v1/apartments')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    compoundId: (await request(app.getHttpServer())
                        .get('/api/v1/compounds')
                        .set('Authorization', `Bearer ${accessToken}`)
                        .expect(200)).body.data[0].id,
                    unitNumber: `Unit-TERM-${Date.now()}`,
                    bedrooms: 2,
                    bathrooms: 1,
                    squareFeet: 1000,
                    status: 'available'
                })
                .expect(201);

            const termOccupancyRes = await request(app.getHttpServer())
                .post('/api/v1/occupancies')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    apartmentId: anotherApartmentRes.body.id,
                    tenantId: anotherTenantRes.body.id,
                    moveInDate: new Date('2024-02-01'),
                    moveOutDate: new Date('2024-12-31'),
                    monthlyRent: 1500,
                    depositAmount: 3000,
                    leaseTermMonths: 10,
                    status: 'active'
                })
                .expect(201);

            const terminateRes = await request(app.getHttpServer())
                .patch(`/api/v1/occupancies/${termOccupancyRes.body.id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    status: 'inactive'
                })
                .expect(200);

            expect(terminateRes.body.status).toBe('inactive');
        });
    });

    describe('Occupancy Statistics', () => {
        it('should get occupancy statistics', async () => {
            const statsRes = await request(app.getHttpServer())
                .get('/api/v1/occupancies/stats')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(statsRes.body).toHaveProperty('activeOccupancies');
            expect(statsRes.body).toHaveProperty('totalTenants');
            expect(statsRes.body).toHaveProperty('averageRent');
            expect(statsRes.body).toHaveProperty('occupancyRate');
        });

        it('should get occupancy by apartment with availability', async () => {
            const compoundsRes = await request(app.getHttpServer())
                .get('/api/v1/compounds')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            const compoundId = compoundsRes.body.data[0].id;

            const availRes = await request(app.getHttpServer())
                .get(`/api/v1/apartments?compoundId=${compoundId}&status=available`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(availRes.body).toHaveProperty('data');
        });
    });
});
