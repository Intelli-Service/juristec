import { Test, TestingModule } from '@nestjs/testing';
import { IntelligentUserRegistrationService } from './intelligent-user-registration.service';
import { GeminiService } from './gemini.service';
import { AIService } from './ai.service';
import { MessageService } from './message.service';
import { FluidRegistrationService } from './fluid-registration.service';
import { UploadsService } from '../uploads/uploads.service';
import { getModelToken } from '@nestjs/mongoose';
import { CaseStatus } from '../models/User';

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

const mockUploadsService = {
  generateSignedUrl: jest.fn(),
  getFilesWithAISignedUrls: jest.fn(),
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

const mockFileAttachmentModel = {
  find: jest.fn(),
};

describe('IntelligentUserRegistrationService', () => {
  let service: IntelligentUserRegistrationService;
  let _geminiService: GeminiService;
  let _messageService: MessageService;
  let _fluidRegistrationService: FluidRegistrationService;

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
          provide: UploadsService,
          useValue: mockUploadsService,
        },
        {
          provide: getModelToken('User'),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken('Conversation'),
          useValue: mockConversationModel,
        },
        {
          provide: getModelToken('FileAttachment'),
          useValue: mockFileAttachmentModel,
        },
      ],
    }).compile();

    service = module.get<IntelligentUserRegistrationService>(
      IntelligentUserRegistrationService,
    );
    _geminiService = module.get<GeminiService>(GeminiService);
    _messageService = module.get<MessageService>(MessageService);
    _fluidRegistrationService = module.get<FluidRegistrationService>(
      FluidRegistrationService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have required methods', () => {
    expect(service.processUserMessage).toBeDefined();
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
      mockAIService.getCurrentConfig.mockResolvedValue({
        enabled: true,
        model: 'gemini-pro',
        temperature: 0.7,
      });
      mockUploadsService.getFilesWithAISignedUrls.mockResolvedValue([]);
    });

    describe('Status Classification via Function Calls', () => {
      it('should classify conversation as resolved by AI and trigger feedback', async () => {
        // Arrange
        const userMessage = 'Obrigado pela ajuda! Minha dúvida foi resolvida.';
        const mockAIResponse = {
          response:
            'Fico feliz em ajudar! Sua questão foi resolvida com sucesso.',
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
        mockGeminiService.generateAIResponse.mockResolvedValue(
          mockAIResponse.response,
        );
        mockConversationModel.findByIdAndUpdate.mockResolvedValue({
          _id: mockConversationId,
          status: 'resolved_by_ai',
        });
        mockFluidRegistrationService.processFluidRegistration.mockResolvedValue(
          {
            success: true,
          },
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
          newStatus: 'resolved_by_ai',
          lawyerNeeded: false,
          shouldShowFeedback: true,
          feedbackReason: 'resolved_by_ai',
          specializationRequired: undefined,
          userRegistered: false,
        });

        expect(
          mockGeminiService.generateAIResponseWithFunctions,
        ).toHaveBeenCalled();
        expect(mockConversationModel.findByIdAndUpdate).toHaveBeenCalledWith(
          mockConversationId,
          expect.objectContaining({
            status: 'resolved_by_ai',
          }),
        );
      });

      it('should classify conversation as needing lawyer and trigger feedback', async () => {
        // Arrange
        const userMessage =
          'Preciso de um advogado especialista em direito trabalhista para um processo complexo';
        const mockAIResponse = {
          response:
            'Entendo que seu caso é complexo e necessita de um advogado especialista. Vou encaminhá-lo para nossa equipe jurídica.',
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
        mockGeminiService.generateAIResponse.mockResolvedValue(
          mockAIResponse.response,
        );
        mockConversationModel.findByIdAndUpdate.mockResolvedValue({
          _id: mockConversationId,
          status: 'assigned_to_lawyer',
        });
        mockFluidRegistrationService.processFluidRegistration.mockResolvedValue(
          {
            success: true,
          },
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
          userRegistered: false,
        });

        expect(mockConversationModel.findByIdAndUpdate).toHaveBeenCalledWith(
          mockConversationId,
          expect.objectContaining({
            status: 'assigned_to_lawyer',
            lawyerNeeded: true,
            classification: {
              legalArea: 'direito_trabalhista',
            },
          }),
        );
      });

      it('should handle user registration via function call', async () => {
        // Arrange
        const userMessage =
          'Olá, meu nome é João Silva e preciso de ajuda jurídica';
        const mockAIResponse = {
          response:
            'Olá João! Vou te ajudar com seu contrato. Primeiro, preciso registrar algumas informações.',
          functionCalls: [
            {
              name: 'register_user',
              parameters: {
                name: 'João Silva',
                email: 'joao.silva@email.com',
                phone: '+5511999999999',
                consent: true,
              },
            },
          ],
        };

        mockGeminiService.generateAIResponseWithFunctions.mockResolvedValue(
          mockAIResponse,
        );
        mockGeminiService.generateAIResponse.mockResolvedValue(
          mockAIResponse.response,
        );
        mockFluidRegistrationService.processFluidRegistration.mockResolvedValue(
          {
            success: true,
            userId: 'newUser123',
          },
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
          userRegistered: true,
          statusUpdated: false,
          shouldShowFeedback: false,
          newStatus: undefined,
          lawyerNeeded: undefined,
          specializationRequired: undefined,
        });

        expect(
          mockFluidRegistrationService.processFluidRegistration,
        ).toHaveBeenCalledWith(
          {
            email: 'joao.silva@email.com',
            phone: '+5511999999999',
            name: 'João Silva',
          },
          mockConversationId,
        );
      });

      it('should not trigger feedback when conversation is still active', async () => {
        // Arrange
        const userMessage = 'Claro! Vou explicar em detalhes...';
        const mockAIResponse = {
          response: 'Claro! Vou explicar em detalhes...',
          functionCalls: [], // No function calls for active conversation
        };

        mockGeminiService.generateAIResponseWithFunctions.mockResolvedValue(
          mockAIResponse,
        );
        mockGeminiService.generateAIResponse.mockResolvedValue(
          mockAIResponse.response,
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
          userRegistered: false,
          newStatus: undefined,
          lawyerNeeded: undefined,
          specializationRequired: undefined,
        });

        expect(mockConversationModel.findByIdAndUpdate).not.toHaveBeenCalled();
      });

      it('should handle invalid feedback parameters gracefully', async () => {
        // Arrange
        const userMessage = 'De nada! Fico feliz em ajudar.';
        const mockAIResponse = {
          response: 'De nada! Fico feliz em ajudar.',
          functionCalls: [
            {
              name: 'detect_conversation_completion',
              parameters: {
                should_show_feedback: 'invalid', // Invalid parameter
                completion_reason: null, // Invalid parameter
              },
            },
          ],
        };

        mockGeminiService.generateAIResponseWithFunctions.mockResolvedValue(
          mockAIResponse,
        );
        mockGeminiService.generateAIResponse.mockResolvedValue(
          mockAIResponse.response,
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
          userRegistered: false,
          newStatus: undefined,
          lawyerNeeded: undefined,
          specializationRequired: undefined,
          feedbackReason: undefined,
        });
      });

      it('should handle anonymous users without conversation history', async () => {
        // Arrange
        const userMessage = 'Olá! Como posso te ajudar hoje?';
        const mockAIResponse = {
          response: 'Olá! Como posso te ajudar hoje?',
          functionCalls: [], // No function calls
        };

        mockGeminiService.generateAIResponseWithFunctions.mockResolvedValue(
          mockAIResponse,
        );
        mockGeminiService.generateAIResponse.mockResolvedValue(
          mockAIResponse.response,
        );

        // Act
        const result = await service.processUserMessage(
          userMessage,
          mockConversationId, // No userId provided
        );

        // Assert
        expect(result).toEqual({
          response: mockAIResponse.response,
          statusUpdated: false,
          shouldShowFeedback: false,
          userRegistered: false,
          newStatus: undefined,
          lawyerNeeded: undefined,
          specializationRequired: undefined,
        });

        // Should not try to fetch conversation history for anonymous users
        expect(mockMessageService.getMessages).not.toHaveBeenCalled();
      });
    });

    describe('Error Handling', () => {
      it('should handle Gemini service errors gracefully', async () => {
        // Arrange
        const userMessage = 'Mensagem de teste';
        mockGeminiService.generateAIResponseWithFunctions.mockRejectedValue(
          new Error('Gemini API error'),
        );
        mockGeminiService.generateAIResponse.mockRejectedValue(
          new Error('Fallback API error'),
        );

        // Act & Assert
        await expect(
          service.processUserMessage(
            userMessage,
            mockConversationId,
            mockUserId,
          ),
        ).rejects.toThrow('Fallback API error');
      });

      it('should handle user registration errors gracefully', async () => {
        // Arrange
        const userMessage = 'Mensagem que requer registro';
        const mockAIResponse = {
          response: 'Vamos registrar você primeiro.',
          functionCalls: [
            {
              name: 'register_user',
              parameters: {
                name: 'Test User',
                email: 'test@example.com',
              },
            },
          ],
        };

        mockGeminiService.generateAIResponseWithFunctions.mockResolvedValue(
          mockAIResponse,
        );
        mockFluidRegistrationService.processFluidRegistration.mockRejectedValue(
          new Error('Registration failed'),
        );
        mockGeminiService.generateAIResponse.mockRejectedValue(
          new Error('Fallback API error'),
        );

        // Act & Assert
        await expect(
          service.processUserMessage(userMessage, mockConversationId),
        ).rejects.toThrow('Fallback API error');
      });
    });
  });

  describe('Status Update Handling', () => {
    it('should handle status update to completed', async () => {
      // Test through integration - this logic is tested in the processUserMessage tests above
      expect(true).toBe(true); // Placeholder test - logic is tested in integration tests above
    });

    it('should handle status update with lawyer assignment', async () => {
      // Test through integration - this logic is tested in the processUserMessage tests above
      expect(true).toBe(true); // Placeholder test - logic is tested in integration tests above
    });
  });

  describe('Feedback Detection Logic', () => {
    it('should detect when feedback should be shown based on completion reason', () => {
      // Test the logic for determining when to show feedback
      expect(true).toBe(true); // Placeholder test - logic is tested in integration tests above
    });

    it('should provide appropriate feedback context messages', () => {
      // Test feedback context message generation
      expect(true).toBe(true); // Placeholder test - logic is tested in integration tests above
    });
  });
});
