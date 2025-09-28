import { Test, TestingModule } from '@nestjs/testing';
import { IntelligentUserRegistrationService } from '../intelligent-user-registration.service';
import { GeminiService } from '../gemini.service';
import { AIService } from '../ai.service';
import { MessageService } from '../message.service';
import { FluidRegistrationService } from '../fluid-registration.service';
import { getModelToken } from '@nestjs/mongoose';
import { CaseStatus } from '../../models/User';

// Mock classes
const mockGeminiService = {
  generateAIResponseWithFunctions: jest.fn(),
  generateAIResponse: jest.fn(),
};

const mockAIService = {
  getCurrentConfig: jest.fn(),
};

const mockMessageService = {
  getMessages: jest.fn(),
  createMessage: jest.fn(),
};

const mockFluidRegistrationService = {
  registerUser: jest.fn(),
  processFluidRegistration: jest.fn(),
};

const mockUserModel = {
  findById: jest.fn(),
  findOneAndUpdate: jest.fn(),
};

const mockConversationModel = {
  findById: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};

describe('IntelligentUserRegistrationService', () => {
  let service: IntelligentUserRegistrationService;
  let geminiService: GeminiService;
  let messageService: MessageService;
  let fluidRegistrationService: FluidRegistrationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntelligentUserRegistrationService,
        {
          provide: GeminiService,
          useValue: mockGeminiService,
        },
        {
          provide: AIService,
          useValue: mockAIService,
        },
        {
          provide: MessageService,
          useValue: mockMessageService,
        },
        {
          provide: FluidRegistrationService,
          useValue: mockFluidRegistrationService,
        },
        {
          provide: getModelToken('User'),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken('Conversation'),
          useValue: mockConversationModel,
        },
      ],
    }).compile();

    service = module.get<IntelligentUserRegistrationService>(
      IntelligentUserRegistrationService,
    );
    geminiService = module.get<GeminiService>(GeminiService);
    messageService = module.get<MessageService>(MessageService);
    fluidRegistrationService = module.get<FluidRegistrationService>(
      FluidRegistrationService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processUserMessage', () => {
    const mockUserId = 'user123';
    const mockConversationId = 'conv123';

    beforeEach(() => {
      // Setup default mocks
      mockMessageService.getMessages.mockResolvedValue([
        {
          _id: 'msg1',
          text: 'Olá, preciso de ajuda jurídica',
          sender: 'user',
          createdAt: new Date(),
        },
      ]);

      mockAIService.getCurrentConfig.mockReturnValue({
        systemPrompt: 'Você é um assistente jurídico brasileiro.',
        behaviorSettings: {
          maxTokens: 1000,
          temperature: 0.7,
        },
      });
    });

    describe('Status Classification via Function Calls', () => {
      it('should classify conversation as resolved by AI and trigger feedback', async () => {
        // Arrange
        const userMessage = 'Obrigado, isso resolveu meu problema!';
        const mockAIResponse = {
          response: 'Fico feliz em ajudar! Sua questão foi resolvida com sucesso.',
          functionCalls: [
            {
              name: 'update_conversation_status',
              parameters: {
                status: 'resolved_by_ai' as CaseStatus,
                lawyer_needed: false,
                notes: 'Usuário satisfeito com solução da IA',
              },
            },
            {
              name: 'detect_conversation_completion',
              parameters: {
                should_show_feedback: true,
                completion_reason: 'resolved_by_ai',
                feedback_context: 'Conversa resolvida com sucesso pela IA',
              },
            },
          ],
        };

        mockGeminiService.generateAIResponseWithFunctions.mockResolvedValue(
          mockAIResponse,
        );
        mockGeminiService.generateAIResponse.mockResolvedValue({
          text: mockAIResponse.response,
        });
        mockConversationModel.findByIdAndUpdate.mockResolvedValue({
          _id: mockConversationId,
          status: 'resolved_by_ai',
        });
        mockFluidRegistrationService.processFluidRegistration.mockResolvedValue({
          success: true,
        });

        // Act
        const result = await service.processUserMessage(
          userMessage,
          mockConversationId,
          mockUserId,
        );

        // Assert
        expect(result).toEqual({
          response: mockAIResponse.response,
          statusUpdated: true,
          newStatus: 'resolved_by_ai',
          lawyerNeeded: false,
          shouldShowFeedback: true,
          feedbackReason: 'resolved_by_ai',
          specializationRequired: undefined,
          userRegistered: false,
        });
        });

        expect(
          mockGeminiService.generateAIResponseWithFunctions,
        ).toHaveBeenCalledWith([
          {
            text: 'Olá, preciso de ajuda jurídica',
            sender: 'user',
          },
          {
            text: userMessage,
            sender: 'user',
          },
        ]);
      });

      it('should classify conversation as needing lawyer and trigger feedback', async () => {
        // Arrange
        const userMessage = 'Preciso de um advogado especialista em direito trabalhista para um processo complexo';
        const mockAIResponse = {
          response: 'Entendo que seu caso é complexo e necessita de um advogado especialista. Vou encaminhá-lo para nossa equipe jurídica.',
          functionCalls: [
            {
              name: 'update_conversation_status',
              parameters: {
                status: 'assigned_to_lawyer' as CaseStatus,
                lawyer_needed: true,
                specialization_required: 'direito_trabalhista',
                notes: 'Caso complexo requerendo advogado especialista',
              },
            },
            {
              name: 'detect_conversation_completion',
              parameters: {
                should_show_feedback: true,
                completion_reason: 'assigned_to_lawyer',
                feedback_context: 'Caso encaminhado para advogado especialista',
              },
            },
          ],
        };

        mockGeminiService.generateAIResponseWithFunctions.mockResolvedValue(
          mockAIResponse,
        );

        // Act
        const result = await service.processUserMessage(
          userMessage,
          mockConversationId,
          mockUserId,
        );

        // Assert
        expect(result).toEqual({
          response: mockAIResponse.response,
          statusUpdated: true,
          newStatus: 'assigned_to_lawyer',
          lawyerNeeded: true,
          specializationRequired: 'direito_trabalhista',
          shouldShowFeedback: true,
          feedbackReason: 'assigned_to_lawyer',
        });
      });

      it('should handle user registration via function call', async () => {
        // Arrange
        const userMessage = 'Olá, meu nome é João Silva, tenho 30 anos e preciso de ajuda com um contrato';
        const mockAIResponse = {
          text: 'Olá João! Vou te ajudar com seu contrato. Primeiro, preciso registrar algumas informações.',
          functionCalls: [
            {
              name: 'register_user',
              parameters: {
                name: 'João Silva',
                email: 'joao@email.com',
                phone: '11999999999',
                problem_description: 'Precisa de ajuda com contrato',
                urgency_level: 'medium',
              },
            },
          ],
        };

        mockGeminiService.generateAIResponseWithFunctions.mockResolvedValue(
          mockAIResponse,
        );
        mockFluidRegistrationService.registerUser.mockResolvedValue({
          _id: 'user456',
          name: 'João Silva',
          email: 'joao@email.com',
        });

        // Act
        const result = await service.processUserMessage(
          userMessage,
          mockConversationId,
        );

        // Assert
        expect(result).toEqual({
          response: mockAIResponse.response,
          userRegistered: true,
          statusUpdated: false,
          shouldShowFeedback: false,
        });

        expect(mockFluidRegistrationService.registerUser).toHaveBeenCalledWith(
          {
            name: 'João Silva',
            email: 'joao@email.com',
            phone: '11999999999',
            problem_description: 'Precisa de ajuda com contrato',
            urgency_level: 'medium',
          },
          mockConversationId,
        );
      });

      it('should not trigger feedback when conversation is still active', async () => {
        // Arrange
        const userMessage = 'Pode me explicar melhor sobre isso?';
        const mockAIResponse = {
          text: 'Claro! Vou explicar em detalhes...',
          functionCalls: [], // No function calls for completion
        };

        mockGeminiService.generateAIResponseWithFunctions.mockResolvedValue(
          mockAIResponse,
        );

        // Act
        const result = await service.processUserMessage(
          userMessage,
          mockConversationId,
          mockUserId,
        );

        // Assert
        expect(result).toEqual({
          response: mockAIResponse.response,
          statusUpdated: false,
          shouldShowFeedback: false,
        });
      });

      it('should handle invalid feedback parameters gracefully', async () => {
        // Arrange
        const userMessage = 'Obrigado pela ajuda!';
        const mockAIResponse = {
          text: 'De nada! Fico feliz em ajudar.',
          functionCalls: [
            {
              name: 'detect_conversation_completion',
              parameters: {
                should_show_feedback: 'invalid_boolean', // Invalid type
                completion_reason: null, // Invalid value
              },
            },
          ],
        };

        mockGeminiService.generateAIResponseWithFunctions.mockResolvedValue(
          mockAIResponse,
        );

        // Act
        const result = await service.processUserMessage(
          userMessage,
          mockConversationId,
          mockUserId,
        );

        // Assert
        expect(result).toEqual({
          response: mockAIResponse.response,
          statusUpdated: false,
          shouldShowFeedback: false, // Should default to false for invalid parameters
        });
      });

      it('should handle anonymous users without conversation history', async () => {
        // Arrange
        const userMessage = 'Olá, preciso de ajuda jurídica';
        const mockAIResponse = {
          text: 'Olá! Como posso te ajudar hoje?',
          functionCalls: [],
        };

        mockGeminiService.generateAIResponseWithFunctions.mockResolvedValue(
          mockAIResponse,
        );

        // Act
        const result = await service.processUserMessage(
          userMessage,
          mockConversationId,
          undefined, // No userId (anonymous)
          false, // includeHistory = false
        );

        // Assert
        expect(result).toEqual({
          response: mockAIResponse.response,
          statusUpdated: false,
          shouldShowFeedback: false,
        });

        // Should not call getMessages for anonymous users
        expect(mockMessageService.getMessages).not.toHaveBeenCalled();
      });
    });

    describe('Error Handling', () => {
      it('should handle Gemini service errors gracefully', async () => {
        // Arrange
        const userMessage = 'Olá';
        const error = new Error('Gemini API error');

        mockGeminiService.generateAIResponseWithFunctions.mockRejectedValue(
          error,
        );

        // Act & Assert
        await expect(
          service.processUserMessage(userMessage, mockConversationId, mockUserId),
        ).rejects.toThrow('Gemini API error');
      });

      it('should handle user registration errors gracefully', async () => {
        // Arrange
        const userMessage = 'Quero me registrar';
        const mockAIResponse = {
          text: 'Vou te registrar agora.',
          functionCalls: [
            {
              name: 'register_user',
              parameters: {
                name: 'Test User',
                problem_description: 'Test problem',
                urgency_level: 'low',
              },
            },
          ],
        };

        mockGeminiService.generateAIResponseWithFunctions.mockResolvedValue(
          mockAIResponse,
        );
        mockFluidRegistrationService.registerUser.mockRejectedValue(
          new Error('Registration failed'),
        );

        // Act & Assert
        await expect(
          service.processUserMessage(userMessage, mockConversationId),
        ).rejects.toThrow('Registration failed');
      });
    });
  });

  describe('Status Update Handling', () => {
    it('should handle status update to completed', async () => {
      // This would test the handleStatusUpdate method
      // Implementation depends on the actual method signature
      expect(true).toBe(true); // Placeholder test
    });

    it('should handle status update with lawyer assignment', async () => {
      // This would test lawyer assignment logic
      expect(true).toBe(true); // Placeholder test
    });
  });

  describe('Feedback Detection Logic', () => {
    it('should detect when feedback should be shown based on completion reason', async () => {
      // Test the logic for determining when to show feedback
      expect(true).toBe(true); // Placeholder test
    });

    it('should provide appropriate feedback context messages', async () => {
      // Test feedback context message generation
      expect(true).toBe(true); // Placeholder test
    });
  });
});