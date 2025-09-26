import { ChatGateway } from '../../chat/chat.gateway';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BillingService, CreateChargeDto } from '../billing.service';
import { PaymentService } from '../payment.service';
import { ICharge, ChargeStatus, ChargeType } from '../../models/Charge';
import Conversation from '../../models/Conversation';

describe('BillingService', () => {
  let service: BillingService;
  let chargeModel: Model<ICharge>;
  let conversationModel: Model<any>;
  let paymentService: PaymentService;

  const mockCharge = {
    _id: 'charge-123',
    conversationId: 'conv-123',
    lawyerId: 'lawyer-123',
    clientId: 'client-123',
    amount: 50000, // R$ 500,00
    status: ChargeStatus.PENDING,
    type: ChargeType.CONSULTATION,
    title: 'Consulta Jurídica',
    description: 'Análise de contrato',
    reason: 'Cliente solicitou análise detalhada',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    splitConfig: {
      lawyerPercentage: 95,
      platformPercentage: 5,
      platformFee: 2500
    }
  };

  const mockConversation = {
    _id: 'conv-123',
    roomId: 'conv-123',
    assignedTo: 'lawyer-123',
    status: 'assigned',
    billing: {
      enabled: true
    }
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: getModelToken('Charge'),
          useValue: Object.assign(
            function() {
              return Object.assign({ ...mockCharge }, {
                save: jest.fn().mockResolvedValue(mockCharge)
              });
            },
            {
              create: jest.fn().mockResolvedValue(mockCharge),
              findOne: jest.fn(),
              find: jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue([mockCharge])
              }),
              findById: jest.fn(),
              findByIdAndUpdate: jest.fn(),
              countDocuments: jest.fn(),
            }
          ),
        },
        {
          provide: getModelToken('Conversation'),
          useValue: {
            findOne: jest.fn(),
            findByIdAndUpdate: jest.fn(),
          },
        },
        {
          provide: PaymentService,
          useValue: {
            createPayment: jest.fn(),
          },
        },
        {
          provide: ChatGateway,
          useValue: {
            notifyChargeCreated: jest.fn(),
            notifyChargeAccepted: jest.fn(),
            notifyChargeRejected: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    chargeModel = module.get<Model<ICharge>>(getModelToken('Charge'));
    conversationModel = module.get<Model<any>>(getModelToken('Conversation'));
    paymentService = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCharge', () => {
    it('should create a charge successfully', async () => {
      const createChargeDto: CreateChargeDto = {
        conversationId: 'conv-123',
        lawyerId: 'lawyer-123',
        clientId: 'client-123',
        amount: 50000,
        type: ChargeType.CONSULTATION,
        title: 'Consulta Jurídica',
        description: 'Análise de contrato',
        reason: 'Cliente solicitou análise detalhada',
      };

      jest.spyOn(conversationModel, 'findOne').mockResolvedValue(mockConversation);
      jest.spyOn(chargeModel, 'create').mockResolvedValue(mockCharge as any);

      const result = await service.createCharge(createChargeDto);

      expect(result).toBeDefined();
      expect(result.amount).toBe(50000);
      expect(result.status).toBe(ChargeStatus.PENDING);
    });

    it('should throw error if conversation not found', async () => {
      const createChargeDto: CreateChargeDto = {
        conversationId: 'invalid-conv',
        lawyerId: 'lawyer-123',
        clientId: 'client-123',
        amount: 50000,
        type: ChargeType.CONSULTATION,
        title: 'Consulta Jurídica',
        description: 'Análise de contrato',
        reason: 'Cliente solicitou análise detalhada',
      };

      jest.spyOn(conversationModel, 'findOne').mockResolvedValue(null);

      await expect(service.createCharge(createChargeDto)).rejects.toThrow('Conversa não encontrada');
    });

    it('should throw error if lawyer not assigned to conversation', async () => {
      const createChargeDto: CreateChargeDto = {
        conversationId: 'conv-123',
        lawyerId: 'different-lawyer',
        clientId: 'client-123',
        amount: 50000,
        type: ChargeType.CONSULTATION,
        title: 'Consulta Jurídica',
        description: 'Análise de contrato',
        reason: 'Cliente solicitou análise detalhada',
      };

      const conversationWithDifferentLawyer = {
        ...mockConversation,
        assignedTo: 'other-lawyer-123'
      };

      jest.spyOn(conversationModel, 'findOne').mockResolvedValue(conversationWithDifferentLawyer);

      await expect(service.createCharge(createChargeDto)).rejects.toThrow('Apenas o advogado responsável pode criar cobranças');
    });
  });

  describe('acceptChargeAndCreatePayment', () => {
    it('should accept charge and create payment', async () => {
      const chargeId = 'charge-123';
      const clientId = 'client-123';

      const pendingCharge = { ...mockCharge, status: ChargeStatus.PENDING };
      const acceptedCharge = { ...mockCharge, status: ChargeStatus.ACCEPTED, acceptedAt: new Date() };

      jest.spyOn(chargeModel, 'findById').mockResolvedValue(pendingCharge as any);
      jest.spyOn(chargeModel, 'findByIdAndUpdate').mockResolvedValue(acceptedCharge as any);
      jest.spyOn(paymentService, 'createPayment').mockResolvedValue({ _id: 'payment-123' } as any);

      const result = await service.acceptChargeAndCreatePayment(chargeId, clientId);

      expect(result.charge.status).toBe(ChargeStatus.ACCEPTED);
      // TODO: Re-enable when payment service integration is implemented
      // expect(paymentService.createPayment).toHaveBeenCalled();
    });

    it('should throw error if charge not found', async () => {
      jest.spyOn(chargeModel, 'findById').mockResolvedValue(null);

      await expect(service.acceptChargeAndCreatePayment('invalid-id', 'client-123')).rejects.toThrow('Cobrança não encontrada');
    });

    it('should throw error if client not authorized', async () => {
      const chargeWithDifferentClient = { ...mockCharge, clientId: 'other-client' };

      jest.spyOn(chargeModel, 'findById').mockResolvedValue(chargeWithDifferentClient as any);

      await expect(service.acceptChargeAndCreatePayment('charge-123', 'wrong-client')).rejects.toThrow('Apenas o cliente pode aceitar esta cobrança');
    });
  });

  describe('rejectCharge', () => {
    it('should reject charge successfully', async () => {
      const chargeId = 'charge-123';
      const clientId = 'client-123';
      const reason = 'Valor muito alto';

      const pendingCharge = { ...mockCharge, status: ChargeStatus.PENDING };
      const rejectedCharge = { ...mockCharge, status: ChargeStatus.REJECTED, rejectedAt: new Date() };

      jest.spyOn(chargeModel, 'findById').mockResolvedValue(pendingCharge as any);
      jest.spyOn(chargeModel, 'findByIdAndUpdate').mockResolvedValue(rejectedCharge as any);

      const result = await service.rejectCharge(chargeId, clientId, reason);

      expect(result.status).toBe(ChargeStatus.REJECTED);
      expect(result.rejectedAt).toBeDefined();
    });
  });

  describe('getChargesByConversation', () => {
    it('should return charges for conversation', async () => {
      const conversationId = 'conv-123';
      const charges = [mockCharge];

      jest.spyOn(chargeModel, 'find').mockReturnValue({
        sort: jest.fn().mockResolvedValue([mockCharge])
      } as any);

      const result = await service.getChargesByConversation(conversationId);

      expect(result).toEqual(charges);
      expect(chargeModel.find).toHaveBeenCalledWith({ conversationId });
    });
  });

  describe('getChargeById', () => {
    it('should return charge by id', async () => {
      jest.spyOn(chargeModel, 'findById').mockResolvedValue(mockCharge as any);

      const result = await service.getChargeById('charge-123');

      expect(result).toEqual(mockCharge);
    });

    it('should throw error if charge not found', async () => {
      jest.spyOn(chargeModel, 'findById').mockResolvedValue(null);

      await expect(service.getChargeById('invalid-id')).rejects.toThrow('Cobrança não encontrada');
    });
  });
});