import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from '../lib/payment.service';
import { NextAuthGuard } from '../guards/nextauth.guard';
import { PaymentMethod, PaymentStatus, IPayment } from '../models/Payment';

describe('PaymentController', () => {
  let controller: PaymentController;
  let paymentService: jest.Mocked<PaymentService>;

  const mockUser = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'client',
  };

  const mockRequest = {
    user: mockUser,
  };

  beforeEach(async () => {
    const mockPaymentService = {
      createPayment: jest.fn(),
      getPaymentsByConversation: jest.fn(),
      getPaymentsByClient: jest.fn(),
      getPaymentsByLawyer: jest.fn(),
      getPaymentById: jest.fn(),
      refundPayment: jest.fn(),
      processWebhook: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
      ],
    })
      .overrideGuard(NextAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentController>(PaymentController);
    paymentService = module.get(PaymentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPayment', () => {
    it('should create a payment with card data', async () => {
      const createPaymentDto = {
        conversationId: 'conv-123',
        amount: 1000,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        installments: 2,
        cardData: {
          cardNumber: '4111111111111111',
          cardHolderName: 'João Silva',
          cardExpirationDate: '12/25',
          cardCvv: '123',
        },
        metadata: {
          caseCategory: 'civil',
          lawyerId: 'lawyer-123',
        },
      };

      const expectedPayment: Partial<IPayment> = {
        _id: 'payment-123',
        conversationId: 'conv-123',
        clientId: mockUser.userId,
        lawyerId: 'lawyer-123',
        amount: 1000,
        currency: 'BRL',
        status: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        description: 'Payment for legal services',
        installments: 2,
        metadata: {
          caseCategory: 'civil',
          lawyerSpecialization: undefined,
          caseComplexity: undefined,
          platformFee: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      paymentService.createPayment.mockResolvedValue(
        expectedPayment as IPayment,
      );

      const result = await controller.createPayment(
        createPaymentDto,
        mockRequest,
      );

      expect(paymentService.createPayment).toHaveBeenCalledWith({
        ...createPaymentDto,
        clientId: mockUser.userId,
        lawyerId: 'lawyer-123',
      });
      expect(result).toEqual(expectedPayment);
    });

    it('should create a PIX payment', async () => {
      const createPaymentDto = {
        conversationId: 'conv-123',
        amount: 500,
        paymentMethod: PaymentMethod.PIX,
        pixData: {
          expiresIn: 3600,
        },
      };

      const expectedPayment: Partial<IPayment> = {
        _id: 'payment-456',
        conversationId: 'conv-123',
        clientId: mockUser.userId,
        lawyerId: '',
        amount: 500,
        currency: 'BRL',
        status: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.PIX,
        description: 'Payment for legal services',
        metadata: {
          platformFee: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      paymentService.createPayment.mockResolvedValue(
        expectedPayment as IPayment,
      );

      const result = await controller.createPayment(
        createPaymentDto,
        mockRequest,
      );

      expect(paymentService.createPayment).toHaveBeenCalledWith({
        ...createPaymentDto,
        clientId: mockUser.userId,
        lawyerId: '',
      });
      expect(result).toEqual(expectedPayment);
    });

    it('should create a boleto payment', async () => {
      const createPaymentDto = {
        conversationId: 'conv-123',
        amount: 2000,
        paymentMethod: PaymentMethod.BOLETO,
        boletoData: {
          expiresIn: 86400,
        },
      };

      const expectedPayment: Partial<IPayment> = {
        _id: 'payment-789',
        conversationId: 'conv-123',
        clientId: mockUser.userId,
        lawyerId: '',
        amount: 2000,
        currency: 'BRL',
        status: PaymentStatus.PENDING,
        paymentMethod: PaymentMethod.BOLETO,
        description: 'Payment for legal services',
        metadata: {
          platformFee: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      paymentService.createPayment.mockResolvedValue(
        expectedPayment as IPayment,
      );

      const result = await controller.createPayment(
        createPaymentDto,
        mockRequest,
      );

      expect(paymentService.createPayment).toHaveBeenCalledWith({
        ...createPaymentDto,
        clientId: mockUser.userId,
        lawyerId: '',
      });
      expect(result).toEqual(expectedPayment);
    });
  });

  describe('getPaymentsByConversation', () => {
    it('should return payments for a conversation', async () => {
      const conversationId = 'conv-123';
      const payments: Partial<IPayment>[] = [
        {
          _id: 'payment-1',
          conversationId,
          amount: 1000,
          clientId: 'client-1',
          lawyerId: 'lawyer-1',
          currency: 'BRL',
          status: PaymentStatus.PAID,
          paymentMethod: PaymentMethod.CREDIT_CARD,
          description: 'Payment 1',
          metadata: { platformFee: 0 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: 'payment-2',
          conversationId,
          amount: 500,
          clientId: 'client-1',
          lawyerId: 'lawyer-1',
          currency: 'BRL',
          status: PaymentStatus.PAID,
          paymentMethod: PaymentMethod.PIX,
          description: 'Payment 2',
          metadata: { platformFee: 0 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      paymentService.getPaymentsByConversation.mockResolvedValue(
        payments as IPayment[],
      );

      const result = await controller.getPaymentsByConversation(conversationId);

      expect(paymentService.getPaymentsByConversation).toHaveBeenCalledWith(
        conversationId,
      );
      expect(result).toEqual(payments);
    });
  });

  describe('getClientPayments', () => {
    it('should return payments for the authenticated client', async () => {
      const payments: Partial<IPayment>[] = [
        {
          _id: 'payment-1',
          clientId: mockUser.userId,
          amount: 1000,
          conversationId: 'conv-1',
          lawyerId: 'lawyer-1',
          currency: 'BRL',
          status: PaymentStatus.PAID,
          paymentMethod: PaymentMethod.CREDIT_CARD,
          description: 'Payment 1',
          metadata: { platformFee: 0 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: 'payment-2',
          clientId: mockUser.userId,
          amount: 500,
          conversationId: 'conv-2',
          lawyerId: 'lawyer-2',
          currency: 'BRL',
          status: PaymentStatus.PENDING,
          paymentMethod: PaymentMethod.PIX,
          description: 'Payment 2',
          metadata: { platformFee: 0 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      paymentService.getPaymentsByClient.mockResolvedValue(
        payments as IPayment[],
      );

      const result = await controller.getClientPayments(mockRequest);

      expect(paymentService.getPaymentsByClient).toHaveBeenCalledWith(
        mockUser.userId,
      );
      expect(result).toEqual(payments);
    });
  });

  describe('getLawyerPayments', () => {
    it('should return payments for the authenticated lawyer', async () => {
      const payments: Partial<IPayment>[] = [
        {
          _id: 'payment-1',
          lawyerId: mockUser.userId,
          amount: 1000,
          conversationId: 'conv-1',
          clientId: 'client-1',
          currency: 'BRL',
          status: PaymentStatus.PAID,
          paymentMethod: PaymentMethod.CREDIT_CARD,
          description: 'Payment 1',
          metadata: { platformFee: 0 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: 'payment-2',
          lawyerId: mockUser.userId,
          amount: 500,
          conversationId: 'conv-2',
          clientId: 'client-2',
          currency: 'BRL',
          status: PaymentStatus.PENDING,
          paymentMethod: PaymentMethod.PIX,
          description: 'Payment 2',
          metadata: { platformFee: 0 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      paymentService.getPaymentsByLawyer.mockResolvedValue(
        payments as IPayment[],
      );

      const result = await controller.getLawyerPayments(mockRequest);

      expect(paymentService.getPaymentsByLawyer).toHaveBeenCalledWith(
        mockUser.userId,
      );
      expect(result).toEqual(payments);
    });
  });

  describe('getPayment', () => {
    it('should return a specific payment by id', async () => {
      const paymentId = 'payment-123';
      const payment: Partial<IPayment> = {
        _id: paymentId,
        amount: 1000,
        status: PaymentStatus.PAID,
        conversationId: 'conv-1',
        clientId: 'client-1',
        lawyerId: 'lawyer-1',
        currency: 'BRL',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        description: 'Test payment',
        metadata: { platformFee: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      paymentService.getPaymentById.mockResolvedValue(payment as IPayment);

      const result = await controller.getPayment(paymentId);

      expect(paymentService.getPaymentById).toHaveBeenCalledWith(paymentId);
      expect(result).toEqual(payment);
    });
  });

  describe('refundPayment', () => {
    it('should refund a payment with full amount', async () => {
      const paymentId = 'payment-123';
      const refundResult: Partial<IPayment> = {
        _id: paymentId,
        amount: 1000,
        status: PaymentStatus.REFUNDED,
        conversationId: 'conv-1',
        clientId: 'client-1',
        lawyerId: 'lawyer-1',
        currency: 'BRL',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        description: 'Refunded payment',
        metadata: { platformFee: 0 },
        refundedAt: new Date(),
        refundAmount: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      paymentService.refundPayment.mockResolvedValue(refundResult as IPayment);

      const result = await controller.refundPayment(paymentId, {});

      expect(paymentService.refundPayment).toHaveBeenCalledWith(
        paymentId,
        undefined,
      );
      expect(result).toEqual(refundResult);
    });

    it('should refund a payment with partial amount', async () => {
      const paymentId = 'payment-123';
      const partialAmount = 500;
      const refundResult: Partial<IPayment> = {
        _id: paymentId,
        amount: 1000,
        status: PaymentStatus.REFUNDED,
        conversationId: 'conv-1',
        clientId: 'client-1',
        lawyerId: 'lawyer-1',
        currency: 'BRL',
        paymentMethod: PaymentMethod.CREDIT_CARD,
        description: 'Partially refunded payment',
        metadata: { platformFee: 0 },
        refundedAt: new Date(),
        refundAmount: partialAmount,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      paymentService.refundPayment.mockResolvedValue(refundResult as IPayment);

      const result = await controller.refundPayment(paymentId, {
        amount: partialAmount,
      });

      expect(paymentService.refundPayment).toHaveBeenCalledWith(
        paymentId,
        partialAmount,
      );
      expect(result).toEqual(refundResult);
    });
  });

  describe('handleWebhook', () => {
    it('should process webhook data and return success', async () => {
      const webhookData = {
        event: 'payment.updated',
        payment: { id: 'payment-123', status: 'paid' },
      };

      paymentService.processWebhook.mockResolvedValue(undefined);

      const result = await controller.handleWebhook(webhookData);

      expect(paymentService.processWebhook).toHaveBeenCalledWith(webhookData);
      expect(result).toEqual({ received: true });
    });

    it('should handle webhook processing errors gracefully', async () => {
      const webhookData = {
        event: 'payment.updated',
        payment: { id: 'payment-123', status: 'failed' },
      };

      paymentService.processWebhook.mockRejectedValue(
        new Error('Webhook processing failed'),
      );

      await expect(controller.handleWebhook(webhookData)).rejects.toThrow(
        'Webhook processing failed',
      );
    });
  });
});
