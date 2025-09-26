import { Test, TestingModule } from '@nestjs/testing';
import { AIService } from '../ai.service';
import { UserDataCollectionService } from '../user-data-collection.service';

describe('UserDataCollectionService', () => {
  let service: UserDataCollectionService;
  let aiService: AIService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserDataCollectionService,
        {
          provide: AIService,
          useValue: {
            generateResponse: jest.fn(),
            updateUserData: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserDataCollectionService>(UserDataCollectionService);
    aiService = module.get<AIService>(AIService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractContactInfo', () => {
    it('should extract email from message', () => {
      const message = 'Meu email é usuario@email.com';
      const result = service.extractContactInfo(message);

      expect(result.email).toBe('usuario@email.com');
      expect(result.phone).toBeNull();
    });

    it('should extract phone number from message', () => {
      const message = 'Meu WhatsApp é (11) 99999-9999';
      const result = service.extractContactInfo(message);

      expect(result.phone).toBe('(11) 99999-9999');
      expect(result.email).toBeNull();
    });

    it('should extract both email and phone', () => {
      const message = 'Email: teste@email.com e WhatsApp: 11999999999';
      const result = service.extractContactInfo(message);

      expect(result.email).toBe('teste@email.com');
      expect(result.phone).toBe('11999999999');
    });

    it('should return null when no contact info found', () => {
      const message = 'Olá, preciso de ajuda jurídica';
      const result = service.extractContactInfo(message);

      expect(result.email).toBeNull();
      expect(result.phone).toBeNull();
    });
  });

  describe('shouldCollectContactInfo', () => {
    it('should return true when user has no contact info and conversation is progressing', () => {
      const userData = { email: null, phone: null };
      const messageCount = 3;

      const result = service.shouldCollectContactInfo(userData, messageCount);

      expect(result).toBe(true);
    });

    it('should return false when user already has contact info', () => {
      const userData = { email: 'teste@email.com', phone: null };
      const messageCount = 1;

      const result = service.shouldCollectContactInfo(userData, messageCount);

      expect(result).toBe(false);
    });

    it('should return false when conversation is too short', () => {
      const userData = { email: null, phone: null };
      const messageCount = 1;

      const result = service.shouldCollectContactInfo(userData, messageCount);

      expect(result).toBe(false);
    });
  });

  describe('generateContactRequest', () => {
    it('should generate appropriate contact request message', () => {
      const result = service.generateContactRequest();

      expect(result).toContain('ajudar');
      expect(result).toContain('email');
      expect(result).toContain('WhatsApp');
      expect(result).toContain('histórico');
      expect(typeof result).toBe('string');
    });
  });
});
