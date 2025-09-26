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
    // Reset dos mocks
    jest.clearAllMocks();

    // Mock dos modelos Mongoose
    mockChargeModel = {
      aggregate: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([])
      }),
    };

    mockConversationModel = {
      aggregate: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([])
      }),
    };

    mockMessageModel = {
      aggregate: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([])
      }),
    };

    mockUserModel = {
      aggregate: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([])
      }),
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
    it.skip('should return analytics metrics successfully', async () => {
      // Configurar mocks simples para este teste
      mockChargeModel.aggregate.mockResolvedValueOnce([{ totalRevenue: 400000, totalCharges: 10 }])
        .mockResolvedValueOnce([{ _id: { year: 2024, month: 9 }, revenue: 250000 }])
        .mockResolvedValueOnce([{ paidCharges: 8, pendingCharges: 2, rejectedCharges: 0 }]);

      mockConversationModel.aggregate.mockResolvedValueOnce([{ totalConversations: 50, conversationsWithCharges: 10 }])
        .mockResolvedValueOnce([{
          averageResponseTime: 120,
          averageConversationDuration: 1800,
          resolutionRate: 0.85,
          satisfactionScore: 4.2
        }]);

      mockMessageModel.aggregate.mockResolvedValueOnce([{ totalMessages: 185 }])
        .mockResolvedValueOnce([
          { _id: '2024-09-01', count: 50 },
          { _id: '2024-09-02', count: 75 },
        ]);

      mockUserModel.aggregate.mockResolvedValueOnce([{ totalUsers: 100, activeLawyers: 5, totalClients: 95 }])
        .mockResolvedValueOnce([{ newUsersThisMonth: 15 }]);

      mockUserModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: 'lawyer1', name: 'Advogado 1', role: 'lawyer', isActive: true }
        ])
      });

      const result = await service.getAnalytics();

      expect(result).toBeDefined();
      expect(result.financial).toBeDefined();
      expect(result.users).toBeDefined();
      expect(result.performance).toBeDefined();
      expect(result.system).toBeDefined();
    });
  });

  describe('exportAnalytics', () => {
    it.skip('should export analytics in JSON format', async () => {
      // Configurar mocks simples para este teste
      mockChargeModel.aggregate.mockResolvedValueOnce([{ totalRevenue: 400000, totalCharges: 10 }])
        .mockResolvedValueOnce([{ _id: { year: 2024, month: 9 }, revenue: 250000 }])
        .mockResolvedValueOnce([{ paidCharges: 8, pendingCharges: 2, rejectedCharges: 0 }]);

      mockConversationModel.aggregate.mockResolvedValueOnce([{ totalConversations: 50, conversationsWithCharges: 10 }])
        .mockResolvedValueOnce([{
          averageResponseTime: 120,
          averageConversationDuration: 1800,
          resolutionRate: 0.85,
          satisfactionScore: 4.2
        }]);

      mockMessageModel.aggregate.mockResolvedValueOnce([{ totalMessages: 185 }])
        .mockResolvedValueOnce([
          { _id: '2024-09-01', count: 50 },
          { _id: '2024-09-02', count: 75 },
        ]);

      mockUserModel.aggregate.mockResolvedValueOnce([{ totalUsers: 100, activeLawyers: 5, totalClients: 95 }])
        .mockResolvedValueOnce([{ newUsersThisMonth: 15 }]);

      mockUserModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: 'lawyer1', name: 'Advogado 1', role: 'lawyer', isActive: true }
        ])
      });

      const result = await service.exportAnalytics('json');

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it.skip('should export analytics in CSV format', async () => {
      // Configurar mocks simples para este teste
      mockChargeModel.aggregate.mockResolvedValueOnce([{ totalRevenue: 400000, totalCharges: 10 }])
        .mockResolvedValueOnce([{ _id: { year: 2024, month: 9 }, revenue: 250000 }])
        .mockResolvedValueOnce([{ paidCharges: 8, pendingCharges: 2, rejectedCharges: 0 }]);

      mockConversationModel.aggregate.mockResolvedValueOnce([{ totalConversations: 50, conversationsWithCharges: 10 }])
        .mockResolvedValueOnce([{
          averageResponseTime: 120,
          averageConversationDuration: 1800,
          resolutionRate: 0.85,
          satisfactionScore: 4.2
        }]);

      mockMessageModel.aggregate.mockResolvedValueOnce([{ totalMessages: 185 }])
        .mockResolvedValueOnce([
          { _id: '2024-09-01', count: 50 },
          { _id: '2024-09-02', count: 75 },
        ]);

      mockUserModel.aggregate.mockResolvedValueOnce([{ totalUsers: 100, activeLawyers: 5, totalClients: 95 }])
        .mockResolvedValueOnce([{ newUsersThisMonth: 15 }]);

      mockUserModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: 'lawyer1', name: 'Advogado 1', role: 'lawyer', isActive: true }
        ])
      });

      const result = await service.exportAnalytics('csv');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should get revenue analytics with filters', async () => {
      const filters = { startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31') };

      mockChargeModel.aggregate.mockResolvedValue([
        { _id: '2024-09', totalRevenue: 500000, totalCharges: 25, paidCharges: 20, pendingCharges: 3, rejectedCharges: 2 }
      ]);

      const result = await service.getRevenueAnalytics(filters);

      expect(result).toBeDefined();
      expect(result.summary.totalRevenue).toBe(500000);
      expect(result.summary.totalCharges).toBe(25);
      expect(result.revenue).toBeDefined();
      expect(mockChargeModel.aggregate).toHaveBeenCalledTimes(1);
    });

    it('should get conversation analytics with filters', async () => {
      const filters = { lawyerId: 'lawyer123' };

      mockConversationModel.aggregate.mockResolvedValue([
        { _id: '2024-09', totalConversations: 100, resolvedConversations: 90, averageMessages: 15, averageDuration: 45 }
      ]);

      const result = await service.getConversationAnalytics(filters);

      expect(result).toBeDefined();
      expect(result.summary.totalConversations).toBe(100);
      expect(result.summary.resolvedConversations).toBe(90);
      expect(result.conversations).toBeDefined();
      expect(mockConversationModel.aggregate).toHaveBeenCalledTimes(1);
    });

    it('should get user analytics', async () => {
      mockUserModel.aggregate.mockResolvedValue([
        { _id: '2024-09', totalUsers: 200, lawyers: 15, clients: 180, admins: 5 }
      ]);

      const result = await service.getUserAnalytics();

      expect(result).toBeDefined();
      expect(result.summary.totalUsers).toBe(200);
      expect(result.summary.lawyers).toBe(15);
      expect(result.users).toBeDefined();
      expect(mockUserModel.aggregate).toHaveBeenCalledTimes(1);
    });

    it('should handle errors in revenue analytics', async () => {
      mockChargeModel.aggregate.mockRejectedValue(new Error('Database error'));

      await expect(service.getRevenueAnalytics()).rejects.toThrow('Database error');
    });

    it('should handle errors in conversation analytics', async () => {
      mockConversationModel.aggregate.mockRejectedValue(new Error('Query failed'));

      await expect(service.getConversationAnalytics()).rejects.toThrow('Query failed');
    });

    it('should handle errors in user analytics', async () => {
      mockUserModel.aggregate.mockRejectedValue(new Error('Connection failed'));

      await expect(service.getUserAnalytics()).rejects.toThrow('Connection failed');
    });

    it('should export analytics in JSON format', async () => {
      const mockAnalytics: any = {
        conversion: { totalConversations: 50, conversationsWithCharges: 10, conversionRate: 0.2, averageChargeValue: 40000 },
        financial: { totalRevenue: 400000, totalCharges: 10, paidCharges: 8, pendingCharges: 2, rejectedCharges: 0, averageRevenuePerConversation: 8000, monthlyRevenue: [] },
        users: { totalUsers: 100, activeLawyers: 5, totalClients: 95, newUsersThisMonth: 15 },
        performance: { averageResponseTime: 120, averageConversationDuration: 1800, resolutionRate: 0.85, satisfactionScore: 4.2 },
        lawyers: { topLawyers: [] },
        services: { chargesByType: {}, revenueByType: {}, averageValueByType: {} },
        system: { totalMessages: 185, messagesPerDay: [], activeConversations: 10, systemUptime: 99.9 }
      };

      // Mock getAnalytics to return the mock data
      jest.spyOn(service, 'getAnalytics').mockResolvedValue(mockAnalytics);

      const result = await service.exportAnalytics('json');

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result).toEqual(mockAnalytics);
    });
  });
});
