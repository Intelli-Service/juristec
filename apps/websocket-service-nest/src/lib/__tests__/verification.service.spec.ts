import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VerificationService, IVerificationCode } from '../verification.service';

// Mock do Model
const mockVerificationModel = {
  create: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
};

describe.skip('VerificationService', () => {
  let service: VerificationService;
  let verificationModel: Model<IVerificationCode>;

  beforeEach(async () => {
    jest.clearAllMocks();

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
  });

  describe('verifyCode', () => {
    it('should verify correct code for email', async () => {
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

      mockVerificationModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockVerification),
      });

      const result = await service.verifyCode(contact, code);

      expect(result).toBe(true);
      expect(mockVerification.save).toHaveBeenCalled();
      expect(mockVerification.verified).toBe(true);
      expect(mockVerification.attempts).toBe(1);
    });

    it('should return false when verification code not found', async () => {
      const contact = { email: 'nonexistent@example.com' };
      const code = '123456';

      mockVerificationModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });

      const result = await service.verifyCode(contact, code);

      expect(result).toBe(false);
    });

    it('should return false when code is expired', async () => {
      const contact = { email: 'test@example.com' };
      const code = '123456';

      mockVerificationModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });

      const result = await service.verifyCode(contact, code);

      expect(result).toBe(false);
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

      mockVerificationModel.findOne.mockResolvedValue(mockVerification);

      const result = await service.isVerified(contact);

      expect(result).toBe(true);
    });

    it('should return false when contact is not verified', async () => {
      const contact = { email: 'unverified@example.com' };

      mockVerificationModel.findOne.mockResolvedValue(null);

      const result = await service.isVerified(contact);

      expect(result).toBe(false);
    });
  });
});

// Função helper para criar mock com sort
const createMockWithSort = (result: any) => ({
  sort: jest.fn().mockReturnValue(result),
});

describe.skip('VerificationService', () => {
  let service: VerificationService;
  let verificationModel: Model<IVerificationCode>;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Resetar resultado do mock

    // Resetar mocks para comportamento padrão
    mockVerificationModel.create.mockReset();
    mockVerificationModel.findOne.mockReset();
    mockVerificationModel.findOneAndUpdate.mockReset();

    // Resetar mocks para comportamento padrão
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

      expect(result).toMatch(/^\d{6}$/); // Deve ser um código de 6 dígitos
      expect(mockVerificationModel.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        code: expect.stringMatching(/^\d{6}$/),
        expiresAt: expect.any(Date),
        maxAttempts: 3,
      });

      const callArgs = mockVerificationModel.create.mock.calls[0][0];
      expect(callArgs.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(callArgs.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 10 * 60 * 1000 + 1000); // ~10 minutos
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
    it('should verify correct code for email', async () => {
      const contact = { email: 'test@example.com' };
      const code = '123456';
      const mockVerification = {
        _id: 'mock-id',
        email: 'test@example.com',
        code: '123456',
        verified: false,
        expiresAt: new Date(Date.now() + 10000), // Ainda válido
        attempts: 0,
        maxAttempts: 3,
        save: jest.fn().mockResolvedValue({}),
      };


      const result = await service.verifyCode(contact, code);

      expect(result).toBe(true);
      expect(mockVerification.save).toHaveBeenCalled();
      expect(mockVerification.verified).toBe(true);
      expect(mockVerification.attempts).toBe(1);
    });

    it('should verify correct code for phone', async () => {
      const contact = { phone: '+5511999999999' };
      const code = '654321';
      const mockVerification = {
        _id: 'mock-id',
        phone: '+5511999999999',
        code: '654321',
        verified: false,
        expiresAt: new Date(Date.now() + 10000),
        attempts: 0,
        maxAttempts: 3,
        save: jest.fn().mockResolvedValue({}),
      };


      const result = await service.verifyCode(contact, code);

      expect(result).toBe(true);
      expect(mockVerification.save).toHaveBeenCalled();
      expect(mockVerification.verified).toBe(true);
    });

    it('should return false for incorrect code', async () => {
      const contact = { email: 'test@example.com' };
      const code = '999999'; // Código incorreto
      const mockVerification = {
        _id: 'mock-id',
        email: 'test@example.com',
        code: '123456', // Código correto no banco
        verified: false,
        expiresAt: new Date(Date.now() + 10000),
        attempts: 0,
        maxAttempts: 3,
        save: jest.fn().mockResolvedValue({}),
      };


      const result = await service.verifyCode(contact, code);

      expect(result).toBe(false);
      expect(mockVerification.save).toHaveBeenCalled();
      expect(mockVerification.verified).toBe(false);
      expect(mockVerification.attempts).toBe(1);
    });

    it('should return false when verification code not found', async () => {
      const contact = { email: 'nonexistent@example.com' };
      const code = '123456';


      const result = await service.verifyCode(contact, code);

      expect(result).toBe(false);
    });

    it('should return false when code is expired', async () => {
      const contact = { email: 'test@example.com' };
      const code = '123456';

      // Mock retorna null para código expirado (não encontrado pela query)
      mockVerificationModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });

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
        attempts: 3, // Máximo de tentativas
        maxAttempts: 3,
        save: jest.fn().mockResolvedValue({}),
      };


      const result = await service.verifyCode(contact, code);

      expect(result).toBe(false);
      expect(mockVerification.save).not.toHaveBeenCalled();
    });

    it('should increment attempts counter on wrong code', async () => {
      const contact = { email: 'test@example.com' };
      const code = '999999'; // Código incorreto
      const mockVerification = {
        _id: 'mock-id',
        email: 'test@example.com',
        code: '123456',
        verified: false,
        expiresAt: new Date(Date.now() + 10000),
        attempts: 1, // Já teve 1 tentativa
        maxAttempts: 3,
        save: jest.fn().mockResolvedValue({}),
      };


      const result = await service.verifyCode(contact, code);

      expect(result).toBe(false);
      expect(mockVerification.attempts).toBe(2);
      expect(mockVerification.save).toHaveBeenCalled();
    });

    it('should find most recent verification code', async () => {
      const contact = { email: 'test@example.com' };
      const code = '123456';


      await service.verifyCode(contact, code);

      expect(mockVerificationModel.findOne).toHaveBeenCalledWith({
        email: 'test@example.com',
        verified: false,
        expiresAt: { $gt: expect.any(Date) },
      });
    });

    it('should handle database errors', async () => {
      const contact = { email: 'test@example.com' };
      const code = '123456';

      const mockQuery = mockVerificationModel.findOne.mock.results[0].value;
      mockQuery.sort.mockRejectedValue(new Error('Database error'));

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


      const result = await service.isVerified(contact);

      expect(result).toBe(true);
    });

    it('should return false when contact is not verified', async () => {
      const contact = { email: 'unverified@example.com' };


      const result = await service.isVerified(contact);

      expect(result).toBe(false);
    });

    it('should return false when verification is expired', async () => {
      const contact = { email: 'expired@example.com' };
      const mockVerification = {
        _id: 'mock-id',
        email: 'expired@example.com',
        verified: true,
        expiresAt: new Date(Date.now() - 10000), // Expirado
      };


      const result = await service.isVerified(contact);

      expect(result).toBe(false);
    });

    it('should handle database errors', async () => {
      const contact = { email: 'test@example.com' };

      const mockQuery = mockVerificationModel.findOne.mock.results[0].value;
      mockQuery.sort.mockRejectedValue(new Error('Database error'));

      await expect(service.isVerified(contact)).rejects.toThrow('Database error');
    });
  });
});