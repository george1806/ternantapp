import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Authentication (e2e)', () => {
    let app: INestApplication;
    let accessToken: string;
    let refreshToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule]
        }).compile();

        app = moduleFixture.createNestApplication();

        // Apply global pipes (same as main.ts)
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

    describe('/api/v1/auth/register (POST)', () => {
        it('should register a new user', () => {
            return request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .send({
                    email: `test-${Date.now()}@example.com`,
                    password: 'Test@1234',
                    firstName: 'Test',
                    lastName: 'User',
                    companyId: 'test-company-id'
                })
                .expect(201)
                .expect((res) => {
                    expect(res.body).toHaveProperty('accessToken');
                    expect(res.body).toHaveProperty('refreshToken');
                    expect(res.body).toHaveProperty('user');
                    expect(res.body.user).toHaveProperty('email');
                    expect(res.body.user).not.toHaveProperty('password');
                });
        });

        it('should return 400 for invalid email', () => {
            return request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .send({
                    email: 'invalid-email',
                    password: 'Test@1234',
                    firstName: 'Test',
                    lastName: 'User',
                    companyId: 'test-company-id'
                })
                .expect(400);
        });

        it('should return 400 for weak password', () => {
            return request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .send({
                    email: 'test@example.com',
                    password: '123',
                    firstName: 'Test',
                    lastName: 'User',
                    companyId: 'test-company-id'
                })
                .expect(400);
        });

        it('should return 400 for duplicate email', async () => {
            const email = `duplicate-${Date.now()}@example.com`;

            // First registration
            await request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .send({
                    email,
                    password: 'Test@1234',
                    firstName: 'Test',
                    lastName: 'User',
                    companyId: 'test-company-id'
                })
                .expect(201);

            // Second registration with same email
            return request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .send({
                    email,
                    password: 'Test@1234',
                    firstName: 'Test',
                    lastName: 'User',
                    companyId: 'test-company-id'
                })
                .expect(400);
        });
    });

    describe('/api/v1/auth/login (POST)', () => {
        const testUser = {
            email: `login-test-${Date.now()}@example.com`,
            password: 'Test@1234',
            firstName: 'Login',
            lastName: 'Test',
            companyId: 'test-company-id'
        };

        beforeAll(async () => {
            // Register user first
            await request(app.getHttpServer())
                .post('/api/v1/auth/register')
                .send(testUser)
                .expect(201);
        });

        it('should login successfully with valid credentials', () => {
            return request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({
                    email: testUser.email,
                    password: testUser.password
                })
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('accessToken');
                    expect(res.body).toHaveProperty('refreshToken');
                    expect(res.body).toHaveProperty('user');
                    accessToken = res.body.accessToken;
                    refreshToken = res.body.refreshToken;
                });
        });

        it('should return 401 for invalid password', () => {
            return request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({
                    email: testUser.email,
                    password: 'WrongPassword'
                })
                .expect(401);
        });

        it('should return 401 for non-existent user', () => {
            return request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'Test@1234'
                })
                .expect(401);
        });
    });

    describe('/api/v1/auth/me (GET)', () => {
        it('should return current user with valid token', () => {
            return request(app.getHttpServer())
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('id');
                    expect(res.body).toHaveProperty('email');
                    expect(res.body).toHaveProperty('firstName');
                    expect(res.body).toHaveProperty('lastName');
                    expect(res.body).not.toHaveProperty('password');
                });
        });

        it('should return 401 without token', () => {
            return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
        });

        it('should return 401 with invalid token', () => {
            return request(app.getHttpServer())
                .get('/api/v1/auth/me')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
        });
    });

    describe('/api/v1/auth/refresh (POST)', () => {
        it('should return new tokens with valid refresh token', () => {
            return request(app.getHttpServer())
                .post('/api/v1/auth/refresh')
                .send({
                    refreshToken
                })
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('accessToken');
                    expect(res.body).toHaveProperty('refreshToken');
                });
        });

        it('should return 401 with invalid refresh token', () => {
            return request(app.getHttpServer())
                .post('/api/v1/auth/refresh')
                .send({
                    refreshToken: 'invalid-refresh-token'
                })
                .expect(401);
        });
    });
});
