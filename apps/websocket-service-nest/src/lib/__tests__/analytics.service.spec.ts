import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AnalyticsService } from '../analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockChargeModel: any;
  let mockConversationModel: any;
  let mockMessageModel: any;
  let mockUserModel: any;

  beforeEach(async () => {
    // Mock dos modelos Mongoose
    mockChargeModel = {
      aggregate: jest.fn(),
      countDocuments: jest.fn(),
    };

    mockConversationModel = {
      aggregate: jest.fn(),
      countDocuments: jest.fn(),
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([])
      }),
    };

    mockMessageModel = {
      aggregate: jest.fn(),
      countDocuments: jest.fn(),
    };

    mockUserModel = {
      aggregate: jest.fn(),
      countDocuments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getModelToken('Charge'),
          useValue: mockChargeModel,
        },
        {
          provide: getModelToken('Conversation'),
          useValue: mockConversationModel,
        },
        {
          provide: getModelToken('Message'),
          useValue: mockMessageModel,
        },
        {
          provide: getModelToken('User'),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAnalytics', () => {
    it('should return analytics metrics successfully', async () => {
      // Mock dos dados de retorno
      const mockRevenue = [{ totalRevenue: 5000, totalCharges: 10 }];
      const mockConversations = [{ totalConversations: 50, conversationsWithCharges: 10 }];
      const mockUsers = [{ totalUsers: 100, activeLawyers: 5, totalClients: 95 }];
      const mockPerformance = [{ 
        averageResponseTime: 120, 
        averageConversationDuration: 1800,
        resolutionRate: 0.85,
        satisfactionScore: 4.2 
      }];

      // Configurar mocks
      mockChargeModel.aggregate
        .mockResolvedValueOnce(mockRevenue) // Para dados financeiros
        .mockResolvedValueOnce([{ monthlyRevenue: [] }]) // Para revenue mensal
        .mockResolvedValueOnce([{ // Para status das cobranças
          paidCharges: 8,
          pendingCharges: 2,
          rejectedCharges: 0
        }])
        .mockResolvedValueOnce([{ // Para top lawyers
          topLawyers: []
        }]);

      mockConversationModel.aggregate
        .mockResolvedValueOnce(mockConversations) // Para dados de conversas
        .mockResolvedValueOnce(mockPerformance); // Para dados de performance

      mockUserModel.aggregate
        .mockResolvedValueOnce(mockUsers) // Para dados de usuários
        .mockResolvedValueOnce([{ newUsersThisMonth: 15 }]); // Para novos usuários

      const result = await service.getAnalytics();

      expect(result).toBeDefined();
      expect(result.financial).toBeDefined();
      expect(result.conversion).toBeDefined();
      expect(result.users).toBeDefined();
      expect(result.performance).toBeDefined();
      expect(result.lawyers).toBeDefined();

      // Verificar estrutura dos dados
      expect(result.financial.totalRevenue).toBe(5000);
      expect(result.financial.totalCharges).toBe(10);
      expect(result.conversion.totalConversations).toBe(50);
      expect(result.conversion.conversationsWithCharges).toBe(10);
      expect(result.users.totalUsers).toBe(100);
    });

    it('should handle filters correctly', async () => {
      const filters = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        period: 'month' as const,
        segment: 'client' as const
      };

      // Mock básico para não quebrar
      mockChargeModel.aggregate.mockResolvedValue([]);
      mockConversationModel.aggregate.mockResolvedValue([]);
      mockUserModel.aggregate.mockResolvedValue([]);

      const result = await service.getAnalytics(filters);

      expect(result).toBeDefined();
      expect(mockChargeModel.aggregate).toHaveBeenCalled();
      expect(mockConversationModel.aggregate).toHaveBeenCalled();
      expect(mockUserModel.aggregate).toHaveBeenCalled();
    });
  });

  describe('exportAnalytics', () => {
    it('should export analytics in JSON format', async () => {
      // Mock dos dados básicos
      mockChargeModel.aggregate.mockResolvedValue([]);
      mockConversationModel.aggregate.mockResolvedValue([]);
      mockUserModel.aggregate.mockResolvedValue([]);

      const result = await service.exportAnalytics('json');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should export analytics in CSV format', async () => {
      // Mock dos dados básicos
      mockChargeModel.aggregate.mockResolvedValue([]);
      mockConversationModel.aggregate.mockResolvedValue([]);
      mockUserModel.aggregate.mockResolvedValue([]);

      const result = await service.exportAnalytics('csv');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });
});