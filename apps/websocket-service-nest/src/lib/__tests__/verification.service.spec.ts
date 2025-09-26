import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VerificationService, IVerificationCode } from '../verification.service';

// Mock do Model with support for direct calls and query chaining
const mockVerificationModel = {
  create: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
};

describe('VerificationService', () => {
  let service: VerificationService;
  let verificationModel: Model<IVerificationCode>;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset mocks to default behavior
    mockVerificationModel.create.mockReset();
    mockVerificationModel.findOne.mockReset();
    mockVerificationModel.findOneAndUpdate.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        {
          provide: getModelToken('VerificationCode'),
          useValue: mockVerificationModel,
        },
      ],
    }).compile();

    service = module.get<VerificationService>(VerificationService);
    verificationModel = module.get<Model<IVerificationCode>>(getModelToken('VerificationCode'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateCode', () => {
    it('should generate verification code for email', async () => {
      const contact = { email: 'test@example.com' };
      const mockCreated = {
        _id: 'mock-id',
        email: 'test@example.com',
        code: '123456',
        verified: false,
        expiresAt: new Date(),
        createdAt: new Date(),
        attempts: 0,
        maxAttempts: 3,
      };

      mockVerificationModel.create.mockResolvedValue(mockCreated);

      const result = await service.generateCode(contact);

      expect(result).toMatch(/^\d{6}$/);
      expect(mockVerificationModel.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        code: expect.stringMatching(/^\d{6}$/),
        expiresAt: expect.any(Date),
        maxAttempts: 3,
      });
    });

    it('should generate verification code for phone', async () => {
      const contact = { phone: '+5511999999999' };
      const mockCreated = {
        _id: 'mock-id',
        phone: '+5511999999999',
        code: '654321',
        verified: false,
        expiresAt: new Date(),
        createdAt: new Date(),
        attempts: 0,
        maxAttempts: 3,
      };

      mockVerificationModel.create.mockResolvedValue(mockCreated);

      const result = await service.generateCode(contact);

      expect(result).toMatch(/^\d{6}$/);
      expect(mockVerificationModel.create).toHaveBeenCalledWith({
        phone: '+5511999999999',
        code: expect.stringMatching(/^\d{6}$/),
        expiresAt: expect.any(Date),
        maxAttempts: 3,
      });
    });

    it('should generate different codes for multiple calls', async () => {
      const contact = { email: 'test@example.com' };
      mockVerificationModel.create.mockResolvedValue({});

      const code1 = await service.generateCode(contact);
      const code2 = await service.generateCode(contact);

      // Os códigos devem ser diferentes (probabilidade muito baixa de serem iguais)
      expect(code1).not.toBe(code2);
      expect(code1).toMatch(/^\d{6}$/);
      expect(code2).toMatch(/^\d{6}$/);
    });

    it('should handle database errors', async () => {
      const contact = { email: 'test@example.com' };
      mockVerificationModel.create.mockRejectedValue(new Error('Database error'));

      await expect(service.generateCode(contact)).rejects.toThrow('Database error');
    });
  });

  describe('verifyCode', () => {
    it('should return true for valid code', async () => {
      const contact = { email: 'test@example.com' };
      const code = '123456';
      const mockVerification = {
        _id: 'mock-id',
        email: 'test@example.com',
        code: '123456',
        verified: false,
        expiresAt: new Date(Date.now() + 10000),
        attempts: 0,
        maxAttempts: 3,
        save: jest.fn().mockResolvedValue({}),
      };

      // Mock findOne with query chaining support
      const mockQuery = {
        sort: jest.fn().mockResolvedValue(mockVerification),
      };
      mockVerificationModel.findOne.mockReturnValue(mockQuery);

      const result = await service.verifyCode(contact, code);

      expect(result).toBe(true);
      expect(mockVerification.verified).toBe(true);
      expect(mockVerification.attempts).toBe(1);
      expect(mockVerification.save).toHaveBeenCalled();
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('should return false for invalid code', async () => {
      const contact = { email: 'test@example.com' };
      const code = '123456';
      const mockVerification = {
        _id: 'mock-id',
        email: 'test@example.com',
        code: '654321', // Different code
        verified: false,
        expiresAt: new Date(Date.now() + 10000),
        attempts: 0,
        maxAttempts: 3,
        save: jest.fn().mockResolvedValue({}),
      };

      const mockQuery = {
        sort: jest.fn().mockResolvedValue(mockVerification),
      };
      mockVerificationModel.findOne.mockReturnValue(mockQuery);

      const result = await service.verifyCode(contact, code);

      expect(result).toBe(false);
      expect(mockVerification.verified).toBe(false);
      expect(mockVerification.attempts).toBe(1);
      expect(mockVerification.save).toHaveBeenCalled();
    });

    it('should return false when code is expired', async () => {
      const contact = { email: 'test@example.com' };
      const code = '123456';

      // Mock returns null for expired/non-existent verification
      const mockQuery = {
        sort: jest.fn().mockResolvedValue(null),
      };
      mockVerificationModel.findOne.mockReturnValue(mockQuery);

      const result = await service.verifyCode(contact, code);

      expect(result).toBe(false);
    });

    it('should return false when max attempts exceeded', async () => {
      const contact = { email: 'test@example.com' };
      const code = '123456';
      const mockVerification = {
        _id: 'mock-id',
        email: 'test@example.com',
        code: '123456',
        verified: false,
        expiresAt: new Date(Date.now() + 10000),
        attempts: 3, // Max attempts reached
        maxAttempts: 3,
        save: jest.fn().mockResolvedValue({}),
      };

      const mockQuery = {
        sort: jest.fn().mockResolvedValue(mockVerification),
      };
      mockVerificationModel.findOne.mockReturnValue(mockQuery);

      const result = await service.verifyCode(contact, code);

      expect(result).toBe(false);
      expect(mockVerification.save).not.toHaveBeenCalled();
    });

    it('should handle database errors during verification', async () => {
      const contact = { email: 'test@example.com' };
      const code = '123456';

      const mockQuery = {
        sort: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      mockVerificationModel.findOne.mockReturnValue(mockQuery);

      await expect(service.verifyCode(contact, code)).rejects.toThrow('Database error');
    });
  });

  describe('isVerified', () => {
    it('should return true when email is verified', async () => {
      const contact = { email: 'verified@example.com' };
      const mockVerification = {
        _id: 'mock-id',
        email: 'verified@example.com',
        verified: true,
        expiresAt: new Date(Date.now() + 10000),
      };

      // Mock direct findOne result (no chaining)
      mockVerificationModel.findOne.mockResolvedValue(mockVerification);

      const result = await service.isVerified(contact);

      expect(result).toBe(true);
      expect(mockVerificationModel.findOne).toHaveBeenCalledWith({
        email: 'verified@example.com',
        verified: true,
        expiresAt: { $gt: expect.any(Date) },
      });
    });

    it('should return true when phone is verified', async () => {
      const contact = { phone: '+5511999999999' };
      const mockVerification = {
        _id: 'mock-id',
        phone: '+5511999999999',
        verified: true,
        expiresAt: new Date(Date.now() + 10000),
      };

      mockVerificationModel.findOne.mockResolvedValue(mockVerification);

      const result = await service.isVerified(contact);

      expect(result).toBe(true);
      expect(mockVerificationModel.findOne).toHaveBeenCalledWith({
        phone: '+5511999999999',
        verified: true,
        expiresAt: { $gt: expect.any(Date) },
      });
    });

    it('should return false when contact is not verified', async () => {
      const contact = { email: 'unverified@example.com' };

      mockVerificationModel.findOne.mockResolvedValue(null);

      const result = await service.isVerified(contact);

      expect(result).toBe(false);
    });

    it('should handle database errors during verification check', async () => {
      const contact = { email: 'test@example.com' };

      mockVerificationModel.findOne.mockRejectedValue(new Error('Database error'));

      await expect(service.isVerified(contact)).rejects.toThrow('Database error');
    });

    it('should handle invalid contact data', async () => {
      const contact = {}; // No email or phone

      const result = await service.isVerified(contact);

      expect(result).toBe(false);
      expect(mockVerificationModel.findOne).toHaveBeenCalledWith({
        verified: true,
        expiresAt: { $gt: expect.any(Date) },
      });
    });
  });
});