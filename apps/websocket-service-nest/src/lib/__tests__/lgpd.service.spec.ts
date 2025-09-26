import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LGPDService } from '../lgpd.service';
import { IConsent, ConsentType, ConsentStatus } from '../../models/Consent';
import { IDataSubjectRequest, DataSubjectRight, RequestStatus } from '../../models/DataSubjectRequest';
import { AuditService } from '../audit.service';
import { EncryptionService } from '../encryption.service';

describe('LGPDService', () => {
  let service: LGPDService;
  let consentModel: Model<IConsent>;
  let dataSubjectRequestModel: Model<IDataSubjectRequest>;
  let auditService: AuditService;
  let encryptionService: EncryptionService;

  const mockConsent = {
    _id: 'consent123',
    userId: 'user123',
    type: ConsentType.DATA_PROCESSING,
    description: 'Test consent',
    purpose: 'Testing purposes',
    dataCategories: ['personal_info'],
    retentionPeriod: 365,
    legalBasis: 'consent',
    version: '1.0',
    status: ConsentStatus.PENDING,
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    save: jest.fn().mockResolvedValue(this),
  };

  const mockDataSubjectRequest = {
    _id: 'request123',
    userId: 'user123',
    right: DataSubjectRight.ACCESS,
    description: 'Request access to my data',
    status: RequestStatus.PENDING,
    verificationToken: 'token123',
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent',
    priority: 'medium',
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    save: jest.fn().mockResolvedValue(this),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LGPDService,
        {
          provide: getModelToken('Consent'),
          useValue: jest.fn().mockImplementation((data) => ({
            ...mockConsent,
            ...data,
            save: jest.fn().mockResolvedValue({ ...mockConsent, ...data }),
          })),
        },
        {
          provide: getModelToken('DataSubjectRequest'),
          useValue: jest.fn().mockImplementation((data) => ({
            ...mockDataSubjectRequest,
            ...data,
            save: jest.fn().mockResolvedValue({ ...mockDataSubjectRequest, ...data }),
          })),
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn().mockResolvedValue(undefined),
            logConsentChange: jest.fn().mockResolvedValue(undefined),
            getUserAuditLogs: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: EncryptionService,
          useValue: {
            generateSecureToken: jest.fn().mockReturnValue('secure-token-123'),
          },
        },
      ],
    }).compile();

    service = module.get<LGPDService>(LGPDService);
    consentModel = module.get<Model<IConsent>>(getModelToken('Consent'));
    dataSubjectRequestModel = module.get<Model<IDataSubjectRequest>>(getModelToken('DataSubjectRequest'));
    auditService = module.get<AuditService>(AuditService);
    encryptionService = module.get<EncryptionService>(EncryptionService);

    // Add static methods to the mocked models
    Object.assign(consentModel, {
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    });

    Object.assign(dataSubjectRequestModel, {
      findById: jest.fn(),
      create: jest.fn(),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createConsent', () => {
    it('should create consent successfully', async () => {
      const mockFindOne = jest.spyOn(consentModel, 'findOne').mockResolvedValue(null);

      const result = await service.createConsent(
        'user123',
        ConsentType.DATA_PROCESSING,
        'Test consent',
        'Testing purposes',
        ['personal_info'],
        365,
        'consent',
        '1.0',
        '127.0.0.1',
        'test-agent'
      );

      expect(mockFindOne).toHaveBeenCalledWith({
        userId: 'user123',
        type: ConsentType.DATA_PROCESSING,
        status: { $in: [ConsentStatus.PENDING, ConsentStatus.GRANTED] },
      });
      expect(auditService.logConsentChange).toHaveBeenCalledWith(
        'user123',
        ConsentType.DATA_PROCESSING,
        'grant',
        '127.0.0.1',
        'test-agent'
      );
      expect(result).toMatchObject({
        userId: 'user123',
        type: ConsentType.DATA_PROCESSING,
        description: 'Test consent',
        purpose: 'Testing purposes',
        dataCategories: ['personal_info'],
        retentionPeriod: 365,
        legalBasis: 'consent',
        version: '1.0',
        status: ConsentStatus.PENDING,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });
    });

    it('should throw error if active consent exists', async () => {
      const existingConsent = { ...mockConsent, status: ConsentStatus.GRANTED };
      jest.spyOn(consentModel, 'findOne').mockResolvedValue(existingConsent as any);

      await expect(
        service.createConsent(
          'user123',
          ConsentType.DATA_PROCESSING,
          'Test consent',
          'Testing purposes',
          ['personal_info'],
          365,
          'consent',
          '1.0',
          '127.0.0.1',
          'test-agent'
        )
      ).rejects.toThrow('Já existe um consentimento ativo para este tipo');
    });
  });

  describe('grantConsent', () => {
    it('should grant consent successfully', async () => {
      const pendingConsent = { ...mockConsent, status: ConsentStatus.PENDING, save: jest.fn().mockResolvedValue({ ...mockConsent, status: ConsentStatus.GRANTED, grantedAt: new Date() }) };
      jest.spyOn(consentModel, 'findOne').mockResolvedValue(pendingConsent as any);

      const result = await service.grantConsent('user123', 'consent123', '127.0.0.1', 'test-agent');

      expect(pendingConsent.save).toHaveBeenCalled();
      expect(auditService.logConsentChange).toHaveBeenCalledWith(
        'user123',
        ConsentType.DATA_PROCESSING,
        'grant',
        '127.0.0.1',
        'test-agent'
      );
      expect(result.status).toBe(ConsentStatus.GRANTED);
    });

    it('should throw error if consent not found', async () => {
      jest.spyOn(consentModel, 'findOne').mockResolvedValue(null);

      await expect(
        service.grantConsent('user123', 'consent123', '127.0.0.1', 'test-agent')
      ).rejects.toThrow('Consentimento não encontrado');
    });

    it('should throw error if consent not pending', async () => {
      const grantedConsent = { ...mockConsent, status: ConsentStatus.GRANTED };
      jest.spyOn(consentModel, 'findOne').mockResolvedValue(grantedConsent as any);

      await expect(
        service.grantConsent('user123', 'consent123', '127.0.0.1', 'test-agent')
      ).rejects.toThrow('Consentimento não está pendente');
    });
  });

  describe('revokeConsent', () => {
    it('should revoke consent successfully', async () => {
      const grantedConsent = { ...mockConsent, status: ConsentStatus.GRANTED, save: jest.fn().mockResolvedValue({ ...mockConsent, status: ConsentStatus.REVOKED, revokedAt: new Date() }) };
      jest.spyOn(consentModel, 'findOne').mockResolvedValue(grantedConsent as any);

      const result = await service.revokeConsent('user123', 'consent123', '127.0.0.1', 'test-agent');

      expect(grantedConsent.save).toHaveBeenCalled();
      expect(auditService.logConsentChange).toHaveBeenCalledWith(
        'user123',
        ConsentType.DATA_PROCESSING,
        'revoke',
        '127.0.0.1',
        'test-agent'
      );
      expect(result.status).toBe(ConsentStatus.REVOKED);
    });

    it('should throw error if consent not found', async () => {
      jest.spyOn(consentModel, 'findOne').mockResolvedValue(null);

      await expect(
        service.revokeConsent('user123', 'consent123', '127.0.0.1', 'test-agent')
      ).rejects.toThrow('Consentimento não encontrado');
    });
  });

  describe('getUserConsents', () => {
    it('should return user consents', async () => {
      const mockConsents = [mockConsent];
      const mockQuery = {
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockConsents),
        }),
      };
      jest.spyOn(consentModel, 'find').mockReturnValue(mockQuery as any);

      const result = await service.getUserConsents('user123');

      expect(result).toEqual(mockConsents);
      expect(consentModel.find).toHaveBeenCalledWith({ userId: 'user123' });
    });
  });

  describe('hasActiveConsent', () => {
    it('should return true if active consent exists', async () => {
      const activeConsent = { ...mockConsent, status: ConsentStatus.GRANTED, expiresAt: new Date(Date.now() + 86400000) };
      jest.spyOn(consentModel, 'findOne').mockResolvedValue(activeConsent as any);

      const result = await service.hasActiveConsent('user123', ConsentType.DATA_PROCESSING);

      expect(result).toBe(true);
    });

    it('should return false if no active consent exists', async () => {
      jest.spyOn(consentModel, 'findOne').mockResolvedValue(null);

      const result = await service.hasActiveConsent('user123', ConsentType.DATA_PROCESSING);

      expect(result).toBe(false);
    });
  });

  describe('createDataSubjectRequest', () => {
    it('should create data subject request successfully', async () => {
      const result = await service.createDataSubjectRequest(
        'user123',
        DataSubjectRight.ACCESS,
        'Request access to my data',
        '127.0.0.1',
        'test-agent',
        'Need my data for legal purposes',
        ['personal_info', 'conversations'],
        ['attachment1.pdf'],
        'high'
      );

      expect(encryptionService.generateSecureToken).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalled();
      expect(result).toMatchObject({
        userId: 'user123',
        right: DataSubjectRight.ACCESS,
        description: 'Request access to my data',
        status: RequestStatus.PENDING,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        priority: 'high',
      });
      expect(result.verificationToken).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });
  });

  describe('processDataSubjectRequest', () => {
    it('should process data subject request successfully', async () => {
      const pendingRequest = { ...mockDataSubjectRequest, status: RequestStatus.PENDING, save: jest.fn().mockResolvedValue({ ...mockDataSubjectRequest, status: RequestStatus.COMPLETED, completedAt: new Date() }) };
      jest.spyOn(dataSubjectRequestModel, 'findById').mockResolvedValue(pendingRequest as any);

      const result = await service.processDataSubjectRequest(
        'request123',
        'admin123',
        RequestStatus.COMPLETED,
        '127.0.0.1',
        'test-agent',
        'Request completed successfully',
        ['response.pdf']
      );

      expect(pendingRequest.save).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalled();
      expect(result.status).toBe(RequestStatus.COMPLETED);
    });

    it('should throw error if request not found', async () => {
      jest.spyOn(dataSubjectRequestModel, 'findById').mockResolvedValue(null);

      await expect(
        service.processDataSubjectRequest('request123', 'admin123', RequestStatus.COMPLETED, '127.0.0.1', 'test-agent')
      ).rejects.toThrow('Solicitação não encontrada');
    });
  });

  describe('getDataSubjectRequests', () => {
    it('should return data subject requests with filters', async () => {
      const mockRequests = [mockDataSubjectRequest];
      const mockQuery = {
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockRequests),
            }),
          }),
        }),
      };
      jest.spyOn(dataSubjectRequestModel, 'find').mockReturnValue(mockQuery as any);

      const result = await service.getDataSubjectRequests({
        status: RequestStatus.PENDING,
        priority: 'high',
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual(mockRequests);
    });
  });

  describe('getUserDataSubjectRequests', () => {
    it('should return user data subject requests', async () => {
      const mockRequests = [mockDataSubjectRequest];
      const mockQuery = {
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockRequests),
        }),
      };
      jest.spyOn(dataSubjectRequestModel, 'find').mockReturnValue(mockQuery as any);

      const result = await service.getUserDataSubjectRequests('user123');

      expect(result).toEqual(mockRequests);
      expect(dataSubjectRequestModel.find).toHaveBeenCalledWith({ userId: 'user123' });
    });
  });

  describe('exportUserData', () => {
    it('should export user data successfully', async () => {
      const mockConsents = [mockConsent];
      const mockRequests = [mockDataSubjectRequest];
      const mockAuditLogs = [
        {
          action: 'login',
          resource: 'user',
          timestamp: new Date(),
          success: true,
        },
      ];

      jest.spyOn(service, 'getUserConsents').mockResolvedValue(mockConsents as any);
      jest.spyOn(service, 'getUserDataSubjectRequests').mockResolvedValue(mockRequests as any);
      jest.spyOn(auditService, 'getUserAuditLogs').mockResolvedValue(mockAuditLogs as any);

      const result = await service.exportUserData('user123');

      expect(result.userId).toBe('user123');
      expect(result.exportDate).toBeInstanceOf(Date);
      expect(result.consents).toHaveLength(1);
      expect(result.dataSubjectRequests).toHaveLength(1);
      expect(result.auditLogs).toHaveLength(1);
      expect(service.getUserConsents).toHaveBeenCalledWith('user123');
      expect(service.getUserDataSubjectRequests).toHaveBeenCalledWith('user123');
      expect(auditService.getUserAuditLogs).toHaveBeenCalledWith('user123', 1000);
    });
  });

  describe('cleanupExpiredConsents', () => {
    it('should cleanup expired consents', async () => {
      const mockUpdateMany = jest.spyOn(consentModel, 'updateMany').mockResolvedValue({ modifiedCount: 5 } as any);

      const result = await service.cleanupExpiredConsents();

      expect(mockUpdateMany).toHaveBeenCalledWith(
        {
          status: ConsentStatus.GRANTED,
          expiresAt: { $lt: expect.any(Date) },
        },
        {
          status: ConsentStatus.EXPIRED,
          updatedAt: expect.any(Date),
        }
      );
      expect(result).toBe(5);
    });
  });

  describe('cleanupExpiredRequests', () => {
    it('should cleanup expired requests', async () => {
      const mockUpdateMany = jest.spyOn(dataSubjectRequestModel, 'updateMany').mockResolvedValue({ modifiedCount: 3 } as any);

      const result = await service.cleanupExpiredRequests();

      expect(mockUpdateMany).toHaveBeenCalledWith(
        {
          status: { $nin: [RequestStatus.COMPLETED, RequestStatus.REJECTED] },
          expiresAt: { $lt: expect.any(Date) },
        },
        {
          status: RequestStatus.REJECTED,
          response: 'Solicitação expirada - prazo de resposta excedido (LGPD)',
          completedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }
      );
      expect(result).toBe(3);
    });
  });
});