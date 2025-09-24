import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { IntelligentUserRegistrationService } from '../../src/lib/intelligent-user-registration.service';
import { GeminiService } from '../../src/lib/gemini.service';
import { MessageService } from '../../src/lib/message.service';
import { AIService } from '../../src/lib/ai.service';
import { MongodbService } from '../../src/lib/mongodb.service';

// Mock do Gemini AI para simular function calls
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      startChat: jest.fn().mockReturnValue({
        sendMessage: jest.fn()
      })
    })
  }))
}));

describe('Function Calls Integration Test', () => {
  let intelligentRegistrationService: IntelligentUserRegistrationService;
  let geminiService: GeminiService;
  let messageService: MessageService;

  beforeEach(async () => {
    // Mock do AIService
    const mockAIService = {
      getCurrentConfig: jest.fn().mockReturnValue({
        systemPrompt: 'Você é um assistente jurídico brasileiro.',
        temperature: 0.7
      })
    };

    // Mock do MongodbService
    const mockMongodbService = {
      connect: jest.fn(),
      disconnect: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntelligentUserRegistrationService,
        {
          provide: GeminiService,
          useValue: {
            generateAIResponseWithFunctions: jest.fn()
          }
        },
        {
          provide: MessageService,
          useValue: {
            getMessages: jest.fn()
          }
        },
        {
          provide: AIService,
          useValue: mockAIService
        },
        {
          provide: MongodbService,
          useValue: mockMongodbService
        },
        {
          provide: getModelToken('User'),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn()
          }
        },
        {
          provide: getModelToken('Conversation'),
          useValue: {
            findByIdAndUpdate: jest.fn(),
            create: jest.fn()
          }
        }
      ],
    }).compile();

    intelligentRegistrationService = module.get<IntelligentUserRegistrationService>(IntelligentUserRegistrationService);
    geminiService = module.get<GeminiService>(GeminiService);
    messageService = module.get<MessageService>(MessageService);
  });

  describe('Intelligent User Registration with Function Calls', () => {
    it('should process user message and trigger register_user function call', async () => {
      // Mock da resposta do Gemini com function call
      const mockGeminiResponse = {
        response: 'Olá! Vou te ajudar com seu problema jurídico. Primeiro, preciso de algumas informações.',
        functionCalls: [
          {
            name: 'register_user' as const,
            parameters: {
              name: 'João Silva',
              email: 'joao.silva@email.com',
              phone: '+5511999999999',
              problem_description: 'Preciso de ajuda com um contrato de trabalho',
              urgency_level: 'high' as const
            }
          }
        ]
      };

      // Mock do método generateAIResponseWithFunctions
      jest.spyOn(geminiService, 'generateAIResponseWithFunctions')
        .mockResolvedValue(mockGeminiResponse);

      // Mock do MessageService
      jest.spyOn(messageService, 'getMessages')
        .mockResolvedValue([]);

      // Mock do modelo do usuário
      const mockUserModel = {
        findOne: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockResolvedValue({
          _id: 'user-id-123',
          name: 'João Silva',
          email: 'joao.silva@email.com'
        })
      };

      // Mock do modelo de conversa
      const mockConversationModel = {
        findByIdAndUpdate: jest.fn().mockResolvedValue({
          _id: 'conversation-id-123',
          status: 'collecting_data'
        })
      };

      // Substituir os modelos nos serviços
      (intelligentRegistrationService as any).userModel = mockUserModel;
      (intelligentRegistrationService as any).conversationModel = mockConversationModel;

      // Executar o teste
      const result = await intelligentRegistrationService.processUserMessage(
        'Olá, preciso de ajuda jurídica urgente com um contrato de trabalho',
        'conversation-id-123'
      );

      // Verificações
      expect(result.response).toBe('Olá! Vou te ajudar com seu problema jurídico. Primeiro, preciso de algumas informações.');
      expect(result.userRegistered).toBe(true);
      expect(result.statusUpdated).toBe(false);

      // Verificar se o usuário foi criado
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: 'joao.silva@email.com' });
      expect(mockUserModel.save).toHaveBeenCalled();

      // Verificar se a conversa foi atualizada
      expect(mockConversationModel.findByIdAndUpdate).toHaveBeenCalledWith('conversation-id-123', {
        userId: 'user-id-123',
        status: 'collecting_data',
        clientInfo: {
          name: 'João Silva',
          email: 'joao.silva@email.com',
          phone: '+5511999999999'
        },
        priority: 'high'
      });
    });

    it('should process user message and trigger update_conversation_status function call', async () => {
      // Mock da resposta do Gemini com function call de atualização de status
      const mockGeminiResponse = {
        response: 'Analisei seu caso e acredito que você precisa de um advogado especializado em direito trabalhista.',
        functionCalls: [
          {
            name: 'update_conversation_status' as const,
            parameters: {
              status: 'connecting_lawyer' as const,
              lawyer_needed: true,
              specialization_required: 'Direito Trabalhista',
              notes: 'Caso complexo envolvendo contrato de trabalho e direitos trabalhistas'
            }
          }
        ]
      };

      // Mock do método generateAIResponseWithFunctions
      jest.spyOn(geminiService, 'generateAIResponseWithFunctions')
        .mockResolvedValue(mockGeminiResponse);

      // Mock do MessageService
      jest.spyOn(messageService, 'getMessages')
        .mockResolvedValue([]);

      // Mock do modelo de conversa
      const mockConversationModel = {
        findByIdAndUpdate: jest.fn().mockResolvedValue({
          _id: 'conversation-id-123',
          status: 'connecting_lawyer'
        })
      };

      // Substituir o modelo nos serviços
      (intelligentRegistrationService as any).conversationModel = mockConversationModel;

      // Executar o teste
      const result = await intelligentRegistrationService.processUserMessage(
        'Meu chefe não quer pagar minhas férias e décimo terceiro',
        'conversation-id-123'
      );

      // Verificações
      expect(result.response).toBe('Analisei seu caso e acredito que você precisa de um advogado especializado em direito trabalhista.');
      expect(result.userRegistered).toBe(false);
      expect(result.statusUpdated).toBe(true);
      expect(result.newStatus).toBe('connecting_lawyer');
      expect(result.lawyerNeeded).toBe(true);
      expect(result.specializationRequired).toBe('Direito Trabalhista');

      // Verificar se a conversa foi atualizada com os dados corretos
      expect(mockConversationModel.findByIdAndUpdate).toHaveBeenCalledWith('conversation-id-123', {
        status: 'connecting_lawyer',
        lawyerNeeded: true,
        lastUpdated: expect.any(Date),
        classification: {
          legalArea: 'Direito Trabalhista'
        },
        summary: {
          text: 'Caso complexo envolvendo contrato de trabalho e direitos trabalhistas',
          lastUpdated: expect.any(Date),
          generatedBy: 'ai'
        }
      });
    });

    it('should handle multiple function calls in sequence', async () => {
      // Primeiro mock: register_user
      const mockGeminiResponse1 = {
        response: 'Olá! Vou te ajudar. Primeiro preciso registrar suas informações.',
        functionCalls: [
          {
            name: 'register_user' as const,
            parameters: {
              name: 'Maria Santos',
              email: 'maria.santos@email.com',
              phone: '+5511988888888',
              problem_description: 'Divórcio litigioso',
              urgency_level: 'urgent' as const
            }
          }
        ]
      };

      // Segundo mock: update_conversation_status
      const mockGeminiResponse2 = {
        response: 'Seu caso é urgente e complexo. Vou conectar você com um advogado especialista.',
        functionCalls: [
          {
            name: 'update_conversation_status' as const,
            parameters: {
              status: 'connecting_lawyer' as const,
              lawyer_needed: true,
              specialization_required: 'Direito de Família',
              notes: 'Divórcio litigioso com urgência'
            }
          }
        ]
      };

      // Mock do método generateAIResponseWithFunctions com respostas sequenciais
      let callCount = 0;
      jest.spyOn(geminiService, 'generateAIResponseWithFunctions')
        .mockImplementation(() => {
          callCount++;
          return Promise.resolve(callCount === 1 ? mockGeminiResponse1 : mockGeminiResponse2);
        });

      // Mocks dos serviços
      jest.spyOn(messageService, 'getMessages')
        .mockResolvedValue([]);

      const mockUserModel = {
        findOne: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockResolvedValue({
          _id: 'user-id-456',
          name: 'Maria Santos',
          email: 'maria.santos@email.com'
        })
      };

      const mockConversationModel = {
        findByIdAndUpdate: jest.fn().mockResolvedValue({})
      };

      (intelligentRegistrationService as any).userModel = mockUserModel;
      (intelligentRegistrationService as any).conversationModel = mockConversationModel;

      // Primeira mensagem - deve registrar usuário
      const result1 = await intelligentRegistrationService.processUserMessage(
        'Olá, estou em um divórcio urgente e preciso de ajuda jurídica',
        'conversation-id-456'
      );

      expect(result1.userRegistered).toBe(true);
      expect(result1.statusUpdated).toBe(false);

      // Segunda mensagem - deve atualizar status
      const result2 = await intelligentRegistrationService.processUserMessage(
        'Meu ex-marido está dificultando o processo',
        'conversation-id-456'
      );

      expect(result2.userRegistered).toBe(false);
      expect(result2.statusUpdated).toBe(true);
      expect(result2.lawyerNeeded).toBe(true);
      expect(result2.specializationRequired).toBe('Direito de Família');

      // Verificar se ambos os métodos foram chamados
      expect(mockUserModel.save).toHaveBeenCalledTimes(1);
      expect(mockConversationModel.findByIdAndUpdate).toHaveBeenCalledTimes(2);
    });

    it('should handle fallback when function calls fail', async () => {
      // Mock de erro na API do Gemini
      jest.spyOn(geminiService, 'generateAIResponseWithFunctions')
        .mockRejectedValue(new Error('API Error'));

      // Mock do fallback
      jest.spyOn(geminiService, 'generateAIResponse')
        .mockResolvedValue('Desculpe, houve um problema. Como posso te ajudar?');

      jest.spyOn(messageService, 'getMessages')
        .mockResolvedValue([]);

      const result = await intelligentRegistrationService.processUserMessage(
        'Olá, preciso de ajuda',
        'conversation-id-fallback'
      );

      // Verificar fallback
      expect(result.response).toBe('Desculpe, houve um problema. Como posso te ajudar?');
      expect(result.userRegistered).toBeUndefined();
      expect(result.statusUpdated).toBeUndefined();

      // Verificar se o fallback foi chamado
      expect(geminiService.generateAIResponse).toHaveBeenCalledWith([
        { text: 'Olá, preciso de ajuda', sender: 'user' }
      ]);
    });
  });
});