import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from '../chat.gateway';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { GeminiService } from '../../lib/gemini.service';
import { AIService } from '../../lib/ai.service';
import { MessageService } from '../../lib/message.service';
import { IntelligentUserRegistrationService } from '../../lib/intelligent-user-registration.service';
import { FluidRegistrationService } from '../../lib/fluid-registration.service';
import { VerificationService } from '../../lib/verification.service';
import { BillingService } from '../../lib/billing.service';

// Mock do mongoose
jest.doMock('mongoose', () => ({
  connect: jest.fn(),
  connection: {
    readyState: 1,
  },
  Schema: function () {
    this.Types = {
      ObjectId: jest.fn(),
    };
    this.pre = jest.fn();
    this.post = jest.fn();
  },
  model: jest.fn(),
  Types: {
    ObjectId: jest.fn(),
  },
}));

// Mock dos modelos
jest.mock('../../models/Conversation', () => ({
  findOne: jest.fn(),
}));

describe('ChatGateway - WebSocket Authentication', () => {
  let gateway: ChatGateway;
  let jwtService: JwtService;
  let mockSocket: any;

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockDisconnect = jest.fn();
  const mockEmit = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockSocket = {
      id: 'test-socket-id',
      data: {},
      disconnect: mockDisconnect,
      emit: mockEmit,
      handshake: {
        auth: {},
        headers: {},
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        // Mocks para outros serviços necessários
        {
          provide: GeminiService,
          useValue: {
            generateAIResponse: jest.fn(),
          },
        },
        {
          provide: AIService,
          useValue: {
            classifyConversation: jest.fn(),
          },
        },
        {
          provide: MessageService,
          useValue: {
            createMessage: jest.fn(),
            getMessages: jest.fn(),
          },
        },
        {
          provide: IntelligentUserRegistrationService,
          useValue: {},
        },
        {
          provide: FluidRegistrationService,
          useValue: {},
        },
        {
          provide: VerificationService,
          useValue: {},
        },
        {
          provide: BillingService,
          useValue: {},
        },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('handleConnection - Token Authentication', () => {
    it('should accept valid JWT token from handshake auth', async () => {
      const validToken = 'valid.jwt.token';
      const decodedPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'client',
        permissions: ['access_own_chat'],
        isAnonymous: false,
        iat: 1234567890,
        exp: 1234567890 + 3600,
      };

      mockSocket.handshake!.auth = { token: validToken };
      mockJwtService.verify.mockReturnValue(decodedPayload);

      await gateway.handleConnection(mockSocket as Socket);

      expect(mockJwtService.verify).toHaveBeenCalledWith(validToken, {
        secret: expect.any(String),
      });
      expect(mockSocket.data.user).toEqual(decodedPayload);
      expect(mockSocket.data.userId).toBe('user123');
      expect(mockSocket.data.isAuthenticated).toBe(true);
      expect(mockSocket.data.isAnonymous).toBe(false);
      expect(mockDisconnect).not.toHaveBeenCalled();
    });

    it('should accept valid JWT token from next-auth.session-token cookie', async () => {
      const validToken = 'valid.jwt.token';
      const decodedPayload = {
        userId: 'anon_123',
        email: 'anon@example.com',
        role: 'client',
        permissions: ['access_own_chat'],
        isAnonymous: true,
        iat: 1234567890,
        exp: 1234567890 + 3600,
      };

      const cookies = `next-auth.session-token=${validToken}; other=value`;
      mockSocket.handshake!.headers = { cookie: cookies };
      mockJwtService.verify.mockReturnValue(decodedPayload);

      await gateway.handleConnection(mockSocket as Socket);

      expect(mockJwtService.verify).toHaveBeenCalledWith(validToken, {
        secret: expect.any(String),
      });
      expect(mockSocket.data.user).toEqual(decodedPayload);
      expect(mockSocket.data.userId).toBe('anon_123');
      expect(mockSocket.data.isAuthenticated).toBe(false); // Usuários anônimos não são "autenticados"
      expect(mockSocket.data.isAnonymous).toBe(true);
      expect(mockDisconnect).not.toHaveBeenCalled();
    });

    it('should accept valid JWT token from Authorization header', async () => {
      const validToken = 'valid.jwt.token';
      const decodedPayload = {
        userId: 'user456',
        email: 'user@example.com',
        role: 'client',
        permissions: ['access_own_chat'],
        isAnonymous: false,
        iat: 1234567890,
        exp: 1234567890 + 3600,
      };

      mockSocket.handshake!.headers = {
        authorization: `Bearer ${validToken}`,
      };
      mockJwtService.verify.mockReturnValue(decodedPayload);

      await gateway.handleConnection(mockSocket as Socket);

      expect(mockJwtService.verify).toHaveBeenCalledWith(validToken, {
        secret: expect.any(String),
      });
      expect(mockSocket.data.userId).toBe('user456');
      expect(mockSocket.data.isAuthenticated).toBe(true);
      expect(mockDisconnect).not.toHaveBeenCalled();
    });

    it('should reject invalid JWT token', async () => {
      const invalidToken = 'invalid.jwt.token';
      mockSocket.handshake!.auth = { token: invalidToken };
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await gateway.handleConnection(mockSocket as Socket);

      expect(mockJwtService.verify).toHaveBeenCalledWith(invalidToken, {
        secret: expect.any(String),
      });
      expect(mockSocket.data.isAuthenticated).toBe(false);
      expect(mockSocket.data.user).toBeNull();
      expect(mockSocket.data.userId).toBe('');

      // Executar timers para que o setTimeout seja chamado
      jest.runAllTimers();

      expect(mockDisconnect).toHaveBeenCalledWith(true);
    });

    it('should reject connection without any token', async () => {
      // Nenhum token fornecido
      mockSocket.handshake!.auth = {};
      mockSocket.handshake!.headers = {};

      await gateway.handleConnection(mockSocket as Socket);

      expect(mockJwtService.verify).not.toHaveBeenCalled();
      expect(mockSocket.data.isAuthenticated).toBe(false);
      expect(mockSocket.data.user).toBeNull();
      expect(mockSocket.data.userId).toBe('');

      // Executar timers para que o setTimeout seja chamado
      jest.runAllTimers();

      expect(mockDisconnect).toHaveBeenCalledWith(true);
    });

    it('should handle malformed cookies gracefully', async () => {
      const malformedCookies = 'invalid-cookie-format';
      mockSocket.handshake!.headers = { cookie: malformedCookies };

      await gateway.handleConnection(mockSocket as Socket);

      expect(mockJwtService.verify).not.toHaveBeenCalled();
      expect(mockSocket.data.isAuthenticated).toBe(false);

      // Executar timers para que o setTimeout seja chamado
      jest.runAllTimers();

      expect(mockDisconnect).toHaveBeenCalledWith(true);
    });

    it('should prioritize handshake auth over cookies', async () => {
      const handshakeToken = 'handshake.token';
      const cookieToken = 'cookie.token';
      const decodedPayload = {
        userId: 'user789',
        email: 'user@example.com',
        role: 'client',
        permissions: ['access_own_chat'],
        isAnonymous: false,
      };

      const cookies = `next-auth.session-token=${cookieToken}`;
      mockSocket.handshake!.auth = { token: handshakeToken };
      mockSocket.handshake!.headers = { cookie: cookies };
      mockJwtService.verify.mockReturnValue(decodedPayload);

      await gateway.handleConnection(mockSocket as Socket);

      expect(mockJwtService.verify).toHaveBeenCalledWith(handshakeToken, {
        secret: expect.any(String),
      });
      expect(mockJwtService.verify).not.toHaveBeenCalledWith(cookieToken, {
        secret: expect.any(String),
      });
    });

    it('should handle URL-encoded cookies correctly', async () => {
      const encodedToken = 'encoded%2Btoken%3Dvalue';
      const decodedToken = 'encoded+token=value';
      const decodedPayload = {
        userId: 'user999',
        email: 'user@example.com',
        role: 'client',
        permissions: ['access_own_chat'],
        isAnonymous: false,
      };

      const cookies = `next-auth.session-token=${encodedToken}`;
      mockSocket.handshake!.headers = { cookie: cookies };
      mockJwtService.verify.mockReturnValue(decodedPayload);

      await gateway.handleConnection(mockSocket as Socket);

      expect(mockJwtService.verify).toHaveBeenCalledWith(decodedToken, {
        secret: expect.any(String),
      });
    });
  });

  describe('parseCookie', () => {
    it('should parse cookie correctly', () => {
      const cookies =
        'name1=value1; next-auth.session-token=jwt.token.here; name2=value2';
      const result = (gateway as any).parseCookie(
        cookies,
        'next-auth.session-token',
      );
      expect(result).toBe('jwt.token.here');
    });

    it('should return undefined for non-existent cookie', () => {
      const cookies = 'name1=value1; name2=value2';
      const result = (gateway as any).parseCookie(
        cookies,
        'next-auth.session-token',
      );
      expect(result).toBeUndefined();
    });

    it('should handle empty cookie string', () => {
      const cookies = '';
      const result = (gateway as any).parseCookie(
        cookies,
        'next-auth.session-token',
      );
      expect(result).toBeUndefined();
    });
  });
});
