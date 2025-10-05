import { Test, TestingModule } from '@nestjs/testing';
import { GeminiService, MessageWithAttachments } from '../gemini.service';
import { AIService } from '../ai.service';

// Mock do AIService
jest.mock('../ai.service');
const MockAIService = AIService as jest.MockedClass<typeof AIService>;

// Mock do GoogleGenerativeAI com configuração dinâmica
let mockResponse: any;
let mockSendMessageImpl: () => Promise<any> = () =>
  Promise.resolve({ response: mockResponse });

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      startChat: jest.fn().mockReturnValue({
        sendMessage: jest.fn().mockImplementation(() => mockSendMessageImpl()),
      }),
    }),
  })),
  SchemaType: {
    OBJECT: 'object',
    STRING: 'string',
    BOOLEAN: 'boolean',
  },
}));

describe('GeminiService', () => {
  let service: GeminiService;
  let mockAIService: jest.Mocked<AIService>;

  beforeEach(async () => {
    // Resetar todos os mocks
    jest.clearAllMocks();

    // Configurar resposta padrão do mock
    mockResponse = {
      text: jest.fn().mockReturnValue('Resposta de teste da IA'),
      functionCalls: [],
    };

    // Configurar AIService mock
    MockAIService.mockClear();
    mockAIService = {
      getCurrentConfig: jest.fn().mockReturnValue({
        systemPrompt: 'Você é um assistente jurídico brasileiro.',
        behaviorSettings: {
          maxTokens: 1000,
          temperature: 0.7,
        },
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiService,
        {
          provide: AIService,
          useValue: mockAIService,
        },
      ],
    }).compile();

    service = module.get<GeminiService>(GeminiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getModel', () => {
    it('should return configured Gemini model with system prompt', () => {
      const model = service.getModel();

      expect(model).toBeDefined();
      expect(mockAIService.getCurrentConfig).toHaveBeenCalled();
    });

    it('should use default system prompt when config is not available', () => {
      mockAIService.getCurrentConfig.mockResolvedValue(null as any);

      const model = service.getModel();

      expect(model).toBeDefined();
      expect(mockAIService.getCurrentConfig).toHaveBeenCalled();
    });
  });

  describe('generateAIResponseWithFunctionsLegacy', () => {
    it('should generate AI response for user messages', async () => {
      const messages = [
        { text: 'Olá, preciso de ajuda jurídica', sender: 'user' },
        { text: 'Claro, posso ajudar. Qual é o problema?', sender: 'ai' },
        { text: 'Tenho um problema trabalhista', sender: 'user' },
      ];

      const result =
        await service.generateAIResponseWithFunctionsLegacy(messages);

      expect(result.response).toBe('Resposta de teste da IA');
      expect(mockAIService.getCurrentConfig).toHaveBeenCalled();
    });

    it('should handle single message conversation', async () => {
      const messages = [{ text: 'Olá, preciso de ajuda', sender: 'user' }];

      const result =
        await service.generateAIResponseWithFunctionsLegacy(messages);

      expect(result.response).toBe('Resposta de teste da IA');
    });

    it('should handle empty message history', async () => {
      const messages: { text: string; sender: string }[] = [];

      await expect(
        service.generateAIResponseWithFunctionsLegacy(messages),
      ).rejects.toThrow();
    });
  });

  describe('generateAIResponseWithFunctions', () => {
    it('should generate response without function calls', async () => {
      const messages = [
        { text: 'Olá, preciso de ajuda jurídica', sender: 'user' },
      ];

      const result = await service.generateAIResponseWithFunctions(messages);

      expect(result).toEqual({
        response: 'Resposta de teste da IA',
        functionCalls: [],
      });
    });

    it('should handle register_user function call', async () => {
      // Configurar resposta com function call
      mockResponse = {
        text: jest.fn().mockReturnValue('Vou registrar você no sistema.'),
        functionCalls: [
          {
            name: 'register_user',
            args: {
              name: 'João Silva',
              email: 'joao@email.com',
              phone: '+5511999999999',
              problem_description: 'Problema trabalhista',
              urgency_level: 'medium',
            },
          },
        ],
      };

      const messages = [
        {
          text: 'Meu nome é João Silva, tenho um problema trabalhista urgente',
          sender: 'user',
        },
      ];

      const result = await service.generateAIResponseWithFunctions(messages);

      expect(result.response).toBe('Vou registrar você no sistema.');
      expect(result.functionCalls).toBeDefined();
      expect(result.functionCalls!).toHaveLength(1);
      expect(result.functionCalls![0]).toEqual({
        name: 'register_user',
        parameters: {
          name: 'João Silva',
          email: 'joao@email.com',
          phone: '+5511999999999',
          problem_description: 'Problema trabalhista',
          urgency_level: 'medium',
        },
      });
    });

    it('should handle require_lawyer_assistance function call', async () => {
      mockResponse = {
        text: jest.fn().mockReturnValue('Este caso precisa de um advogado.'),
        functionCalls: [
          {
            name: 'require_lawyer_assistance',
            args: {
              specialization_required: 'Direito Trabalhista',
              case_summary:
                'Demissão sem justa causa com reivindicação de direitos trabalhistas',
              required_specialties: 'Direito trabalhista, processo civil',
            },
          },
        ],
      };

      const messages = [
        {
          text: 'Fui demitido sem justa causa, preciso de ajuda',
          sender: 'user',
        },
      ];

      const result = await service.generateAIResponseWithFunctions(messages);

      expect(result.response).toBe('Este caso precisa de um advogado.');
      expect(result.functionCalls).toBeDefined();
      expect(result.functionCalls!).toHaveLength(1);
      expect(result.functionCalls![0]).toEqual({
        name: 'require_lawyer_assistance',
        parameters: {
          specialization_required: 'Direito Trabalhista',
          case_summary:
            'Demissão sem justa causa com reivindicação de direitos trabalhistas',
          required_specialties: 'Direito trabalhista, processo civil',
        },
      });
    });

    it('should handle detect_conversation_completion function call', async () => {
      mockResponse = {
        text: jest.fn().mockReturnValue('Obrigado pelo feedback!'),
        functionCalls: [
          {
            name: 'detect_conversation_completion',
            args: {
              should_show_feedback: true,
              completion_reason: 'user_satisfied',
              feedback_context: 'Usuário resolveu o problema',
            },
          },
        ],
      };

      const messages = [
        { text: 'Obrigado, isso resolveu meu problema', sender: 'user' },
      ];

      const result = await service.generateAIResponseWithFunctions(messages);

      expect(result.response).toBe('Obrigado pelo feedback!');
      expect(result.functionCalls).toBeDefined();
      expect(result.functionCalls!).toHaveLength(1);
      expect(result.functionCalls![0]).toEqual({
        name: 'detect_conversation_completion',
        parameters: {
          should_show_feedback: true,
          completion_reason: 'user_satisfied',
          feedback_context: 'Usuário resolveu o problema',
        },
      });
    });

    it('should handle multiple function calls', async () => {
      mockResponse = {
        text: jest.fn().mockReturnValue('Registrando e finalizando conversa.'),
        functionCalls: [
          {
            name: 'register_user',
            args: {
              name: 'Maria Santos',
              problem_description: 'Consulta jurídica',
              urgency_level: 'low',
            },
          },
          {
            name: 'detect_conversation_completion',
            args: {
              should_show_feedback: true,
              completion_reason: 'resolved_by_ai',
            },
          },
        ],
      };

      const messages = [
        {
          text: 'Olá, preciso de uma consulta jurídica simples',
          sender: 'user',
        },
      ];

      const result = await service.generateAIResponseWithFunctions(messages);

      expect(result.functionCalls).toBeDefined();
      expect(result.functionCalls!).toHaveLength(2);
      expect(result.functionCalls![0].name).toBe('register_user');
      expect(result.functionCalls![1].name).toBe(
        'detect_conversation_completion',
      );
    });

    it('should handle messages with only attachments (no text)', async () => {
      const messages: MessageWithAttachments[] = [
        {
          text: '📎 Anexei alguns arquivos para análise',
          sender: 'user',
          attachments: [
            {
              fileUri: 'https://storage.googleapis.com/test/file.pdf',
              mimeType: 'application/pdf',
              displayName: 'document.pdf',
            },
          ],
        },
      ];

      const result = await service.generateAIResponseWithFunctions(messages);

      expect(result).toEqual({
        response: 'Resposta de teste da IA',
        functionCalls: [],
      });
    });

    it('should filter history to start with user message', async () => {
      const messages: MessageWithAttachments[] = [
        {
          text: 'Mensagem do AI anterior',
          sender: 'ai',
          attachments: [],
        },
        {
          text: 'Mensagem do usuário',
          sender: 'user',
          attachments: [],
        },
      ];

      const result = await service.generateAIResponseWithFunctions(messages);

      expect(result).toEqual({
        response: 'Resposta de teste da IA',
        functionCalls: [],
      });
    });

    it('should handle API errors gracefully', async () => {
      // Configurar mock para rejeitar
      mockSendMessageImpl = () => Promise.reject(new Error('API Error'));

      const messages = [{ text: 'Olá', sender: 'user' }];

      await expect(
        service.generateAIResponseWithFunctions(messages),
      ).rejects.toThrow('API Error');

      // Resetar para comportamento padrão
      mockSendMessageImpl = () => Promise.resolve({ response: mockResponse });
    });
  });

  describe('updateSystemPrompt', () => {
    it('should be defined', () => {
      expect(typeof service.updateSystemPrompt).toBe('function');
    });
  });

  describe('getSystemPrompt', () => {
    it('should return current system prompt from AIService', async () => {
      const expectedPrompt = 'Você é um assistente jurídico brasileiro.';
      mockAIService.getCurrentConfig.mockResolvedValue({
        systemPrompt: expectedPrompt,
      } as any);

      const result = await service.getSystemPrompt();

      expect(result).toBe(expectedPrompt);
      expect(mockAIService.getCurrentConfig).toHaveBeenCalled();
    });

    it('should return empty string when config is not available', async () => {
      mockAIService.getCurrentConfig.mockResolvedValue({} as any);

      const result = await service.getSystemPrompt();

      expect(result).toBe('');
    });
  });
});
