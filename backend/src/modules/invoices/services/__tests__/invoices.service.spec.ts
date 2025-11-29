import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InvoicesService } from '../invoices.service';
import { Invoice } from '../../entities/invoice.entity';
import { Occupancy } from '../../../occupancies/entities/occupancy.entity';
import { Tenant } from '../../../tenants/entities/tenant.entity';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let invoicesRepository: jest.Mocked<Repository<Invoice>>;
  let occupanciesRepository: jest.Mocked<Repository<Occupancy>>;
  let tenantsRepository: jest.Mocked<Repository<Tenant>>;

  const companyId = 'test-company-1';
  const invoiceId = 'invoice-1';
  const occupancyId = 'occupancy-1';
  const tenantId = 'tenant-1';

  const mockInvoice: Invoice = {
    id: invoiceId,
    companyId,
    invoiceNumber: 'INV-2024-001',
    occupancyId,
    tenantId,
    invoiceDate: new Date('2024-01-01'),
    dueDate: new Date('2024-01-05'),
    status: 'draft',
    lineItems: [{ description: 'Rent', quantity: 1, unitPrice: 1000, amount: 1000, type: 'rent' }],
    subtotal: 1000,
    taxAmount: 0,
    totalAmount: 1000,
    amountPaid: 0,
    paidDate: null,
    notes: 'Test invoice',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    tenant: { id: tenantId, firstName: 'John', lastName: 'Doe' } as any,
    occupancy: { id: occupancyId, monthlyRent: 1000 } as any
  };

  const mockOccupancy: Occupancy = {
    id: occupancyId,
    companyId,
    apartmentId: 'apt-1',
    tenantId,
    monthlyRent: 1000,
    isActive: true,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    createdAt: new Date(),
    updatedAt: new Date(),
    tenant: { id: tenantId } as any
  } as any;

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

  beforeEach(async () => {
    invoicesRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn()
    } as any;

    occupanciesRepository = {
      findOne: jest.fn()
    } as any;

    tenantsRepository = {
      findOne: jest.fn()
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        {
          provide: getRepositoryToken(Invoice),
          useValue: invoicesRepository
        },
        {
          provide: getRepositoryToken(Occupancy),
          useValue: occupanciesRepository
        },
        {
          provide: getRepositoryToken(Tenant),
          useValue: tenantsRepository
        }
      ]
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  describe('create', () => {
    const createDto = {
      invoiceNumber: 'INV-2024-001',
      occupancyId,
      tenantId,
      invoiceDate: new Date('2024-01-01'),
      dueDate: new Date('2024-01-05'),
      lineItems: [{ description: 'Rent', quantity: 1, unitPrice: 1000, amount: 1000, type: 'rent' }],
      subtotal: 1000,
      taxAmount: 0,
      totalAmount: 1000,
      notes: 'Test invoice'
    };

    it('should create a new invoice successfully', async () => {
      invoicesRepository.findOne.mockResolvedValueOnce(null);
      occupanciesRepository.findOne.mockResolvedValueOnce(mockOccupancy);
      tenantsRepository.findOne.mockResolvedValueOnce(mockTenant);
      invoicesRepository.create.mockReturnValueOnce(mockInvoice);
      invoicesRepository.save.mockResolvedValueOnce(mockInvoice);

      const result = await service.create(createDto, companyId);

      expect(result).toEqual(mockInvoice);
      expect(invoicesRepository.create).toHaveBeenCalledWith({
        ...createDto,
        companyId
      });
      expect(invoicesRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if invoice number already exists', async () => {
      invoicesRepository.findOne.mockResolvedValueOnce(mockInvoice);

      await expect(service.create(createDto, companyId)).rejects.toThrow(ConflictException);
      expect(invoicesRepository.findOne).toHaveBeenCalledWith({
        where: { companyId, invoiceNumber: createDto.invoiceNumber }
      });
    });

    it('should throw NotFoundException if occupancy not found', async () => {
      invoicesRepository.findOne.mockResolvedValueOnce(null);
      occupanciesRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.create(createDto, companyId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if tenant not found', async () => {
      invoicesRepository.findOne.mockResolvedValueOnce(null);
      occupanciesRepository.findOne.mockResolvedValueOnce(mockOccupancy);
      tenantsRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.create(createDto, companyId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if dueDate is before invoiceDate', async () => {
      invoicesRepository.findOne.mockResolvedValueOnce(null);
      occupanciesRepository.findOne.mockResolvedValueOnce(mockOccupancy);
      tenantsRepository.findOne.mockResolvedValueOnce(mockTenant);

      const invalidDto = {
        ...createDto,
        dueDate: new Date('2023-12-31')
      };

      await expect(service.create(invalidDto, companyId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateRentInvoice', () => {
    it('should generate rent invoice for active occupancy', async () => {
      occupanciesRepository.findOne.mockResolvedValueOnce(mockOccupancy);
      invoicesRepository.findOne.mockResolvedValueOnce(null);
      invoicesRepository.create.mockReturnValueOnce(mockInvoice);
      invoicesRepository.save.mockResolvedValueOnce(mockInvoice);

      const result = await service.generateRentInvoice(occupancyId, companyId, '2024-01', 5);

      expect(result).toEqual(mockInvoice);
      expect(occupanciesRepository.findOne).toHaveBeenCalledWith({
        where: { id: occupancyId, companyId, isActive: true },
        relations: ['tenant']
      });
      expect(invoicesRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if occupancy not found', async () => {
      occupanciesRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.generateRentInvoice(occupancyId, companyId, '2024-01')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if invoice already exists for period', async () => {
      occupanciesRepository.findOne.mockResolvedValueOnce(mockOccupancy);
      invoicesRepository.findOne.mockResolvedValueOnce(mockInvoice);

      await expect(
        service.generateRentInvoice(occupancyId, companyId, '2024-01')
      ).rejects.toThrow(ConflictException);
    });

    it('should generate correct invoice number format', async () => {
      occupanciesRepository.findOne.mockResolvedValueOnce(mockOccupancy);
      invoicesRepository.findOne.mockResolvedValueOnce(null);
      invoicesRepository.create.mockReturnValueOnce(mockInvoice);
      invoicesRepository.save.mockResolvedValueOnce(mockInvoice);

      await service.generateRentInvoice(occupancyId, companyId, '2024-01');

      const callArgs = invoicesRepository.create.mock.calls[0][0];
      expect(callArgs.invoiceNumber).toMatch(/^INV-202401-/);
    });

    it('should use default dueDay of 5', async () => {
      occupanciesRepository.findOne.mockResolvedValueOnce(mockOccupancy);
      invoicesRepository.findOne.mockResolvedValueOnce(null);
      invoicesRepository.create.mockReturnValueOnce(mockInvoice);
      invoicesRepository.save.mockResolvedValueOnce(mockInvoice);

      await service.generateRentInvoice(occupancyId, companyId, '2024-01');

      const callArgs = invoicesRepository.create.mock.calls[0][0];
      expect(callArgs.dueDate.getDate()).toBe(5);
    });
  });

  describe('findAll', () => {
    it('should find all active invoices for company', async () => {
      invoicesRepository.find.mockResolvedValueOnce([mockInvoice]);

      const result = await service.findAll(companyId);

      expect(result).toEqual([mockInvoice]);
      expect(invoicesRepository.find).toHaveBeenCalledWith({
        where: { companyId, isActive: true },
        relations: ['tenant', 'occupancy'],
        order: { invoiceDate: 'DESC' }
      });
    });

    it('should filter by status', async () => {
      invoicesRepository.find.mockResolvedValueOnce([mockInvoice]);

      await service.findAll(companyId, 'draft');

      expect(invoicesRepository.find).toHaveBeenCalledWith({
        where: { companyId, isActive: true, status: 'draft' },
        relations: ['tenant', 'occupancy'],
        order: { invoiceDate: 'DESC' }
      });
    });

    it('should include inactive invoices when requested', async () => {
      invoicesRepository.find.mockResolvedValueOnce([mockInvoice]);

      await service.findAll(companyId, undefined, true);

      const call = invoicesRepository.find.mock.calls[0][0];
      expect(call.where).not.toHaveProperty('isActive');
    });
  });

  describe('findByTenant', () => {
    it('should find invoices for specific tenant', async () => {
      invoicesRepository.find.mockResolvedValueOnce([mockInvoice]);

      const result = await service.findByTenant(tenantId, companyId);

      expect(result).toEqual([mockInvoice]);
      expect(invoicesRepository.find).toHaveBeenCalledWith({
        where: { tenantId, companyId, isActive: true },
        relations: ['occupancy'],
        order: { invoiceDate: 'DESC' }
      });
    });
  });

  describe('findByOccupancy', () => {
    it('should find invoices for specific occupancy', async () => {
      invoicesRepository.find.mockResolvedValueOnce([mockInvoice]);

      const result = await service.findByOccupancy(occupancyId, companyId);

      expect(result).toEqual([mockInvoice]);
      expect(invoicesRepository.find).toHaveBeenCalledWith({
        where: { occupancyId, companyId, isActive: true },
        relations: ['tenant'],
        order: { invoiceDate: 'DESC' }
      });
    });
  });

  describe('findOverdue', () => {
    it('should find overdue invoices', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValueOnce([mockInvoice])
      };

      invoicesRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);

      const result = await service.findOverdue(companyId);

      expect(result).toEqual([mockInvoice]);
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });
  });

  describe('findDueSoon', () => {
    it('should find invoices due within specified days', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValueOnce([mockInvoice])
      };

      invoicesRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);

      const result = await service.findDueSoon(companyId, 7);

      expect(result).toEqual([mockInvoice]);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(4);
    });

    it('should use default of 7 days ahead', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValueOnce([])
      };

      invoicesRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);

      await service.findDueSoon(companyId);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(4);
    });
  });

  describe('getStats', () => {
    it('should calculate correct invoice statistics', async () => {
      const paidInvoice = { ...mockInvoice, status: 'paid' };
      const draftInvoice = { ...mockInvoice, status: 'draft' };
      const sentInvoice = { ...mockInvoice, status: 'sent' };

      invoicesRepository.count.mockResolvedValueOnce(3); // total
      invoicesRepository.count.mockResolvedValueOnce(1); // draft
      invoicesRepository.count.mockResolvedValueOnce(1); // sent
      invoicesRepository.count.mockResolvedValueOnce(1); // paid

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValueOnce(0)
      };

      invoicesRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);
      invoicesRepository.find.mockResolvedValueOnce([sentInvoice]);

      const result = await service.getStats(companyId);

      expect(result.total).toBe(3);
      expect(result.draft).toBe(1);
      expect(result.sent).toBe(1);
      expect(result.paid).toBe(1);
      expect(result.overdue).toBe(0);
    });

    it('should calculate total outstanding amount correctly', async () => {
      const unpaidInvoice = {
        ...mockInvoice,
        totalAmount: 1000,
        amountPaid: 300
      };

      invoicesRepository.count.mockResolvedValue(1);
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValueOnce(0)
      };

      invoicesRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);
      invoicesRepository.find.mockResolvedValueOnce([unpaidInvoice]);

      const result = await service.getStats(companyId);

      expect(result.totalOutstanding).toBe(700);
    });
  });

  describe('findOne', () => {
    it('should find invoice by id', async () => {
      invoicesRepository.findOne.mockResolvedValueOnce(mockInvoice);

      const result = await service.findOne(invoiceId, companyId);

      expect(result).toEqual(mockInvoice);
      expect(invoicesRepository.findOne).toHaveBeenCalledWith({
        where: { id: invoiceId, companyId },
        relations: ['tenant', 'occupancy', 'occupancy.apartment']
      });
    });

    it('should throw NotFoundException if invoice not found', async () => {
      invoicesRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.findOne(invoiceId, companyId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = {
      invoiceNumber: 'INV-2024-002',
      notes: 'Updated notes'
    };

    it('should update invoice successfully', async () => {
      invoicesRepository.findOne.mockResolvedValueOnce(mockInvoice);
      invoicesRepository.save.mockResolvedValueOnce({ ...mockInvoice, ...updateDto });

      const result = await service.update(invoiceId, updateDto, companyId);

      expect(result.notes).toBe('Updated notes');
      expect(invoicesRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if updating paid invoice', async () => {
      const paidInvoice = { ...mockInvoice, status: 'paid' };
      invoicesRepository.findOne.mockResolvedValueOnce(paidInvoice);

      await expect(service.update(invoiceId, updateDto, companyId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if updating cancelled invoice', async () => {
      const cancelledInvoice = { ...mockInvoice, status: 'cancelled' };
      invoicesRepository.findOne.mockResolvedValueOnce(cancelledInvoice);

      await expect(service.update(invoiceId, updateDto, companyId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw ConflictException if new invoice number already exists', async () => {
      invoicesRepository.findOne.mockResolvedValueOnce(mockInvoice);
      invoicesRepository.findOne.mockResolvedValueOnce({ ...mockInvoice, invoiceNumber: 'INV-2024-002' });

      await expect(service.update(invoiceId, updateDto, companyId)).rejects.toThrow(
        ConflictException
      );
    });

    it('should allow updating with same invoice number', async () => {
      const sameNumberDto = { invoiceNumber: mockInvoice.invoiceNumber };
      invoicesRepository.findOne.mockResolvedValueOnce(mockInvoice);
      invoicesRepository.save.mockResolvedValueOnce(mockInvoice);

      const result = await service.update(invoiceId, sameNumberDto, companyId);

      expect(result).toEqual(mockInvoice);
    });
  });

  describe('updateStatus', () => {
    it('should update invoice status', async () => {
      invoicesRepository.findOne.mockResolvedValueOnce(mockInvoice);
      invoicesRepository.save.mockResolvedValueOnce({ ...mockInvoice, status: 'sent' });

      const result = await service.updateStatus(invoiceId, 'sent', companyId);

      expect(result.status).toBe('sent');
    });

    it('should set paidDate when marking as paid', async () => {
      invoicesRepository.findOne.mockResolvedValueOnce(mockInvoice);
      const updatedInvoice = { ...mockInvoice, status: 'paid', paidDate: new Date() };
      invoicesRepository.save.mockResolvedValueOnce(updatedInvoice);

      const result = await service.updateStatus(invoiceId, 'paid', companyId);

      expect(result.status).toBe('paid');
      expect(result.paidDate).toBeDefined();
    });

    it('should set amountPaid to totalAmount when marking as paid', async () => {
      const unpaidInvoice = { ...mockInvoice, amountPaid: 0 };
      invoicesRepository.findOne.mockResolvedValueOnce(unpaidInvoice);
      const paidInvoice = { ...unpaidInvoice, amountPaid: unpaidInvoice.totalAmount, status: 'paid', paidDate: new Date() };
      invoicesRepository.save.mockResolvedValueOnce(paidInvoice);

      const result = await service.updateStatus(invoiceId, 'paid', companyId);

      expect(result.amountPaid).toBe(result.totalAmount);
    });
  });

  describe('recordPayment', () => {
    it('should record payment on invoice', async () => {
      invoicesRepository.findOne.mockResolvedValueOnce(mockInvoice);
      const paidInvoice = { ...mockInvoice, amountPaid: 500 };
      invoicesRepository.save.mockResolvedValueOnce(paidInvoice);

      const result = await service.recordPayment(invoiceId, companyId, 500);

      expect(result.amountPaid).toBe(500);
    });

    it('should throw BadRequestException if payment exceeds invoice total', async () => {
      invoicesRepository.findOne.mockResolvedValueOnce(mockInvoice);

      await expect(
        service.recordPayment(invoiceId, companyId, 2000)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if recording payment on cancelled invoice', async () => {
      const cancelledInvoice = { ...mockInvoice, status: 'cancelled' };
      invoicesRepository.findOne.mockResolvedValueOnce(cancelledInvoice);

      await expect(
        service.recordPayment(invoiceId, companyId, 100)
      ).rejects.toThrow(BadRequestException);
    });

    it('should auto-update status to paid when fully paid', async () => {
      invoicesRepository.findOne.mockResolvedValueOnce(mockInvoice);
      const fullyPaidInvoice = { ...mockInvoice, amountPaid: 1000, status: 'paid', paidDate: new Date() };
      invoicesRepository.save.mockResolvedValueOnce(fullyPaidInvoice);

      const result = await service.recordPayment(invoiceId, companyId, 1000);

      expect(result.status).toBe('paid');
      expect(result.paidDate).toBeDefined();
    });

    it('should accumulate partial payments', async () => {
      const partiallyPaid = { ...mockInvoice, amountPaid: 300 };
      invoicesRepository.findOne.mockResolvedValueOnce(partiallyPaid);
      const newPartiallyPaid = { ...partiallyPaid, amountPaid: 700 };
      invoicesRepository.save.mockResolvedValueOnce(newPartiallyPaid);

      const result = await service.recordPayment(invoiceId, companyId, 400);

      expect(result.amountPaid).toBe(700);
    });
  });

  describe('markAsSent', () => {
    it('should mark invoice as sent', async () => {
      invoicesRepository.findOne.mockResolvedValueOnce(mockInvoice);
      invoicesRepository.save.mockResolvedValueOnce({ ...mockInvoice, status: 'sent' });

      const result = await service.markAsSent(invoiceId, companyId);

      expect(result.status).toBe('sent');
    });
  });

  describe('cancel', () => {
    it('should cancel invoice', async () => {
      invoicesRepository.findOne.mockResolvedValueOnce(mockInvoice);
      invoicesRepository.save.mockResolvedValueOnce({ ...mockInvoice, status: 'cancelled' });

      const result = await service.cancel(invoiceId, companyId);

      expect(result.status).toBe('cancelled');
    });

    it('should throw BadRequestException if cancelling paid invoice', async () => {
      const paidInvoice = { ...mockInvoice, status: 'paid' };
      invoicesRepository.findOne.mockResolvedValueOnce(paidInvoice);

      await expect(service.cancel(invoiceId, companyId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should soft delete draft invoice', async () => {
      invoicesRepository.findOne.mockResolvedValueOnce(mockInvoice);
      invoicesRepository.save.mockResolvedValueOnce({ ...mockInvoice, isActive: false });

      await service.remove(invoiceId, companyId);

      const saveCall = invoicesRepository.save.mock.calls[0][0];
      expect(saveCall.isActive).toBe(false);
    });

    it('should soft delete cancelled invoice', async () => {
      const cancelledInvoice = { ...mockInvoice, status: 'cancelled' };
      invoicesRepository.findOne.mockResolvedValueOnce(cancelledInvoice);
      invoicesRepository.save.mockResolvedValueOnce({ ...cancelledInvoice, isActive: false });

      await service.remove(invoiceId, companyId);

      const saveCall = invoicesRepository.save.mock.calls[0][0];
      expect(saveCall.isActive).toBe(false);
    });

    it('should throw BadRequestException if trying to delete sent invoice', async () => {
      const sentInvoice = { ...mockInvoice, status: 'sent' };
      invoicesRepository.findOne.mockResolvedValueOnce(sentInvoice);

      await expect(service.remove(invoiceId, companyId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if trying to delete paid invoice', async () => {
      const paidInvoice = { ...mockInvoice, status: 'paid' };
      invoicesRepository.findOne.mockResolvedValueOnce(paidInvoice);

      await expect(service.remove(invoiceId, companyId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('activate', () => {
    it('should reactivate deactivated invoice', async () => {
      const inactiveInvoice = { ...mockInvoice, isActive: false };
      invoicesRepository.findOne.mockResolvedValueOnce(inactiveInvoice);
      invoicesRepository.save.mockResolvedValueOnce({ ...inactiveInvoice, isActive: true });

      const result = await service.activate(invoiceId, companyId);

      expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundException if invoice not found', async () => {
      invoicesRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.activate(invoiceId, companyId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Business Logic Edge Cases', () => {
    it('should handle zero amount payment', async () => {
      invoicesRepository.findOne.mockResolvedValueOnce(mockInvoice);
      invoicesRepository.save.mockResolvedValueOnce(mockInvoice);

      const result = await service.recordPayment(invoiceId, companyId, 0);

      expect(result.amountPaid).toBe(0);
    });

    it('should handle multiple partial payments accumulation', async () => {
      const invoice1 = { ...mockInvoice, amountPaid: 0 };
      const invoice2 = { ...mockInvoice, amountPaid: 200 };
      const invoice3 = { ...mockInvoice, amountPaid: 600 };

      invoicesRepository.findOne.mockResolvedValueOnce(invoice1);
      invoicesRepository.save.mockResolvedValueOnce(invoice2);
      invoicesRepository.findOne.mockResolvedValueOnce(invoice2);
      invoicesRepository.save.mockResolvedValueOnce(invoice3);

      let result = await service.recordPayment(invoiceId, companyId, 200);
      expect(result.amountPaid).toBe(200);

      result = await service.recordPayment(invoiceId, companyId, 400);
      expect(result.amountPaid).toBe(600);
    });

    it('should prevent overpayment by exact amount check', async () => {
      invoicesRepository.findOne.mockResolvedValueOnce(mockInvoice);

      await expect(
        service.recordPayment(invoiceId, companyId, 1001)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle decimal amounts correctly', async () => {
      const decimalInvoice = { ...mockInvoice, totalAmount: 1000.50, amountPaid: 500.25 };
      invoicesRepository.findOne.mockResolvedValueOnce(decimalInvoice);
      invoicesRepository.save.mockResolvedValueOnce({
        ...decimalInvoice,
        amountPaid: 750.75
      });

      const result = await service.recordPayment(invoiceId, companyId, 250.50);

      expect(result.amountPaid).toBe(750.75);
    });

    it('should maintain invoice immutability for paid invoices', async () => {
      const paidInvoice = { ...mockInvoice, status: 'paid', amountPaid: 1000 };
      invoicesRepository.findOne.mockResolvedValueOnce(paidInvoice);

      const updateDto = { notes: 'Updated notes' };

      await expect(service.update(invoiceId, updateDto, companyId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should enforce company isolation', async () => {
      invoicesRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.findOne(invoiceId, 'different-company')).rejects.toThrow(
        NotFoundException
      );

      expect(invoicesRepository.findOne).toHaveBeenCalledWith({
        where: { id: invoiceId, companyId: 'different-company' },
        relations: ['tenant', 'occupancy', 'occupancy.apartment']
      });
    });
  });
});
