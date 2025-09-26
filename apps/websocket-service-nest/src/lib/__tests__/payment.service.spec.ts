import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PaymentService } from '../payment.service';
import { IPayment } from '../../models/Payment';
import { IPaymentTransaction } from '../../models/PaymentTransaction';

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
    status: 'pending',
    paymentMethod: 'pix',
    description: 'Consulta jurídica',
    save: jest.fn(),
  };

  const mockConversation = {
    roomId: 'conversation-id',
    classification: {
      category: 'Direito Civil',
      complexity: 'medio',
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

    const mockPaymentModel = {
      findById: jest.fn(),
      find: jest.fn(),
      new: jest.fn().mockReturnValue(mockPayment),
    };

    const mockTransactionModel = {
      new: jest.fn(),
      updateOne: jest.fn(),
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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
      paymentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(payments),
        }),
      });

      const result = await service.getPaymentsByLawyer('lawyer-id');
      expect(result).toEqual(payments);
    });
  });
});
