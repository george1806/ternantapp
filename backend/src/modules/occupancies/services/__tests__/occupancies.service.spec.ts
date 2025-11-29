import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { OccupanciesService } from '../occupancies.service';
import { Occupancy } from '../../entities/occupancy.entity';
import { Tenant } from '../../../tenants/entities/tenant.entity';
import { Apartment } from '../../../apartments/entities/apartment.entity';

describe('OccupanciesService', () => {
  let service: OccupanciesService;
  let occupanciesRepository: jest.Mocked<Repository<Occupancy>>;
  let tenantsRepository: jest.Mocked<Repository<Tenant>>;
  let apartmentsRepository: jest.Mocked<Repository<Apartment>>;

  const companyId = 'test-company-1';
  const occupancyId = 'occupancy-1';
  const tenantId = 'tenant-1';
  const apartmentId = 'apt-1';

  const mockTenant: Tenant = {
    id: tenantId,
    companyId,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phoneNumber: '1234567890',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  } as any;

  const mockApartment: Apartment = {
    id: apartmentId,
    companyId,
    unitNumber: '101',
    compoundId: 'compound-1',
    bedrooms: 2,
    bathrooms: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  } as any;

  const mockOccupancy: Occupancy = {
    id: occupancyId,
    companyId,
    apartmentId,
    tenantId,
    monthlyRent: 1000,
    securityDeposit: 2000,
    depositPaid: 0,
    leaseStartDate: new Date('2024-01-01'),
    leaseEndDate: new Date('2024-12-31'),
    status: 'pending',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    tenant: mockTenant,
    apartment: mockApartment
  } as any;

  beforeEach(async () => {
    occupanciesRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn()
    } as any;

    tenantsRepository = {
      findOne: jest.fn()
    } as any;

    apartmentsRepository = {
      findOne: jest.fn()
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OccupanciesService,
        {
          provide: getRepositoryToken(Occupancy),
          useValue: occupanciesRepository
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: tenantsRepository
        },
        {
          provide: getRepositoryToken(Apartment),
          useValue: apartmentsRepository
        }
      ]
    }).compile();

    service = module.get<OccupanciesService>(OccupanciesService);
  });

  describe('create', () => {
    const createDto = {
      apartmentId,
      tenantId,
      monthlyRent: 1000,
      securityDeposit: 2000,
      leaseStartDate: new Date('2024-01-01'),
      leaseEndDate: new Date('2024-12-31')
    };

    it('should create a new occupancy successfully', async () => {
      tenantsRepository.findOne.mockResolvedValueOnce(mockTenant);
      apartmentsRepository.findOne.mockResolvedValueOnce(mockApartment);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValueOnce(null)
      };

      occupanciesRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);
      occupanciesRepository.create.mockReturnValueOnce(mockOccupancy);
      occupanciesRepository.save.mockResolvedValueOnce(mockOccupancy);

      const result = await service.create(createDto, companyId);

      expect(result).toEqual(mockOccupancy);
      expect(occupanciesRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if end date is before start date', async () => {
      const invalidDto = {
        ...createDto,
        leaseEndDate: new Date('2023-12-31')
      };

      await expect(service.create(invalidDto, companyId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if end date equals start date', async () => {
      const invalidDto = {
        ...createDto,
        leaseEndDate: createDto.leaseStartDate
      };

      await expect(service.create(invalidDto, companyId)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if tenant not found', async () => {
      tenantsRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.create(createDto, companyId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if apartment not found', async () => {
      tenantsRepository.findOne.mockResolvedValueOnce(mockTenant);
      apartmentsRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.create(createDto, companyId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if apartment has conflicting occupancy', async () => {
      tenantsRepository.findOne.mockResolvedValueOnce(mockTenant);
      apartmentsRepository.findOne.mockResolvedValueOnce(mockApartment);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValueOnce(mockOccupancy)
      };

      occupanciesRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);

      await expect(service.create(createDto, companyId)).rejects.toThrow(ConflictException);
    });
  });

  describe('checkApartmentAvailability', () => {
    it('should return null if apartment is available', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValueOnce(null)
      };

      occupanciesRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);

      const result = await service.checkApartmentAvailability(
        apartmentId,
        companyId,
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      expect(result).toBeNull();
    });

    it('should return conflicting occupancy if dates overlap', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValueOnce(mockOccupancy)
      };

      occupanciesRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);

      const result = await service.checkApartmentAvailability(
        apartmentId,
        companyId,
        new Date('2024-06-01'),
        new Date('2024-07-31')
      );

      expect(result).toEqual(mockOccupancy);
    });

    it('should exclude specific occupancy when provided', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValueOnce(null)
      };

      occupanciesRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);

      await service.checkApartmentAvailability(
        apartmentId,
        companyId,
        new Date('2024-01-01'),
        new Date('2024-12-31'),
        occupancyId
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'occupancy.id != :excludeOccupancyId',
        { excludeOccupancyId: occupancyId }
      );
    });

    it('should detect overlapping leases (existing starts within new range)', async () => {
      const existingOccupancy = {
        ...mockOccupancy,
        leaseStartDate: new Date('2024-06-15'),
        leaseEndDate: new Date('2025-06-15')
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValueOnce(existingOccupancy)
      };

      occupanciesRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);

      const result = await service.checkApartmentAvailability(
        apartmentId,
        companyId,
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      expect(result).toEqual(existingOccupancy);
    });

    it('should detect overlapping leases (new starts within existing range)', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValueOnce(mockOccupancy)
      };

      occupanciesRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);

      const result = await service.checkApartmentAvailability(
        apartmentId,
        companyId,
        new Date('2024-06-15'),
        new Date('2025-06-15')
      );

      expect(result).toEqual(mockOccupancy);
    });
  });

  describe('findAll', () => {
    it('should find all active occupancies for company', async () => {
      occupanciesRepository.find.mockResolvedValueOnce([mockOccupancy]);

      const result = await service.findAll(companyId);

      expect(result).toEqual([mockOccupancy]);
      expect(occupanciesRepository.find).toHaveBeenCalledWith({
        where: { companyId, isActive: true },
        relations: ['tenant', 'apartment'],
        order: { leaseStartDate: 'DESC' }
      });
    });

    it('should filter by status', async () => {
      occupanciesRepository.find.mockResolvedValueOnce([mockOccupancy]);

      await service.findAll(companyId, 'active');

      expect(occupanciesRepository.find).toHaveBeenCalledWith({
        where: { companyId, isActive: true, status: 'active' },
        relations: ['tenant', 'apartment'],
        order: { leaseStartDate: 'DESC' }
      });
    });

    it('should include inactive occupancies when requested', async () => {
      occupanciesRepository.find.mockResolvedValueOnce([mockOccupancy]);

      await service.findAll(companyId, undefined, true);

      const call = occupanciesRepository.find.mock.calls[0][0];
      expect(call.where).not.toHaveProperty('isActive');
    });
  });

  describe('findByTenant', () => {
    it('should find occupancies for specific tenant', async () => {
      occupanciesRepository.find.mockResolvedValueOnce([mockOccupancy]);

      const result = await service.findByTenant(tenantId, companyId);

      expect(result).toEqual([mockOccupancy]);
      expect(occupanciesRepository.find).toHaveBeenCalledWith({
        where: { tenantId, companyId, isActive: true },
        relations: ['apartment', 'apartment.compound'],
        order: { leaseStartDate: 'DESC' }
      });
    });
  });

  describe('findByApartment', () => {
    it('should find occupancies for specific apartment', async () => {
      occupanciesRepository.find.mockResolvedValueOnce([mockOccupancy]);

      const result = await service.findByApartment(apartmentId, companyId);

      expect(result).toEqual([mockOccupancy]);
      expect(occupanciesRepository.find).toHaveBeenCalledWith({
        where: { apartmentId, companyId, isActive: true },
        relations: ['tenant'],
        order: { leaseStartDate: 'DESC' }
      });
    });
  });

  describe('findActive', () => {
    it('should find currently active occupancies', async () => {
      const activeOccupancy = {
        ...mockOccupancy,
        status: 'active',
        leaseStartDate: new Date('2024-01-01'),
        leaseEndDate: new Date('2025-12-31')
      };

      occupanciesRepository.find.mockResolvedValueOnce([activeOccupancy]);

      const result = await service.findActive(companyId);

      expect(result).toEqual([activeOccupancy]);
    });

    it('should only return active status occupancies', async () => {
      occupanciesRepository.find.mockResolvedValueOnce([]);

      await service.findActive(companyId);

      const call = occupanciesRepository.find.mock.calls[0][0];
      expect(call.where.status).toBe('active');
    });
  });

  describe('findExpiring', () => {
    it('should find leases expiring within specified days', async () => {
      const expiringOccupancy = {
        ...mockOccupancy,
        status: 'active',
        leaseEndDate: new Date()
      };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValueOnce([expiringOccupancy])
      };

      occupanciesRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);

      const result = await service.findExpiring(companyId, 30);

      expect(result).toEqual([expiringOccupancy]);
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });

    it('should use default of 30 days ahead', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValueOnce([])
      };

      occupanciesRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);

      await service.findExpiring(companyId);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(4);
    });
  });

  describe('getStats', () => {
    it('should calculate correct occupancy statistics', async () => {
      occupanciesRepository.count.mockResolvedValueOnce(10); // total
      occupanciesRepository.count.mockResolvedValueOnce(6); // active
      occupanciesRepository.count.mockResolvedValueOnce(2); // pending
      occupanciesRepository.count.mockResolvedValueOnce(2); // ended

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValueOnce(1)
      };

      occupanciesRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);

      const result = await service.getStats(companyId);

      expect(result.total).toBe(10);
      expect(result.active).toBe(6);
      expect(result.pending).toBe(2);
      expect(result.ended).toBe(2);
      expect(result.expiringThisMonth).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should find occupancy by id', async () => {
      occupanciesRepository.findOne.mockResolvedValueOnce(mockOccupancy);

      const result = await service.findOne(occupancyId, companyId);

      expect(result).toEqual(mockOccupancy);
      expect(occupanciesRepository.findOne).toHaveBeenCalledWith({
        where: { id: occupancyId, companyId },
        relations: ['tenant', 'apartment', 'apartment.compound']
      });
    });

    it('should throw NotFoundException if occupancy not found', async () => {
      occupanciesRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.findOne(occupancyId, companyId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = {
      monthlyRent: 1200,
      notes: 'Updated notes'
    };

    it('should update occupancy successfully', async () => {
      occupanciesRepository.findOne.mockResolvedValueOnce(mockOccupancy);
      occupanciesRepository.save.mockResolvedValueOnce({ ...mockOccupancy, ...updateDto });

      const result = await service.update(occupancyId, updateDto, companyId);

      expect(result.monthlyRent).toBe(1200);
      expect(occupanciesRepository.save).toHaveBeenCalled();
    });

    it('should validate new dates when updating lease dates', async () => {
      occupanciesRepository.findOne.mockResolvedValueOnce(mockOccupancy);

      const invalidDto = {
        leaseStartDate: new Date('2024-12-31'),
        leaseEndDate: new Date('2024-01-01')
      };

      await expect(service.update(occupancyId, invalidDto, companyId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should check for conflicts when updating dates', async () => {
      const occupancy = {
        ...mockOccupancy,
        leaseStartDate: new Date('2024-01-01'),
        leaseEndDate: new Date('2024-06-30')
      };

      occupanciesRepository.findOne.mockResolvedValueOnce(occupancy);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValueOnce(mockOccupancy)
      };

      occupanciesRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);

      const updateDto = {
        leaseStartDate: new Date('2024-07-01'),
        leaseEndDate: new Date('2024-12-31')
      };

      await expect(service.update(occupancyId, updateDto, companyId)).rejects.toThrow(
        ConflictException
      );
    });

    it('should allow updating without conflicting dates', async () => {
      occupanciesRepository.findOne.mockResolvedValueOnce(mockOccupancy);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValueOnce(null)
      };

      occupanciesRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);
      occupanciesRepository.save.mockResolvedValueOnce(mockOccupancy);

      const updateDto = {
        leaseStartDate: new Date('2024-02-01'),
        leaseEndDate: new Date('2024-11-30')
      };

      const result = await service.update(occupancyId, updateDto, companyId);

      expect(result).toBeDefined();
    });
  });

  describe('updateStatus', () => {
    it('should update occupancy status', async () => {
      occupanciesRepository.findOne.mockResolvedValueOnce(mockOccupancy);
      occupanciesRepository.save.mockResolvedValueOnce({ ...mockOccupancy, status: 'active' });

      const result = await service.updateStatus(occupancyId, 'active', companyId);

      expect(result.status).toBe('active');
    });
  });

  describe('endOccupancy', () => {
    it('should mark occupancy as ended', async () => {
      const activeOccupancy = { ...mockOccupancy, status: 'active' };
      occupanciesRepository.findOne.mockResolvedValueOnce(activeOccupancy);
      occupanciesRepository.save.mockResolvedValueOnce({ ...activeOccupancy, status: 'ended' });

      const result = await service.endOccupancy(occupancyId, companyId);

      expect(result.status).toBe('ended');
    });

    it('should set move out date if provided', async () => {
      const activeOccupancy = { ...mockOccupancy, status: 'active' };
      occupanciesRepository.findOne.mockResolvedValueOnce(activeOccupancy);
      const moveOutDate = new Date('2024-12-31');
      occupanciesRepository.save.mockResolvedValueOnce({
        ...activeOccupancy,
        status: 'ended',
        moveOutDate
      });

      const result = await service.endOccupancy(occupancyId, companyId, moveOutDate.toISOString());

      expect(result.moveOutDate).toEqual(moveOutDate);
    });

    it('should throw BadRequestException if already ended', async () => {
      const endedOccupancy = { ...mockOccupancy, status: 'ended' };
      occupanciesRepository.findOne.mockResolvedValueOnce(endedOccupancy);

      await expect(service.endOccupancy(occupancyId, companyId)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('recordDepositPayment', () => {
    it('should record deposit payment', async () => {
      occupanciesRepository.findOne.mockResolvedValueOnce(mockOccupancy);
      const updatedOccupancy = { ...mockOccupancy, depositPaid: 1000 };
      occupanciesRepository.save.mockResolvedValueOnce(updatedOccupancy);

      const result = await service.recordDepositPayment(occupancyId, companyId, 1000);

      expect(result.depositPaid).toBe(1000);
    });

    it('should throw BadRequestException if payment exceeds security deposit', async () => {
      const occupancy = { ...mockOccupancy, securityDeposit: 2000, depositPaid: 1500 };
      occupanciesRepository.findOne.mockResolvedValueOnce(occupancy);

      await expect(
        service.recordDepositPayment(occupancyId, companyId, 600)
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow payment up to security deposit amount', async () => {
      const occupancy = { ...mockOccupancy, securityDeposit: 2000, depositPaid: 0 };
      occupanciesRepository.findOne.mockResolvedValueOnce(occupancy);
      const updatedOccupancy = { ...occupancy, depositPaid: 2000 };
      occupanciesRepository.save.mockResolvedValueOnce(updatedOccupancy);

      const result = await service.recordDepositPayment(occupancyId, companyId, 2000);

      expect(result.depositPaid).toBe(2000);
    });

    it('should accumulate partial deposit payments', async () => {
      const occupancy = { ...mockOccupancy, securityDeposit: 2000, depositPaid: 1000 };
      occupanciesRepository.findOne.mockResolvedValueOnce(occupancy);
      const updatedOccupancy = { ...occupancy, depositPaid: 1500 };
      occupanciesRepository.save.mockResolvedValueOnce(updatedOccupancy);

      const result = await service.recordDepositPayment(occupancyId, companyId, 500);

      expect(result.depositPaid).toBe(1500);
    });
  });

  describe('remove', () => {
    it('should soft delete pending occupancy', async () => {
      occupanciesRepository.findOne.mockResolvedValueOnce(mockOccupancy);
      occupanciesRepository.save.mockResolvedValueOnce({ ...mockOccupancy, isActive: false });

      await service.remove(occupancyId, companyId);

      const saveCall = occupanciesRepository.save.mock.calls[0][0];
      expect(saveCall.isActive).toBe(false);
    });

    it('should soft delete cancelled occupancy', async () => {
      const cancelledOccupancy = { ...mockOccupancy, status: 'cancelled' };
      occupanciesRepository.findOne.mockResolvedValueOnce(cancelledOccupancy);
      occupanciesRepository.save.mockResolvedValueOnce({
        ...cancelledOccupancy,
        isActive: false
      });

      await service.remove(occupancyId, companyId);

      const saveCall = occupanciesRepository.save.mock.calls[0][0];
      expect(saveCall.isActive).toBe(false);
    });

    it('should throw BadRequestException if trying to delete active occupancy', async () => {
      const activeOccupancy = { ...mockOccupancy, status: 'active' };
      occupanciesRepository.findOne.mockResolvedValueOnce(activeOccupancy);

      await expect(service.remove(occupancyId, companyId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('activate', () => {
    it('should reactivate deactivated occupancy', async () => {
      const inactiveOccupancy = { ...mockOccupancy, isActive: false };
      occupanciesRepository.findOne.mockResolvedValueOnce(inactiveOccupancy);
      occupanciesRepository.save.mockResolvedValueOnce({ ...inactiveOccupancy, isActive: true });

      const result = await service.activate(occupancyId, companyId);

      expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundException if occupancy not found', async () => {
      occupanciesRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.activate(occupancyId, companyId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Business Logic Edge Cases', () => {
    it('should prevent lease overlap detection in conflict check', async () => {
      const existingLease = {
        ...mockOccupancy,
        leaseStartDate: new Date('2024-06-01'),
        leaseEndDate: new Date('2024-12-31')
      };

      tenantsRepository.findOne.mockResolvedValueOnce(mockTenant);
      apartmentsRepository.findOne.mockResolvedValueOnce(mockApartment);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValueOnce(existingLease)
      };

      occupanciesRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);

      const createDto = {
        apartmentId,
        tenantId,
        monthlyRent: 1000,
        securityDeposit: 2000,
        leaseStartDate: new Date('2024-01-01'),
        leaseEndDate: new Date('2024-12-31')
      };

      await expect(service.create(createDto, companyId)).rejects.toThrow(ConflictException);
    });

    it('should handle adjacent (non-overlapping) leases', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValueOnce(null)
      };

      occupanciesRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);

      const result = await service.checkApartmentAvailability(
        apartmentId,
        companyId,
        new Date('2025-01-01'),
        new Date('2025-12-31'),
        occupancyId
      );

      expect(result).toBeNull();
    });

    it('should enforce company isolation', async () => {
      occupanciesRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.findOne(occupancyId, 'different-company')).rejects.toThrow(
        NotFoundException
      );

      expect(occupanciesRepository.findOne).toHaveBeenCalledWith({
        where: { id: occupancyId, companyId: 'different-company' },
        relations: ['tenant', 'apartment', 'apartment.compound']
      });
    });

    it('should prevent updating lease dates to be equal', async () => {
      occupanciesRepository.findOne.mockResolvedValueOnce(mockOccupancy);

      const sameDate = new Date('2024-06-01');
      const updateDto = {
        leaseStartDate: sameDate,
        leaseEndDate: sameDate
      };

      await expect(service.update(occupancyId, updateDto, companyId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should handle zero security deposit occupancies', async () => {
      const noDepositOccupancy = { ...mockOccupancy, securityDeposit: 0 };
      occupanciesRepository.findOne.mockResolvedValueOnce(noDepositOccupancy);

      await expect(service.recordDepositPayment(occupancyId, companyId, 100)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should handle tenant and apartment verification in create', async () => {
      tenantsRepository.findOne.mockResolvedValueOnce(null);

      const createDto = {
        apartmentId,
        tenantId,
        monthlyRent: 1000,
        securityDeposit: 2000,
        leaseStartDate: new Date('2024-01-01'),
        leaseEndDate: new Date('2024-12-31')
      };

      await expect(service.create(createDto, companyId)).rejects.toThrow(NotFoundException);
      expect(apartmentsRepository.findOne).not.toHaveBeenCalled();
    });
  });
});
