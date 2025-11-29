import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { PaymentsService } from '../payments.service';
import { Payment } from '../../entities/payment.entity';
import { Invoice } from '../../../invoices/entities/invoice.entity';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentsRepository: jest.Mocked<Repository<Payment>>;
  let invoicesRepository: jest.Mocked<Repository<Invoice>>;
  let dataSource: jest.Mocked<DataSource>;

  const companyId = 'test-company-1';
  const paymentId = 'payment-1';
  const invoiceId = 'invoice-1';

  const mockInvoice: Invoice = {
    id: invoiceId,
    companyId,
    invoiceNumber: 'INV-2024-001',
    occupancyId: 'occ-1',
    tenantId: 'tenant-1',
    invoiceDate: new Date('2024-01-01'),
    dueDate: new Date('2024-01-05'),
    status: 'sent',
    lineItems: [],
    subtotal: 1000,
    taxAmount: 0,
    totalAmount: 1000,
    amountPaid: 0,
    paidDate: null,
    notes: 'Test invoice',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    tenant: { id: 'tenant-1' } as any,
    occupancy: { id: 'occ-1' } as any
  } as any;

  const mockPayment: Payment = {
    id: paymentId,
    companyId,
    invoiceId,
    amount: 500,
    method: 'bank_transfer',
    paidAt: new Date('2024-01-02'),
    reference: 'REF-001',
    notes: 'Test payment',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    invoice: mockInvoice
  } as any;

  beforeEach(async () => {
    paymentsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn()
    } as any;

    invoicesRepository = {
      findOne: jest.fn()
    } as any;

    dataSource = {
      transaction: jest.fn((callback) => callback({} as any))
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(Payment),
          useValue: paymentsRepository
        },
        {
          provide: getRepositoryToken(Invoice),
          useValue: invoicesRepository
        },
        {
          provide: DataSource,
          useValue: dataSource
        }
      ]
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('create', () => {
    const createDto = {
      invoiceId,
      amount: 500,
      method: 'bank_transfer',
      paidAt: new Date('2024-01-02'),
      reference: 'REF-001'
    };

    it('should create payment and update invoice successfully', async () => {
      const mockManager = {
        findOne: jest.fn().mockResolvedValueOnce(mockInvoice),
        create: jest.fn().mockReturnValueOnce(mockPayment),
        save: jest.fn()
          .mockResolvedValueOnce(mockPayment)
          .mockResolvedValueOnce({ ...mockInvoice, amountPaid: 500 })
      };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockManager)
      );

      const result = await service.create(createDto, companyId);

      expect(result).toEqual(mockPayment);
      expect(mockManager.save).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if invoice not found', async () => {
      const mockManager = {
        findOne: jest.fn().mockResolvedValueOnce(null)
      };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockManager)
      );

      await expect(service.create(createDto, companyId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if payment exceeds outstanding balance', async () => {
      const invoiceWithBalance = { ...mockInvoice, amountPaid: 800 };

      const mockManager = {
        findOne: jest.fn().mockResolvedValueOnce(invoiceWithBalance)
      };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockManager)
      );

      await expect(service.create(createDto, companyId)).rejects.toThrow(BadRequestException);
    });

    it('should auto-update invoice status to paid when fully paid', async () => {
      const mockManager = {
        findOne: jest.fn().mockResolvedValueOnce(mockInvoice),
        create: jest.fn().mockReturnValueOnce(mockPayment),
        save: jest.fn()
      };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockManager)
      );

      const createDtoFullPayment = { ...createDto, amount: 1000 };

      await service.create(createDtoFullPayment, companyId);

      const invoiceSaveCall = mockManager.save.mock.calls.find(
        (call) => call[0] === Invoice
      )?.[1];
      expect(invoiceSaveCall?.status).toBe('paid');
      expect(invoiceSaveCall?.paidDate).toBeDefined();
    });

    it('should update invoice status to sent when partial payment on draft', async () => {
      const draftInvoice = { ...mockInvoice, status: 'draft' };
      const mockManager = {
        findOne: jest.fn().mockResolvedValueOnce(draftInvoice),
        create: jest.fn().mockReturnValueOnce(mockPayment),
        save: jest.fn()
      };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockManager)
      );

      await service.create(createDto, companyId);

      const invoiceSaveCall = mockManager.save.mock.calls.find(
        (call) => call[0] === Invoice
      )?.[1];
      expect(invoiceSaveCall?.status).toBe('sent');
    });

    it('should accumulate partial payments correctly', async () => {
      const partiallyPaidInvoice = { ...mockInvoice, amountPaid: 300 };
      const mockManager = {
        findOne: jest.fn().mockResolvedValueOnce(partiallyPaidInvoice),
        create: jest.fn().mockReturnValueOnce(mockPayment),
        save: jest.fn()
      };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockManager)
      );

      await service.create(createDto, companyId);

      const invoiceSaveCall = mockManager.save.mock.calls.find(
        (call) => call[0] === Invoice
      )?.[1];
      expect(invoiceSaveCall?.amountPaid).toBe(800);
    });
  });

  describe('findAll', () => {
    it('should find all active payments for company', async () => {
      paymentsRepository.find.mockResolvedValueOnce([mockPayment]);

      const result = await service.findAll(companyId);

      expect(result).toEqual([mockPayment]);
      expect(paymentsRepository.find).toHaveBeenCalledWith({
        where: { companyId, isActive: true },
        relations: ['invoice', 'invoice.tenant'],
        order: { paidAt: 'DESC' }
      });
    });

    it('should filter by invoiceId', async () => {
      paymentsRepository.find.mockResolvedValueOnce([mockPayment]);

      await service.findAll(companyId, invoiceId);

      expect(paymentsRepository.find).toHaveBeenCalledWith({
        where: { companyId, isActive: true, invoiceId },
        relations: ['invoice', 'invoice.tenant'],
        order: { paidAt: 'DESC' }
      });
    });

    it('should include inactive payments when requested', async () => {
      paymentsRepository.find.mockResolvedValueOnce([mockPayment]);

      await service.findAll(companyId, undefined, true);

      const call = paymentsRepository.find.mock.calls[0][0];
      expect(call.where).not.toHaveProperty('isActive');
    });
  });

  describe('findByInvoice', () => {
    it('should find payments for specific invoice', async () => {
      paymentsRepository.find.mockResolvedValueOnce([mockPayment]);

      const result = await service.findByInvoice(invoiceId, companyId);

      expect(result).toEqual([mockPayment]);
      expect(paymentsRepository.find).toHaveBeenCalledWith({
        where: { invoiceId, companyId, isActive: true },
        order: { paidAt: 'DESC' }
      });
    });
  });

  describe('findByDateRange', () => {
    it('should find payments within date range', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValueOnce([mockPayment])
      };

      paymentsRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const result = await service.findByDateRange(companyId, startDate, endDate);

      expect(result).toEqual([mockPayment]);
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should calculate payment statistics', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValueOnce([
          mockPayment,
          { ...mockPayment, id: 'payment-2', amount: 300, method: 'cash' }
        ])
      };

      paymentsRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);

      const result = await service.getStats(companyId);

      expect(result.totalPayments).toBe(2);
      expect(result.totalAmount).toBe(800);
      expect(result.byMethod['bank_transfer']).toEqual({ count: 1, amount: 500 });
      expect(result.byMethod['cash']).toEqual({ count: 1, amount: 300 });
    });

    it('should filter stats by date range', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValueOnce([mockPayment])
      };

      paymentsRepository.createQueryBuilder.mockReturnValueOnce(mockQueryBuilder as any);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const result = await service.getStats(companyId, startDate, endDate);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(3);
      expect(result.totalPayments).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should find payment by id', async () => {
      paymentsRepository.findOne.mockResolvedValueOnce(mockPayment);

      const result = await service.findOne(paymentId, companyId);

      expect(result).toEqual(mockPayment);
      expect(paymentsRepository.findOne).toHaveBeenCalledWith({
        where: { id: paymentId, companyId },
        relations: ['invoice', 'invoice.tenant', 'invoice.occupancy']
      });
    });

    it('should throw NotFoundException if payment not found', async () => {
      paymentsRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.findOne(paymentId, companyId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = {
      amount: 600,
      reference: 'REF-002'
    };

    it('should update payment without affecting invoice', async () => {
      const mockManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockPayment)
          .mockResolvedValueOnce(undefined),
        save: jest.fn().mockResolvedValueOnce({ ...mockPayment, ...updateDto })
      };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockManager)
      );

      const updateDtoNoAmount = { reference: 'REF-002' };

      const result = await service.update(paymentId, updateDtoNoAmount, companyId);

      expect(result).toBeDefined();
    });

    it('should update payment and invoice when amount changes', async () => {
      const mockManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockPayment)
          .mockResolvedValueOnce(mockInvoice),
        save: jest.fn()
      };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockManager)
      );

      await service.update(paymentId, updateDto, companyId);

      expect(mockManager.save).toHaveBeenCalledWith(Invoice, expect.any(Object));
    });

    it('should throw BadRequestException if update creates negative balance', async () => {
      const partiallyPaidInvoice = { ...mockInvoice, amountPaid: 300 };
      const mockManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockPayment)
          .mockResolvedValueOnce(partiallyPaidInvoice)
      };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockManager)
      );

      const decreaseDto = { amount: 100 };

      await expect(service.update(paymentId, decreaseDto, companyId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException if update exceeds invoice total', async () => {
      const mockManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockPayment)
          .mockResolvedValueOnce(mockInvoice)
      };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockManager)
      );

      const increaseDto = { amount: 2000 };

      await expect(service.update(paymentId, increaseDto, companyId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should update invoice status when amount increase fully pays invoice', async () => {
      const invoiceWith800Paid = { ...mockInvoice, amountPaid: 800 };
      const mockManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockPayment)
          .mockResolvedValueOnce(invoiceWith800Paid),
        save: jest.fn()
      };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockManager)
      );

      const increaseDto = { amount: 700 };

      await service.update(paymentId, increaseDto, companyId);

      const invoiceSaveCall = mockManager.save.mock.calls.find(
        (call) => call[0] === Invoice
      )?.[1];
      expect(invoiceSaveCall?.status).toBe('paid');
    });

    it('should revert invoice paid status when amount decrease', async () => {
      const paidInvoice = { ...mockInvoice, status: 'paid', paidDate: new Date() };
      const mockManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockPayment)
          .mockResolvedValueOnce(paidInvoice),
        save: jest.fn()
      };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockManager)
      );

      const decreaseDto = { amount: 100 };

      await service.update(paymentId, decreaseDto, companyId);

      const invoiceSaveCall = mockManager.save.mock.calls.find(
        (call) => call[0] === Invoice
      )?.[1];
      expect(invoiceSaveCall?.status).toBe('sent');
      expect(invoiceSaveCall?.paidDate).toBeNull();
    });
  });

  describe('remove', () => {
    it('should soft delete payment and revert invoice', async () => {
      const mockManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockPayment)
          .mockResolvedValueOnce(undefined),
        save: jest.fn()
      };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockManager)
      );

      await service.remove(paymentId, companyId);

      expect(mockManager.save).toHaveBeenCalled();
    });

    it('should revert invoice amount when payment deleted', async () => {
      const invoiceWith500Paid = { ...mockInvoice, amountPaid: 500 };
      const mockManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockPayment)
          .mockResolvedValueOnce(invoiceWith500Paid),
        save: jest.fn()
      };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockManager)
      );

      await service.remove(paymentId, companyId);

      const invoiceSaveCall = mockManager.save.mock.calls.find(
        (call) => call[0] === Invoice
      )?.[1];
      expect(invoiceSaveCall?.amountPaid).toBe(0);
    });

    it('should revert paid invoice status when deletion unpays it', async () => {
      const paidInvoice = { ...mockInvoice, status: 'paid', amountPaid: 500, paidDate: new Date() };
      const mockManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockPayment)
          .mockResolvedValueOnce(paidInvoice),
        save: jest.fn()
      };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockManager)
      );

      await service.remove(paymentId, companyId);

      const invoiceSaveCall = mockManager.save.mock.calls.find(
        (call) => call[0] === Invoice
      )?.[1];
      expect(invoiceSaveCall?.status).toBe('sent');
      expect(invoiceSaveCall?.paidDate).toBeNull();
    });

    it('should throw NotFoundException if payment not found', async () => {
      const mockManager = {
        findOne: jest.fn().mockResolvedValueOnce(null)
      };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockManager)
      );

      await expect(service.remove(paymentId, companyId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('activate', () => {
    it('should reactivate payment and update invoice', async () => {
      const inactivePayment = { ...mockPayment, isActive: false };
      const mockManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(inactivePayment)
          .mockResolvedValueOnce(mockInvoice),
        save: jest.fn().mockResolvedValueOnce({ ...inactivePayment, isActive: true })
      };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockManager)
      );

      const result = await service.activate(paymentId, companyId);

      expect(result.isActive).toBe(true);
    });

    it('should throw BadRequestException if reactivation exceeds invoice total', async () => {
      const inactivePayment = { ...mockPayment, isActive: false, amount: 600 };
      const invoiceWith900Paid = { ...mockInvoice, amountPaid: 900 };
      const mockManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(inactivePayment)
          .mockResolvedValueOnce(invoiceWith900Paid)
      };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockManager)
      );

      await expect(service.activate(paymentId, companyId)).rejects.toThrow(BadRequestException);
    });

    it('should mark invoice as paid when reactivation fully pays it', async () => {
      const inactivePayment = { ...mockPayment, isActive: false };
      const invoiceWith500Paid = { ...mockInvoice, amountPaid: 500 };
      const mockManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(inactivePayment)
          .mockResolvedValueOnce(invoiceWith500Paid),
        save: jest.fn()
      };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockManager)
      );

      await service.activate(paymentId, companyId);

      const invoiceSaveCall = mockManager.save.mock.calls.find(
        (call) => call[0] === Invoice
      )?.[1];
      expect(invoiceSaveCall?.status).toBe('paid');
    });

    it('should throw NotFoundException if payment not found', async () => {
      const mockManager = {
        findOne: jest.fn().mockResolvedValueOnce(null)
      };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockManager)
      );

      await expect(service.activate(paymentId, companyId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Transaction Safety', () => {
    it('should use transactions for create operation', async () => {
      const mockManager = {
        findOne: jest.fn().mockResolvedValueOnce(mockInvoice),
        create: jest.fn().mockReturnValueOnce(mockPayment),
        save: jest.fn().mockResolvedValue(mockPayment)
      };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockManager)
      );

      const createDto = {
        invoiceId,
        amount: 500,
        method: 'bank_transfer',
        paidAt: new Date()
      };

      await service.create(createDto, companyId);

      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should use transactions for update operation', async () => {
      const mockManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockPayment)
          .mockResolvedValueOnce(mockInvoice),
        save: jest.fn()
      };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockManager)
      );

      await service.update(paymentId, { amount: 600 }, companyId);

      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should use transactions for remove operation', async () => {
      const mockManager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(mockPayment)
          .mockResolvedValueOnce(mockInvoice),
        save: jest.fn()
      };

      (dataSource.transaction as jest.Mock).mockImplementationOnce((callback) =>
        callback(mockManager)
      );

      await service.remove(paymentId, companyId);

      expect(dataSource.transaction).toHaveBeenCalled();
    });
  });
});
