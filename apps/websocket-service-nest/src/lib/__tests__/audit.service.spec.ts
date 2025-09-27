import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Query } from 'mongoose';
import { AuditService } from '../audit.service';
import { IAuditLog, AuditAction, AuditSeverity } from '../../models/AuditLog';

type MockModel<T> = {
  [K in keyof Model<T>]: jest.Mock;
};

describe('AuditService', () => {
  let service: AuditService;
  let auditLogModel: MockModel<IAuditLog>;

  const mockAuditLog = {
    _id: 'audit123',
    userId: 'user123',
    action: AuditAction.LOGIN,
    severity: AuditSeverity.LOW,
    resource: 'user',
    resourceId: 'user123',
    details: { loginMethod: 'email' },
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    sessionId: 'session123',
    success: true,
    timestamp: new Date(),
    expiresAt: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getModelToken('AuditLog'),
          useValue: {
            create: jest.fn().mockResolvedValue(mockAuditLog),
            find: jest.fn(),
            aggregate: jest.fn().mockResolvedValue([]),
            countDocuments: jest.fn().mockResolvedValue(0),
            deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
          },
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    auditLogModel = module.get<MockModel<IAuditLog>>(getModelToken('AuditLog'));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should handle database errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      auditLogModel.create.mockRejectedValue(new Error('Database error'));

      await expect(
        service.log(AuditAction.LOGIN, 'user'),
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Erro ao registrar log de auditoria:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getAuditLogs', () => {
    it('should return audit logs with filters', async () => {
      const filters = {
        userId: 'user123',
        action: AuditAction.LOGIN,
        severity: AuditSeverity.LOW,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        limit: 10,
        offset: 0,
      };
      const mockLogs = [mockAuditLog];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockLogs),
      };
      auditLogModel.find.mockReturnValue(
        mockQuery as unknown as Query<IAuditLog[], IAuditLog>,
      );

      const result = await service.getAuditLogs(filters);

      expect(result).toEqual(mockLogs);
      expect(auditLogModel.find).toHaveBeenCalledWith({
        userId: 'user123',
        action: AuditAction.LOGIN,
        severity: AuditSeverity.LOW,
        timestamp: {
          $gte: filters.startDate,
          $lte: filters.endDate,
        },
      });
    });

    it('should handle partial filters', async () => {
      const filters = { severity: AuditSeverity.CRITICAL };
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      auditLogModel.find.mockReturnValue(
        mockQuery as unknown as Query<IAuditLog[], IAuditLog>,
      );

      await service.getAuditLogs(filters);

      expect(auditLogModel.find).toHaveBeenCalledWith({
        severity: AuditSeverity.CRITICAL,
      });
    });
  });

  describe('getUserAuditLogs', () => {
    it('should return user audit logs', async () => {
      const mockLogs = [mockAuditLog];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockLogs),
      };
      auditLogModel.find.mockReturnValue(
        mockQuery as unknown as Query<IAuditLog[], IAuditLog>,
      );

      const result = await service.getUserAuditLogs('user123', 50);

      expect(result).toEqual(mockLogs);
      expect(auditLogModel.find).toHaveBeenCalledWith({ userId: 'user123' });
    });
  });

  describe('getSeverityStats', () => {
    it('should return severity statistics', async () => {
      const mockStats = [
        { _id: AuditSeverity.LOW, count: 100 },
        { _id: AuditSeverity.MEDIUM, count: 50 },
        { _id: AuditSeverity.HIGH, count: 10 },
        { _id: AuditSeverity.CRITICAL, count: 2 },
      ];

      auditLogModel.aggregate.mockResolvedValue(mockStats);

      const result = await service.getSeverityStats();

      expect(result).toEqual({
        [AuditSeverity.LOW]: 100,
        [AuditSeverity.MEDIUM]: 50,
        [AuditSeverity.HIGH]: 10,
        [AuditSeverity.CRITICAL]: 2,
      });
    });

    it('should apply date filters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      auditLogModel.aggregate.mockResolvedValue([]);

      await service.getSeverityStats(startDate, endDate);

      expect(auditLogModel.aggregate).toHaveBeenCalledWith([
        {
          $match: {
            timestamp: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 },
          },
        },
      ]);
    });
  });

  describe('detectSuspiciousActivity', () => {
    it('should detect suspicious activity', async () => {
      const mockSuspiciousLogs = [
        {
          ...mockAuditLog,
          action: AuditAction.LOGIN,
          ipAddress: 'suspicious-ip',
          userAgent: 'suspicious-agent',
          timestamp: new Date(),
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockSuspiciousLogs),
      };
      auditLogModel.find.mockReturnValue(
        mockQuery as unknown as Query<IAuditLog[], IAuditLog>,
      );

      const result = await service.detectSuspiciousActivity(24);

      expect(result).toEqual(mockSuspiciousLogs);
    });
  });

  describe('logDataAccess', () => {
    it('should log data access with correct parameters', async () => {
      const mockLog = jest.fn().mockResolvedValue(undefined);
      service.log = mockLog;

      const params = {
        userId: 'user123',
        resource: 'user_profile',
        resourceId: 'profile456',
        accessorId: 'admin789',
        purpose: 'account_verification',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      await service.logDataAccess(
        params.userId,
        params.resource,
        params.resourceId,
        params.accessorId,
        params.purpose,
        params.ipAddress,
        params.userAgent,
      );

      expect(mockLog).toHaveBeenCalledWith(
        AuditAction.DATA_ACCESS,
        params.resource,
        {
          resourceId: params.resourceId,
          accessorId: params.accessorId,
          purpose: params.purpose,
          lgpdCompliance: true,
        },
        {
          userId: params.userId,
          resourceId: params.resourceId,
          severity: AuditSeverity.MEDIUM,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      );
    });
  });

  describe('logConsentChange', () => {
    it('should log consent grant with correct parameters', async () => {
      const mockLog = jest.fn().mockResolvedValue(undefined);
      service.log = mockLog;

      const params = {
        userId: 'user123',
        consentType: 'marketing_emails',
        action: 'grant' as const,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      await service.logConsentChange(
        params.userId,
        params.consentType,
        params.action,
        params.ipAddress,
        params.userAgent,
      );

      expect(mockLog).toHaveBeenCalledWith(
        AuditAction.CONSENT_GRANT,
        'consent',
        {
          consentType: params.consentType,
          lgpdCompliance: true,
        },
        {
          userId: params.userId,
          severity: AuditSeverity.HIGH,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      );
    });

    it('should log consent revoke with correct parameters', async () => {
      const mockLog = jest.fn().mockResolvedValue(undefined);
      service.log = mockLog;

      const params = {
        userId: 'user123',
        consentType: 'marketing_emails',
        action: 'revoke' as const,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      await service.logConsentChange(
        params.userId,
        params.consentType,
        params.action,
        params.ipAddress,
        params.userAgent,
      );

      expect(mockLog).toHaveBeenCalledWith(
        AuditAction.CONSENT_REVOKE,
        'consent',
        {
          consentType: params.consentType,
          lgpdCompliance: true,
        },
        {
          userId: params.userId,
          severity: AuditSeverity.HIGH,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      );
    });
  });

  describe('logDataExport', () => {
    it('should log data export with correct parameters', async () => {
      const mockLog = jest.fn().mockResolvedValue(undefined);
      service.log = mockLog;

      const params = {
        userId: 'user123',
        requestId: 'req456',
        dataTypes: ['personal_info', 'documents'],
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      await service.logDataExport(
        params.userId,
        params.requestId,
        params.dataTypes,
        params.ipAddress,
        params.userAgent,
      );

      expect(mockLog).toHaveBeenCalledWith(
        AuditAction.DATA_EXPORT,
        'user_data',
        {
          requestId: params.requestId,
          dataTypes: params.dataTypes,
          lgpdCompliance: true,
        },
        {
          userId: params.userId,
          severity: AuditSeverity.HIGH,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      );
    });
  });
});
