import { Test, TestingModule } from '@nestjs/testing';
import { LGPDController } from '../lgpd.controller';
import { LGPDService } from '../../lib/lgpd.service';
import { ConsentType } from '../../models/Consent';
import { DataSubjectRight, RequestStatus } from '../../models/DataSubjectRequest';

describe('LGPDController', () => {
  let controller: LGPDController;
  let service: LGPDService;

  const mockRequest = {
    user: { id: 'user123' },
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('test-agent'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LGPDController],
      providers: [
        {
          provide: LGPDService,
          useValue: {
            getUserConsents: jest.fn(),
            createConsent: jest.fn(),
            revokeConsent: jest.fn(),
            exportUserData: jest.fn(),
            createDataSubjectRequest: jest.fn(),
            getDataSubjectRequests: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LGPDController>(LGPDController);
    service = module.get<LGPDService>(LGPDService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUserConsents', () => {
    it('should return user consents', async () => {
      const mockConsents = [{ id: 'consent1', type: 'data_processing' }];
      jest.spyOn(service, 'getUserConsents').mockResolvedValue(mockConsents as any);

      const result = await controller.getUserConsents(mockRequest as any);

      expect(result).toEqual(mockConsents);
      expect(service.getUserConsents).toHaveBeenCalledWith('user123');
    });
  });

  describe('createConsent', () => {
    it('should create consent successfully', async () => {
      const consentData = {
        type: ConsentType.DATA_PROCESSING,
        description: 'Test consent',
        purpose: 'Legal consultation',
        dataCategories: ['personal_info'],
        retentionPeriod: 365,
        legalBasis: 'consent',
        version: '1.0',
      };

      const mockConsent = { id: 'consent1', ...consentData };
      jest.spyOn(service, 'createConsent').mockResolvedValue(mockConsent as any);

      const result = await controller.createConsent(mockRequest as any, consentData);

      expect(result).toEqual(mockConsent);
      expect(service.createConsent).toHaveBeenCalledWith(
        'user123',
        consentData.type,
        consentData.description,
        consentData.purpose,
        consentData.dataCategories,
        consentData.retentionPeriod,
        consentData.legalBasis,
        consentData.version,
        '127.0.0.1',
        'test-agent'
      );
    });
  });

  describe('revokeConsent', () => {
    it('should revoke consent successfully', async () => {
      const mockConsent = { id: 'consent1', status: 'revoked' };
      jest.spyOn(service, 'revokeConsent').mockResolvedValue(mockConsent as any);

      const result = await controller.revokeConsent(mockRequest as any, 'consent1');

      expect(result).toEqual(mockConsent);
      expect(service.revokeConsent).toHaveBeenCalledWith('user123', 'consent1', '127.0.0.1', 'test-agent');
    });
  });

  describe('exportUserData', () => {
    it('should export user data successfully', async () => {
      const serviceExportData = {
        userId: 'user123',
        exportDate: new Date(),
        data: { personalInfo: {}, consents: [], auditLogs: [] },
      };
      const expectedResponse = {
        message: 'Dados exportados com sucesso',
        exportId: expect.stringMatching(/^export_\d+$/),
        data: serviceExportData,
        downloadUrl: '/api/lgpd/download-export/user123',
      };

      jest.spyOn(service, 'exportUserData').mockResolvedValue(serviceExportData as any);

      const result = await controller.exportUserData(mockRequest as any);

      expect(result).toMatchObject(expectedResponse);
      expect(service.exportUserData).toHaveBeenCalledWith('user123');
    });
  });

  describe('createDataSubjectRequest', () => {
    it('should create data subject request successfully', async () => {
      const requestData = {
        right: DataSubjectRight.ACCESS,
        description: 'Review my data',
        justification: 'Personal review',
        requestedData: ['personal_info'],
        priority: 'medium' as const,
      };

      const mockRequestResponse = { id: 'request1', ...requestData };
      jest.spyOn(service, 'createDataSubjectRequest').mockResolvedValue(mockRequestResponse as any);

      const result = await controller.createDataSubjectRequest(mockRequest as any, requestData);

      expect(result).toEqual(mockRequestResponse);
      expect(service.createDataSubjectRequest).toHaveBeenCalledWith(
        'user123',
        requestData.right,
        requestData.description,
        '127.0.0.1',
        'test-agent',
        requestData.justification,
        requestData.requestedData,
        undefined, // attachments
        requestData.priority
      );
    });
  });

  describe('getDataSubjectRequests', () => {
    it('should return data subject requests', async () => {
      const query = { status: RequestStatus.PENDING, limit: 10 };
      const mockRequests = [{ id: 'request1', right: DataSubjectRight.ACCESS }];
      jest.spyOn(service, 'getDataSubjectRequests').mockResolvedValue(mockRequests as any);

      const result = await controller.getDataSubjectRequests(query);

      expect(result).toEqual(mockRequests);
      expect(service.getDataSubjectRequests).toHaveBeenCalledWith(query);
    });
  });
});