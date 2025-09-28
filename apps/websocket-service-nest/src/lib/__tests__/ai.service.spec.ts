import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { AIService } from '../ai.service';
import AIConfig from '../../models/AIConfig';
import { IConversation } from '../../models/Conversation';
import { CaseStatus } from '../../models/User';

// Mock do @nestjs/config para evitar dependência
jest.mock('@nestjs/config', () => ({
  ConfigService: jest.fn().mockImplementation(() => ({
    get: jest.fn((key: string) => {
      if (key === 'GOOGLE_API_KEY') {
        return 'test-api-key';
      }
      return null;
    }),
  })),
}));

// Mock do ConfigService para usar nos testes
const MockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'GOOGLE_API_KEY') {
      return 'test-api-key';
    }
    return null;
  }),
};

// Mock aninhado para a SDK do Google
jest.mock('@google/generative-ai', () => {
  const mockStartChat = jest.fn().mockReturnThis();
  const mockSendMessage = jest.fn().mockResolvedValue({
    response: {
      text: () => 'Mocked AI response',
      functionCalls: () => null,
    },
  });
  const mockGetGenerativeModel = jest.fn(() => ({
    startChat: mockStartChat,
    sendMessage: mockSendMessage,
  }));

  return {
    GoogleGenerativeAI: jest.fn(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    })),
    mockGetGenerativeModel, // Expondo para referência no teste
    mockStartChat,
    mockSendMessage,
  };
});

jest.mock('../../models/AIConfig');

jest.mock('../../models/AIConfig');

const MockAIConfig = AIConfig as jest.Mocked<typeof AIConfig>;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const googleAIMocks = require('@google/generative-ai');
const { mockGetGenerativeModel, mockSendMessage } = googleAIMocks;

describe('AIService', () => {
  let service: AIService;

  const mockConversation = {
    _id: 'conv-id-123',
    roomId: 'room-abc',
    clientId: 'client-def',
    status: CaseStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as IConversation;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        {
          provide: ConfigService,
          useValue: MockConfigService,
        },
      ],
    }).compile();

    service = module.get<AIService>(AIService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateResponse', () => {
    const conversationHistory = [
      { role: 'user', parts: [{ text: 'Hello' }] },
      { role: 'model', parts: [{ text: 'Hi there!' }] },
      { role: 'user', parts: [{ text: 'How are you?' }] },
    ];

    const mockAiConfig = {
      _id: 'config-123',
      systemPrompt: 'You are a helpful assistant.',
      behaviorSettings: {
        temperature: 0.8,
        maxTokens: 2000,
      },
      classificationSettings: {
        enabled: true,
      },
    } as any;

    it('should generate a text response successfully', async () => {
      (AIConfig.findOne as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockAiConfig),
        }),
      });

      mockSendMessage.mockResolvedValue({
        response: {
          text: () => 'This is a test response.',
          functionCalls: () => null,
        },
      });

      const result = await service.generateResponse(
        conversationHistory,
        mockConversation,
      );

      expect(result).toEqual({
        type: 'text',
        content: 'This is a test response.',
      });
      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-flash-lite-latest',
          systemInstruction: mockAiConfig.systemPrompt,
        }),
      );
      expect(mockSendMessage).toHaveBeenCalledWith('How are you?');
    });

    it('should handle function calls in the response', async () => {
      MockAIConfig.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockAiConfig),
        }),
      } as any);

      const functionCall = {
        name: 'register_user',
        args: { name: 'John Doe', email: 'john.doe@example.com' },
      };
      mockSendMessage.mockResolvedValue({
        response: {
          text: () => '',
          functionCalls: () => [functionCall],
        },
      });

      const result = await service.generateResponse(
        conversationHistory,
        mockConversation,
      );

      expect(result).toEqual({
        type: 'function_call',
        calls: [
          {
            name: 'register_user',
            args: { name: 'John Doe', email: 'john.doe@example.com' },
          },
        ],
      });
    });

    it('should throw an error if database fetch fails', async () => {
      // Silenciar logs apenas neste teste que simula erro de DB
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      MockAIConfig.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('DB Error')),
        }),
      } as any);

      await expect(
        service.generateResponse(conversationHistory, mockConversation),
      ).rejects.toThrow(
        'System is currently experiencing technical difficulties. Please try again later.',
      );

      loggerSpy.mockRestore();
    });

    it('should throw an error if the API call fails', async () => {
      // Silenciar logs apenas neste teste que simula erro de API
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => {});

      MockAIConfig.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockAiConfig),
        }),
      } as any);

      mockSendMessage.mockRejectedValue(new Error('API Error'));

      await expect(
        service.generateResponse(conversationHistory, mockConversation),
      ).rejects.toThrow('Failed to generate AI response');

      loggerSpy.mockRestore();
    });

    it('should throw an error if GOOGLE_API_KEY is not configured', async () => {
      // Salvar o NODE_ENV original
      const originalNodeEnv = process.env.NODE_ENV;
      
      // Simular ambiente de produção para forçar o erro
      process.env.NODE_ENV = 'production';

      // Cria um mock do ConfigService que retorna null para GOOGLE_API_KEY
      const invalidConfigService = {
        get: jest.fn().mockReturnValue(null),
      };

      // Recria o serviço para que o construtor falhe
      await expect(
        Test.createTestingModule({
          providers: [
            AIService,
            {
              provide: ConfigService,
              useValue: invalidConfigService,
            },
          ],
        }).compile(),
      ).rejects.toThrow('GOOGLE_API_KEY is not defined in the environment');

      // Restaurar NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    });
  });
});
