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
        exec: jest.fn().mockResolvedValue([]),
      }),
    };

    mockConversationModel = {
      aggregate: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    };

    mockMessageModel = {
      aggregate: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    };

    mockUserModel = {
      aggregate: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
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
      mockChargeModel.aggregate
        .mockResolvedValueOnce([{ totalRevenue: 400000, totalCharges: 10 }])
        .mockResolvedValueOnce([
          { _id: { year: 2024, month: 9 }, revenue: 250000 },
        ])
        .mockResolvedValueOnce([
          { paidCharges: 8, pendingCharges: 2, rejectedCharges: 0 },
        ]);

      mockConversationModel.aggregate
        .mockResolvedValueOnce([
          { totalConversations: 50, conversationsWithCharges: 10 },
        ])
        .mockResolvedValueOnce([
          {
            averageResponseTime: 120,
            averageConversationDuration: 1800,
            resolutionRate: 0.85,
            satisfactionScore: 4.2,
          },
        ]);

      mockMessageModel.aggregate
        .mockResolvedValueOnce([{ totalMessages: 185 }])
        .mockResolvedValueOnce([
          { _id: '2024-09-01', count: 50 },
          { _id: '2024-09-02', count: 75 },
        ]);

      mockUserModel.aggregate
        .mockResolvedValueOnce([
          { totalUsers: 100, activeLawyers: 5, totalClients: 95 },
        ])
        .mockResolvedValueOnce([{ newUsersThisMonth: 15 }]);

      mockUserModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            _id: 'lawyer1',
            name: 'Advogado 1',
            role: 'lawyer',
            isActive: true,
          },
        ]),
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
      mockChargeModel.aggregate
        .mockResolvedValueOnce([{ totalRevenue: 400000, totalCharges: 10 }])
        .mockResolvedValueOnce([
          { _id: { year: 2024, month: 9 }, revenue: 250000 },
        ])
        .mockResolvedValueOnce([
          { paidCharges: 8, pendingCharges: 2, rejectedCharges: 0 },
        ]);

      mockConversationModel.aggregate
        .mockResolvedValueOnce([
          { totalConversations: 50, conversationsWithCharges: 10 },
        ])
        .mockResolvedValueOnce([
          {
            averageResponseTime: 120,
            averageConversationDuration: 1800,
            resolutionRate: 0.85,
            satisfactionScore: 4.2,
          },
        ]);

      mockMessageModel.aggregate
        .mockResolvedValueOnce([{ totalMessages: 185 }])
        .mockResolvedValueOnce([
          { _id: '2024-09-01', count: 50 },
          { _id: '2024-09-02', count: 75 },
        ]);

      mockUserModel.aggregate
        .mockResolvedValueOnce([
          { totalUsers: 100, activeLawyers: 5, totalClients: 95 },
        ])
        .mockResolvedValueOnce([{ newUsersThisMonth: 15 }]);

      mockUserModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            _id: 'lawyer1',
            name: 'Advogado 1',
            role: 'lawyer',
            isActive: true,
          },
        ]),
      });

      const result = await service.exportAnalytics('json');

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it.skip('should export analytics in CSV format', async () => {
      // Configurar mocks simples para este teste
      mockChargeModel.aggregate
        .mockResolvedValueOnce([{ totalRevenue: 400000, totalCharges: 10 }])
        .mockResolvedValueOnce([
          { _id: { year: 2024, month: 9 }, revenue: 250000 },
        ])
        .mockResolvedValueOnce([
          { paidCharges: 8, pendingCharges: 2, rejectedCharges: 0 },
        ]);

      mockConversationModel.aggregate
        .mockResolvedValueOnce([
          { totalConversations: 50, conversationsWithCharges: 10 },
        ])
        .mockResolvedValueOnce([
          {
            averageResponseTime: 120,
            averageConversationDuration: 1800,
            resolutionRate: 0.85,
            satisfactionScore: 4.2,
          },
        ]);

      mockMessageModel.aggregate
        .mockResolvedValueOnce([{ totalMessages: 185 }])
        .mockResolvedValueOnce([
          { _id: '2024-09-01', count: 50 },
          { _id: '2024-09-02', count: 75 },
        ]);

      mockUserModel.aggregate
        .mockResolvedValueOnce([
          { totalUsers: 100, activeLawyers: 5, totalClients: 95 },
        ])
        .mockResolvedValueOnce([{ newUsersThisMonth: 15 }]);

      mockUserModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            _id: 'lawyer1',
            name: 'Advogado 1',
            role: 'lawyer',
            isActive: true,
          },
        ]),
      });

      const result = await service.exportAnalytics('csv');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });
});
