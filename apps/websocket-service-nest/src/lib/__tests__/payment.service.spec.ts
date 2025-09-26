import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PaymentService } from '../payment.service';
import { IPayment, PaymentStatus, PaymentMethod } from '../../models/Payment';
import {
  IPaymentTransaction,
  TransactionType,
  TransactionStatus,
} from '../../models/PaymentTransaction';

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentModel: any;
  let transactionModel: any;
  let conversationModel: any;

  const mockPayment = {
    _id: 'payment-id',
    conversationId: 'conversation-id',
    clientId: 'client-id',
    lawyerId: 'lawyer-id',
    amount: 10000, // R$ 100,00
    status: PaymentStatus.PENDING,
    paymentMethod: PaymentMethod.PIX,
    description: 'Consulta jurídica',
    save: jest.fn(),
    externalId: 'external-123',
    transactionId: 'tid-123',
    splitRules: [
      {
        recipientId: 'platform-recipient',
        percentage: 20,
        liable: true,
        chargeProcessingFee: true,
      },
      {
        recipientId: 'lawyer-recipient',
        percentage: 80,
        liable: false,
        chargeProcessingFee: false,
      },
    ],
    paidAt: undefined,
    cancelledAt: undefined,
    refundedAt: undefined,
    refundAmount: undefined,
    webhookData: undefined,
  };

  const mockConversation = {
    roomId: 'conversation-id',
    classification: {
      category: 'Direito Civil',
      complexity: 'medio',
    },
  };

  const mockPagarmeResponse = {
    id: 'external-123',
    tid: 'tid-123',
    status: 'paid',
    cost: 200, // R$ 2,00 de taxa
    card: {
      last_digits: '1234',
      brand: 'visa',
    },
    pix: {
      qr_code: 'qr-code-data',
    },
    boleto: {
      url: 'boleto-url',
      barcode: 'boleto-barcode',
    },
  };

  beforeEach(async () => {
    // Mock environment variables
    process.env.PAGARME_API_KEY = 'test-api-key';
    process.env.PAGARME_ENCRYPTION_KEY = 'test-encryption-key';
    process.env.PLATFORM_FEE_PERCENTAGE = '20';
    process.env.LAWYER_PAYMENT_PERCENTAGE = '80';
    process.env.PLATFORM_RECIPIENT_ID = 'platform-recipient';
    process.env.LAWYER_RECIPIENT_ID = 'lawyer-recipient';

    const mockPaymentModel = function PaymentMock(data: any) {
      Object.assign(this, mockPayment, data);
      this.save = jest.fn().mockResolvedValue(this);
      return this;
    };
    mockPaymentModel.findById = jest.fn();
    mockPaymentModel.find = jest.fn();
    mockPaymentModel.findOne = jest.fn();

    const mockTransactionModel = {
      new: jest.fn().mockReturnValue({
        _id: 'transaction-id',
        save: jest.fn().mockResolvedValue({
          _id: 'transaction-id',
          paymentId: 'payment-id',
          externalId: 'external-123',
          type: 'PAYMENT',
          status: 'SUCCESS',
          amount: 10000,
          fee: 200,
          netAmount: 9800,
          description: 'Transação PAYMENT - Consulta jurídica',
          metadata: {
            pagarmeTransactionId: 'tid-123',
            pagarmeStatus: 'paid',
            cardLastDigits: '1234',
            cardBrand: 'visa',
            pixQrCode: 'qr-code-data',
            boletoUrl: 'boleto-url',
            boletoBarcode: 'boleto-barcode',
          },
          processedAt: new Date(),
        }),
      }),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    };

    const mockConversationModel = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getModelToken('Payment'),
          useValue: mockPaymentModel,
        },
        {
          provide: getModelToken('PaymentTransaction'),
          useValue: mockTransactionModel,
        },
        {
          provide: getModelToken('Conversation'),
          useValue: mockConversationModel,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    paymentModel = module.get(getModelToken('Payment'));
    transactionModel = module.get(getModelToken('PaymentTransaction'));
    conversationModel = module.get(getModelToken('Conversation'));

    // Mock Pagar.me client
    const mockPagarmeClient = {
      transactions: {
        create: jest.fn().mockResolvedValue(mockPagarmeResponse),
        refund: jest.fn().mockResolvedValue(mockPagarmeResponse),
      },
    };

    // Mock the pagarme module
    jest.doMock('pagarme', () => ({
      client: {
        connect: jest.fn().mockResolvedValue(mockPagarmeClient),
      },
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPayment', () => {
    const createPaymentDto = {
      conversationId: 'conversation-id',
      clientId: 'client-id',
      lawyerId: 'lawyer-id',
      amount: 10000,
      paymentMethod: PaymentMethod.PIX,
      metadata: {
        caseCategory: 'Direito Civil',
        caseComplexity: 'medio',
        lawyerSpecialization: 'Civil',
      },
    };

    it('should throw BadRequestException when conversation not found', async () => {
      conversationModel.findOne.mockResolvedValue(null);

      await expect(service.createPayment(createPaymentDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when card data is missing for credit card', async () => {
      const invalidDto = {
        ...createPaymentDto,
        paymentMethod: PaymentMethod.CREDIT_CARD,
      };

      conversationModel.findOne.mockResolvedValue(mockConversation);

      await expect(service.createPayment(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('processWebhook', () => {
    it('should process payment webhook successfully', async () => {
      const freshPayment = { ...mockPayment };
      paymentModel.findOne.mockResolvedValue(freshPayment);
      freshPayment.save = jest.fn().mockResolvedValue(freshPayment);
      transactionModel.updateOne.mockResolvedValue({ acknowledged: true });

      await service.processWebhook({
        id: 'external-123',
        status: 'paid',
        event: 'transaction_status_changed',
      });

      expect(freshPayment.status).toBe(PaymentStatus.PAID);
      expect(freshPayment.paidAt).toBeInstanceOf(Date);
      expect(freshPayment.webhookData).toEqual({
        id: 'external-123',
        status: 'paid',
        event: 'transaction_status_changed',
      });
    });

    it('should update payment to cancelled status', async () => {
      const freshPayment = { ...mockPayment };
      paymentModel.findOne.mockResolvedValue(freshPayment);
      freshPayment.save = jest.fn().mockResolvedValue(freshPayment);

      await service.processWebhook({
        id: 'external-123',
        status: 'refused',
        event: 'transaction_status_changed',
      });

      expect(freshPayment.status).toBe(PaymentStatus.FAILED);
      expect(freshPayment.cancelledAt).toBeInstanceOf(Date);
    });

    it('should update payment to refunded status', async () => {
      const freshPayment = { ...mockPayment };
      paymentModel.findOne.mockResolvedValue(freshPayment);
      freshPayment.save = jest.fn().mockResolvedValue(freshPayment);

      await service.processWebhook({
        id: 'external-123',
        status: 'refunded',
        event: 'transaction_status_changed',
      });

      expect(freshPayment.status).toBe(PaymentStatus.REFUNDED);
      expect(freshPayment.refundedAt).toBeInstanceOf(Date);
    });

    it('should warn when payment not found', async () => {
      paymentModel.findOne.mockResolvedValue(null);

      await service.processWebhook({
        id: 'external-123',
        status: 'paid',
        event: 'transaction_status_changed',
      });

      // Should not throw, just log warning
      expect(paymentModel.findOne).toHaveBeenCalledWith({
        externalId: 'external-123',
      });
    });
  });

  describe('refundPayment', () => {
    it('should throw BadRequestException when payment not found', async () => {
      paymentModel.findById.mockResolvedValue(null);

      await expect(service.refundPayment('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when payment is not paid', async () => {
      const pendingPayment = { ...mockPayment, status: PaymentStatus.PENDING };
      paymentModel.findById.mockResolvedValue(pendingPayment);

      await expect(service.refundPayment('payment-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getPaymentById', () => {
    it('should return a payment by id', async () => {
      paymentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPayment),
      });

      const result = await service.getPaymentById('payment-id');
      expect(result).toEqual(mockPayment);
    });
  });

  describe('getPaymentsByConversation', () => {
    it('should return payments for a conversation', async () => {
      const payments = [mockPayment];
      paymentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(payments),
        }),
      });

      const result = await service.getPaymentsByConversation('conversation-id');
      expect(result).toEqual(payments);
    });
  });

  describe('getPaymentsByClient', () => {
    it('should return payments for a client', async () => {
      const payments = [mockPayment];
      paymentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(payments),
        }),
      });

      const result = await service.getPaymentsByClient('client-id');
      expect(result).toEqual(payments);
    });
  });

  describe('getPaymentsByLawyer', () => {
    it('should return payments for a lawyer', async () => {
      const payments = [mockPayment];
      const mockQuery = {
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(payments),
        }),
      };
      paymentModel.find.mockReturnValue(mockQuery);

      const result = await service.getPaymentsByLawyer('lawyer-id');
      expect(result).toEqual(payments);
      expect(paymentModel.find).toHaveBeenCalledWith({ lawyerId: 'lawyer-id' });
    });
  });
});

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentModel: any;
  let transactionModel: any;
  let conversationModel: any;

  const mockPayment = {
    _id: 'payment-id',
    conversationId: 'conversation-id',
    clientId: 'client-id',
    lawyerId: 'lawyer-id',
    amount: 10000, // R$ 100,00
    status: PaymentStatus.PENDING,
    paymentMethod: PaymentMethod.PIX,
    description: 'Consulta jurídica',
    save: jest.fn(),
    externalId: 'external-123',
    transactionId: 'tid-123',
    splitRules: [
      {
        recipientId: 'platform-recipient',
        percentage: 20,
        liable: true,
        chargeProcessingFee: true,
      },
      {
        recipientId: 'lawyer-recipient',
        percentage: 80,
        liable: false,
        chargeProcessingFee: false,
      },
    ],
    paidAt: undefined,
    cancelledAt: undefined,
    refundedAt: undefined,
    refundAmount: undefined,
    webhookData: undefined,
  };

  const mockConversation = {
    roomId: 'conversation-id',
    classification: {
      category: 'Direito Civil',
      complexity: 'medio',
    },
  };

  const mockPagarmeResponse = {
    id: 'external-123',
    tid: 'tid-123',
    status: 'paid',
    cost: 200, // R$ 2,00 de taxa
    card: {
      last_digits: '1234',
      brand: 'visa',
    },
    pix: {
      qr_code: 'qr-code-data',
    },
    boleto: {
      url: 'boleto-url',
      barcode: 'boleto-barcode',
    },
  };

  beforeEach(async () => {
    // Mock environment variables
    process.env.PAGARME_API_KEY = 'test-api-key';
    process.env.PAGARME_ENCRYPTION_KEY = 'test-encryption-key';
    process.env.PLATFORM_FEE_PERCENTAGE = '20';
    process.env.LAWYER_PAYMENT_PERCENTAGE = '80';
    process.env.PLATFORM_RECIPIENT_ID = 'platform-recipient';
    process.env.LAWYER_RECIPIENT_ID = 'lawyer-recipient';

    const mockPaymentModel = function PaymentMock(data: any) {
      Object.assign(this, mockPayment, data);
      this.save = jest.fn().mockResolvedValue(this);
      return this;
    };
    mockPaymentModel.findById = jest.fn();
    mockPaymentModel.find = jest.fn();
    mockPaymentModel.findOne = jest.fn();

    const mockTransactionModel = {
      new: jest.fn().mockReturnValue({
        _id: 'transaction-id',
        save: jest.fn().mockResolvedValue({
          _id: 'transaction-id',
          paymentId: 'payment-id',
          externalId: 'external-123',
          type: 'PAYMENT',
          status: 'SUCCESS',
          amount: 10000,
          fee: 200,
          netAmount: 9800,
          description: 'Transação PAYMENT - Consulta jurídica',
          metadata: {
            pagarmeTransactionId: 'tid-123',
            pagarmeStatus: 'paid',
            cardLastDigits: '1234',
            cardBrand: 'visa',
            pixQrCode: 'qr-code-data',
            boletoUrl: 'boleto-url',
            boletoBarcode: 'boleto-barcode',
          },
          processedAt: new Date(),
        }),
      }),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    };

    const mockConversationModel = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getModelToken('Payment'),
          useValue: mockPaymentModel,
        },
        {
          provide: getModelToken('PaymentTransaction'),
          useValue: mockTransactionModel,
        },
        {
          provide: getModelToken('Conversation'),
          useValue: mockConversationModel,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    paymentModel = module.get(getModelToken('Payment'));
    transactionModel = module.get(getModelToken('PaymentTransaction'));
    conversationModel = module.get(getModelToken('Conversation'));

    // Mock Pagar.me client
    const mockPagarmeClient = {
      transactions: {
        create: jest.fn().mockResolvedValue(mockPagarmeResponse),
        refund: jest.fn().mockResolvedValue(mockPagarmeResponse),
      },
    };

    // Mock the pagarme module
    jest.doMock('pagarme', () => ({
      client: {
        connect: jest.fn().mockResolvedValue(mockPagarmeClient),
      },
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPayment', () => {
    const createPaymentDto = {
      conversationId: 'conversation-id',
      clientId: 'client-id',
      lawyerId: 'lawyer-id',
      amount: 10000,
      paymentMethod: PaymentMethod.PIX,
      metadata: {
        caseCategory: 'Direito Civil',
        caseComplexity: 'medio',
        lawyerSpecialization: 'Civil',
      },
    };

    it('should throw BadRequestException when conversation not found', async () => {
      conversationModel.findOne.mockResolvedValue(null);

      await expect(service.createPayment(createPaymentDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when card data is missing for credit card', async () => {
      const invalidDto = {
        ...createPaymentDto,
        paymentMethod: PaymentMethod.CREDIT_CARD,
      };

      conversationModel.findOne.mockResolvedValue(mockConversation);

      await expect(service.createPayment(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('processWebhook', () => {
    it('should process payment webhook successfully', async () => {
      const freshPayment = { ...mockPayment };
      paymentModel.findOne.mockResolvedValue(freshPayment);
      freshPayment.save = jest.fn().mockResolvedValue(freshPayment);
      transactionModel.updateOne.mockResolvedValue({ acknowledged: true });

      await service.processWebhook({
        id: 'external-123',
        status: 'paid',
        event: 'transaction_status_changed',
      });

      expect(freshPayment.status).toBe(PaymentStatus.PAID);
      expect(freshPayment.paidAt).toBeInstanceOf(Date);
      expect(freshPayment.webhookData).toEqual({
        id: 'external-123',
        status: 'paid',
        event: 'transaction_status_changed',
      });
    });

    it('should update payment to cancelled status', async () => {
      const freshPayment = { ...mockPayment };
      paymentModel.findOne.mockResolvedValue(freshPayment);
      freshPayment.save = jest.fn().mockResolvedValue(freshPayment);

      await service.processWebhook({
        id: 'external-123',
        status: 'refused',
        event: 'transaction_status_changed',
      });

      expect(freshPayment.status).toBe(PaymentStatus.FAILED);
      expect(freshPayment.cancelledAt).toBeInstanceOf(Date);
    });

    it('should update payment to refunded status', async () => {
      const freshPayment = { ...mockPayment };
      paymentModel.findOne.mockResolvedValue(freshPayment);
      freshPayment.save = jest.fn().mockResolvedValue(freshPayment);

      await service.processWebhook({
        id: 'external-123',
        status: 'refunded',
        event: 'transaction_status_changed',
      });

      expect(freshPayment.status).toBe(PaymentStatus.REFUNDED);
      expect(freshPayment.refundedAt).toBeInstanceOf(Date);
    });

    it('should warn when payment not found', async () => {
      paymentModel.findOne.mockResolvedValue(null);

      await service.processWebhook({
        id: 'external-123',
        status: 'paid',
        event: 'transaction_status_changed',
      });

      // Should not throw, just log warning
      expect(paymentModel.findOne).toHaveBeenCalledWith({
        externalId: 'external-123',
      });
    });
  });

  describe('refundPayment', () => {
    it('should throw BadRequestException when payment not found', async () => {
      paymentModel.findById.mockResolvedValue(null);

      await expect(service.refundPayment('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when payment is not paid', async () => {
      const pendingPayment = { ...mockPayment, status: PaymentStatus.PENDING };
      paymentModel.findById.mockResolvedValue(pendingPayment);

      await expect(service.refundPayment('payment-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getPaymentById', () => {
    it('should return a payment by id', async () => {
      paymentModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPayment),
      });

      const result = await service.getPaymentById('payment-id');
      expect(result).toEqual(mockPayment);
    });
  });

  describe('getPaymentsByConversation', () => {
    it('should return payments for a conversation', async () => {
      const payments = [mockPayment];
      paymentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(payments),
        }),
      });

      const result = await service.getPaymentsByConversation('conversation-id');
      expect(result).toEqual(payments);
    });
  });

  describe('getPaymentsByClient', () => {
    it('should return payments for a client', async () => {
      const payments = [mockPayment];
      paymentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(payments),
        }),
      });

      const result = await service.getPaymentsByClient('client-id');
      expect(result).toEqual(payments);
    });
  });

  describe('getPaymentsByLawyer', () => {
    it('should return payments for a lawyer', async () => {
      const payments = [mockPayment];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(payments),
      };
      paymentModel.find.mockReturnValue(mockQuery);

      const result = await service.getPaymentsByLawyer('lawyer-id');
      expect(result).toEqual(payments);
    });
  });
});
