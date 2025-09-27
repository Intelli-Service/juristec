import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from '../encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    // Mock console.warn to avoid test output pollution
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [EncryptionService],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  afterEach(() => {
    // Restore console.warn after each test
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encrypt', () => {
    it('should encrypt data successfully', () => {
      const data = 'sensitive data';
      const encrypted = service.encrypt(data);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted.split(':')).toHaveLength(3); // iv:authTag:encryptedData
    });

    it('should encrypt different data differently', () => {
      const data1 = 'data1';
      const data2 = 'data2';

      const encrypted1 = service.encrypt(data1);
      const encrypted2 = service.encrypt(data2);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty string', () => {
      const data = '';
      const encrypted = service.encrypt(data);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should handle special characters', () => {
      const data = 'special chars: !@#$%^&*()_+{}|:<>?[]\\;\'",./';
      const encrypted = service.encrypt(data);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });
  });

  describe('decrypt', () => {
    it('should decrypt data successfully', () => {
      const originalData = 'sensitive information';
      const encrypted = service.encrypt(originalData);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(originalData);
    });

    it('should handle empty string', () => {
      const originalData = '';
      const encrypted = service.encrypt(originalData);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(originalData);
    });

    it('should handle special characters', () => {
      const originalData = 'special chars: !@#$%^&*()_+{}|:<>?[]\\;\'",./';
      const encrypted = service.encrypt(originalData);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(originalData);
    });

    it('should throw error for invalid format', () => {
      const invalidData = 'invalid-format';

      expect(() => service.decrypt(invalidData)).toThrow(
        'Formato de dados criptografados inválido',
      );
    });

    it('should throw error for corrupted data', () => {
      const encrypted = service.encrypt('test');
      const corrupted = encrypted.replace(/.$/, 'x'); // Corrupt last character

      expect(() => service.decrypt(corrupted)).toThrow(
        'Erro ao descriptografar dados',
      );
    });
  });

  describe('encrypt and decrypt roundtrip', () => {
    it('should maintain data integrity through encrypt/decrypt cycle', () => {
      const testCases = [
        'simple text',
        'text with numbers 123456',
        'text with special chars !@#$%^&*()',
        'multiline\ntext\nhere',
        'very long text '.repeat(100),
        JSON.stringify({ key: 'value', number: 42, array: [1, 2, 3] }),
      ];

      testCases.forEach((testData) => {
        const encrypted = service.encrypt(testData);
        const decrypted = service.decrypt(encrypted);
        expect(decrypted).toBe(testData);
      });
    });
  });

  describe('hash', () => {
    it('should generate hash successfully', () => {
      const data = 'password123';
      const hashed = service.hash(data);

      expect(hashed).toBeDefined();
      expect(typeof hashed).toBe('string');
      expect(hashed.length).toBe(64); // SHA256 produces 64 character hex string
      expect(hashed).toMatch(/^[a-f0-9]+$/); // Should be hex
    });

    it('should generate same hash for same input', () => {
      const data = 'same input';
      const hash1 = service.hash(data);
      const hash2 = service.hash(data);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = service.hash('input1');
      const hash2 = service.hash('input2');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hashed = service.hash('');
      expect(hashed).toBeDefined();
      expect(typeof hashed).toBe('string');
    });
  });

  describe('generateSecureToken', () => {
    it('should generate secure token with default length', () => {
      const token = service.generateSecureToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes * 2 hex chars per byte
      expect(token).toMatch(/^[a-f0-9]+$/); // Should be hex
    });

    it('should generate token with custom length', () => {
      const length = 16;
      const token = service.generateSecureToken(length);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(length * 2); // length bytes * 2 hex chars per byte
      expect(token).toMatch(/^[a-f0-9]+$/); // Should be hex
    });

    it('should generate unique tokens', () => {
      const token1 = service.generateSecureToken();
      const token2 = service.generateSecureToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('encryptPersonalData', () => {
    it('should encrypt sensitive fields', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        cpf: '12345678901',
        address: '123 Main St',
        bankAccount: '123456789',
        nonSensitive: 'this stays plain',
      };

      const encrypted = service.encryptPersonalData(data);

      expect(encrypted.name).toBe('John Doe'); // Not sensitive
      expect(encrypted.email).not.toBe('john@example.com'); // Should be encrypted
      expect(encrypted.phone).not.toBe('+1234567890'); // Should be encrypted
      expect(encrypted.cpf).not.toBe('12345678901'); // Should be encrypted
      expect(encrypted.address).not.toBe('123 Main St'); // Should be encrypted
      expect(encrypted.bankAccount).not.toBe('123456789'); // Should be encrypted
      expect(encrypted.nonSensitive).toBe('this stays plain'); // Not sensitive

      // Check encryption flags
      expect(encrypted.email_encrypted).toBe(true);
      expect(encrypted.phone_encrypted).toBe(true);
      expect(encrypted.cpf_encrypted).toBe(true);
      expect(encrypted.address_encrypted).toBe(true);
      expect(encrypted.bankAccount_encrypted).toBe(true);
    });

    it('should handle data without sensitive fields', () => {
      const data = {
        name: 'John Doe',
        age: 30,
        city: 'New York',
      };

      const encrypted = service.encryptPersonalData(data);

      expect(encrypted).toEqual(data); // Should remain unchanged
    });

    it('should handle empty object', () => {
      const data = {};
      const encrypted = service.encryptPersonalData(data);

      expect(encrypted).toEqual({});
    });
  });

  describe('decryptPersonalData', () => {
    it('should decrypt sensitive fields', () => {
      const originalData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        nonSensitive: 'this stays plain',
      };

      const encrypted = service.encryptPersonalData(originalData);
      const decrypted = service.decryptPersonalData(encrypted);

      expect(decrypted).toEqual(originalData);
    });

    it('should handle data without encrypted fields', () => {
      const data = {
        name: 'John Doe',
        age: 30,
        city: 'New York',
      };

      const decrypted = service.decryptPersonalData(data);

      expect(decrypted).toEqual(data); // Should remain unchanged
    });

    it('should handle empty object', () => {
      const data = {};
      const decrypted = service.decryptPersonalData(data);

      expect(decrypted).toEqual({});
    });

    it('should handle mixed encrypted and plain data', () => {
      // First encrypt the email
      const encryptedEmail = service.encrypt('john@example.com');

      const data = {
        name: 'John Doe',
        email: encryptedEmail, // Encrypted
        email_encrypted: true,
        phone: '+1234567890', // Not encrypted
        age: 30,
      };

      const decrypted = service.decryptPersonalData(data);

      expect(decrypted.name).toBe('John Doe');
      expect(decrypted.email).toBe('john@example.com'); // Should be decrypted
      expect(decrypted.phone).toBe('+1234567890'); // Should remain as is
      expect(decrypted.age).toBe(30);
      expect(decrypted.email_encrypted).toBeUndefined(); // Flag should be removed
    });
  });

  describe('encryptPersonalData and decryptPersonalData roundtrip', () => {
    it('should maintain data integrity through encrypt/decrypt cycle', () => {
      const testCases = [
        {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          cpf: '12345678901',
          address: '123 Main St',
          bankAccount: '123456789',
          creditCard: '4111111111111111',
          nonSensitive: 'this stays plain',
          age: 30,
          city: 'New York',
        },
        {
          email: 'test@example.com',
          socialSecurity: '123-45-6789',
        },
        {
          name: 'Only non-sensitive data',
          age: 25,
          city: 'Boston',
        },
      ];

      testCases.forEach((testData) => {
        const encrypted = service.encryptPersonalData(testData);
        const decrypted = service.decryptPersonalData(encrypted);
        expect(decrypted).toEqual(testData);
      });
    });
  });
});
