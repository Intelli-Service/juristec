import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IntelligentUserRegistrationService } from '../../src/lib/intelligent-user-registration.service';
import { GeminiService, FunctionCall } from '../../src/lib/gemini.service';
import { FluidRegistrationService } from '../../src/lib/fluid-registration.service';
import { VerificationService } from '../../src/lib/verification.service';
import { AIService } from '../../src/lib/ai.service';
import { MessageService } from '../../src/lib/message.service';
import { IUser } from '../../src/models/User';
import { IConversation } from '../../src/models/Conversation';
import { FluidRegistrationResult } from '../../src/lib/fluid-registration.service';

describe('IntelligentUserRegistrationService - Function Calls Database Integration (e2e)', () => {
  let module: TestingModule;
  let intelligentRegistrationService: IntelligentUserRegistrationService;
  let geminiService: GeminiService;
  let fluidRegistrationService: FluidRegistrationService;
  let userModel: Model<IUser>;
  let conversationModel: Model<IConversation>;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        IntelligentUserRegistrationService,
        {
          provide: GeminiService,
          useValue: {
            generateAIResponseWithFunctions: jest.fn(),
            generateAIResponse: jest.fn(),
            disconnect: jest.fn(),
          },
        },
        {
          provide: AIService,
          useValue: {
            generateResponse: jest.fn(),
          },
        },
        {
          provide: MessageService,
          useValue: {
            saveMessage: jest.fn(),
            getConversationMessages: jest.fn(),
          },
        },
        {
          provide: FluidRegistrationService,
          useValue: {
            processFluidRegistration: jest.fn(),
          },
        },
        {
          provide: VerificationService,
          useValue: {
            generateCode: jest.fn(),
            verifyCode: jest.fn(),
            isVerified: jest.fn(),
          },
        },
        {
          provide: getModelToken('User'),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            findByIdAndUpdate: jest.fn(),
          },
        },
        {
          provide: getModelToken('Conversation'),
          useValue: {
            findByIdAndUpdate: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    intelligentRegistrationService =
      module.get<IntelligentUserRegistrationService>(
        IntelligentUserRegistrationService,
      );
    geminiService = module.get<GeminiService>(GeminiService);
    fluidRegistrationService = module.get<FluidRegistrationService>(
      FluidRegistrationService,
    );
    userModel = module.get<Model<IUser>>(getModelToken('User'));
    conversationModel = module.get<Model<IConversation>>(
      getModelToken('Conversation'),
    );
  });

  describe('User Registration Function Call - Database Persistence', () => {
    it('should persist user data in database when register_user function call is executed', async () => {
      // Mock da resposta do Gemini com function call de registro
      const mockGeminiResponse = {
        response: 'Vou registrar você no sistema com os dados fornecidos.',
        functionCalls: [
          {
            name: 'register_user' as const,
            parameters: {
              name: 'João Silva Santos',
              email: 'joao.silva@email.com',
              phone: '+5511999999999',
              problem_description: 'Demissão injusta e direitos trabalhistas',
              urgency_level: 'high' as const,
            },
          },
        ] as FunctionCall[],
      };

      // Mock do FluidRegistrationService para simular sucesso
      const mockFluidResult: FluidRegistrationResult = {
        success: true,
        message: 'Usuário registrado com sucesso',
        userId: 'user-123-abc',
        userCreated: true,
        verificationSent: true,
        needsVerification: true,
      };

      jest
        .spyOn(geminiService, 'generateAIResponseWithFunctions')
        .mockResolvedValue(mockGeminiResponse);

      jest
        .spyOn(fluidRegistrationService, 'processFluidRegistration')
        .mockResolvedValue(mockFluidResult);

      jest.spyOn(userModel, 'findOne').mockResolvedValue(null);
      jest.spyOn(userModel, 'create').mockResolvedValue({
        _id: 'user-123-abc',
        name: 'João Silva Santos',
        email: 'joao.silva@email.com',
        role: 'client',
        isActive: false, // Ainda não verificado
      } as any);

      jest.spyOn(conversationModel, 'findByIdAndUpdate').mockResolvedValue({
        _id: 'conv-456-def',
        roomId: 'room-789-ghi',
        status: 'active',
        clientInfo: {
          name: 'João Silva Santos',
          email: 'joao.silva@email.com',
          phone: '+5511999999999',
        },
        priority: 'high',
      } as any);

      // Executar o teste
      const result = await intelligentRegistrationService.processUserMessage(
        'Olá, meu nome é João Silva, fui demitido injustamente e quero saber meus direitos',
        'conv-456-def',
        undefined, // userId
        true, // includeHistory
        false, // isAuthenticated
        [], // attachments
      );

      // Verificações
      expect(result.response).toBe(
        'Vou registrar você no sistema com os dados fornecidos.',
      );
      expect(result.userRegistered).toBe(true);
      expect(result.statusUpdated).toBe(false);

      // Verificar se o FluidRegistrationService foi chamado com os dados corretos
      expect(
        fluidRegistrationService.processFluidRegistration,
      ).toHaveBeenCalledWith(
        {
          name: 'João Silva Santos',
          email: 'joao.silva@email.com',
          phone: '+5511999999999',
        },
        'conv-456-def',
      );

      // Verificar se a conversa foi atualizada com os dados do usuário
      expect(conversationModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'conv-456-def',
        {
          status: 'active',
          clientInfo: {
            name: 'João Silva Santos',
            email: 'joao.silva@email.com',
            phone: '+5511999999999',
            userId: 'user-123-abc',
          },
          priority: 'high',
        },
      );
    });

    it('should connect existing verified user via function call', async () => {
      // Mock da resposta do Gemini
      const mockGeminiResponse = {
        response: 'Bem-vindo de volta! Vejo que você já tem cadastro conosco.',
        functionCalls: [
          {
            name: 'register_user' as const,
            parameters: {
              email: 'maria.santos@email.com',
              problem_description: 'Consulta sobre divórcio',
              urgency_level: 'medium' as const,
            },
          },
        ] as FunctionCall[],
      };

      jest
        .spyOn(geminiService, 'generateAIResponseWithFunctions')
        .mockResolvedValue(mockGeminiResponse);

      const mockFluidResult: FluidRegistrationResult = {
        success: true,
        message: 'Usuário conectado com sucesso',
        userId: 'user-existing-123',
        userCreated: false,
        verificationSent: false,
        needsVerification: false,
      };

      jest
        .spyOn(fluidRegistrationService, 'processFluidRegistration')
        .mockResolvedValue(mockFluidResult);

      jest
        .spyOn(conversationModel, 'findByIdAndUpdate')
        .mockResolvedValue({} as any);

      const result = await intelligentRegistrationService.processUserMessage(
        'Olá, sou Maria Santos, já sou cliente de vocês',
        'conv-existing-user',
      );

      expect(result.userRegistered).toBe(true);
      expect(
        fluidRegistrationService.processFluidRegistration,
      ).toHaveBeenCalledWith(
        {
          email: 'maria.santos@email.com',
          name: undefined,
          phone: undefined,
        },
        'conv-existing-user',
      );
    });
  });

  describe('Status Update Function Call - Database Persistence', () => {
    it('should persist conversation status and classification when update_conversation_status is called', async () => {
      const mockGeminiResponse = {
        response:
          'Seu caso é complexo e precisa de um advogado especialista em direito trabalhista.',
        functionCalls: [
          {
            name: 'update_conversation_status' as const,
            parameters: {
              status: 'active' as const,
              lawyer_needed: true,
              specialization_required: 'Direito Trabalhista',
              notes:
                'Caso de demissão injusta com pedido de reintegração e verbas rescisórias',
            },
          },
        ] as FunctionCall[],
      };

      jest
        .spyOn(geminiService, 'generateAIResponseWithFunctions')
        .mockResolvedValue(mockGeminiResponse);

      jest.spyOn(conversationModel, 'findByIdAndUpdate').mockResolvedValue({
        _id: 'conv-status-123',
        status: 'assigned_to_lawyer',
        lawyerNeeded: true,
        classification: {
          legalArea: 'Direito Trabalhista',
        },
        summary: {
          text: 'Caso de demissão injusta com pedido de reintegração e verbas rescisórias',
          lastUpdated: expect.any(Date),
          generatedBy: 'ai',
        },
        lastUpdated: expect.any(Date),
      } as any);

      const result = await intelligentRegistrationService.processUserMessage(
        'Fui demitido sem justa causa e quero voltar ao emprego',
        'conv-status-123',
      );

      expect(result.response).toBe(
        'Seu caso é complexo e precisa de um advogado especialista em direito trabalhista.',
      );
      expect(result.statusUpdated).toBe(true);
      expect(result.newStatus).toBe('assigned_to_lawyer');
      expect(result.lawyerNeeded).toBe(true);
      expect(result.specializationRequired).toBe('Direito Trabalhista');

      // Verificar se os dados foram persistidos corretamente
      expect(conversationModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'conv-status-123',
        {
          status: 'assigned_to_lawyer',
          lawyerNeeded: true,
          lastUpdated: expect.any(Date),
          classification: {
            legalArea: 'Direito Trabalhista',
          },
          summary: {
            text: 'Caso de demissão injusta com pedido de reintegração e verbas rescisórias',
            lastUpdated: expect.any(Date),
            generatedBy: 'ai',
          },
        },
      );
    });

    it('should handle simple case resolution without lawyer intervention', async () => {
      const mockGeminiResponse = {
        response:
          'Este é um caso simples que posso resolver com orientações básicas.',
        functionCalls: [
          {
            name: 'update_conversation_status' as const,
            parameters: {
              status: 'resolved_by_ai' as const,
              lawyer_needed: false,
              notes:
                'Orientação sobre direitos básicos trabalhistas - férias e 13º salário',
            },
          },
        ] as FunctionCall[],
      };

      jest
        .spyOn(geminiService, 'generateAIResponseWithFunctions')
        .mockResolvedValue(mockGeminiResponse);

      jest
        .spyOn(conversationModel, 'findByIdAndUpdate')
        .mockResolvedValue({} as any);

      const result = await intelligentRegistrationService.processUserMessage(
        'Quanto tempo de férias eu tenho direito por ano trabalhado?',
        'conv-simple-123',
      );

      expect(result.statusUpdated).toBe(true);
      expect(result.newStatus).toBe('resolved_by_ai');
      expect(result.lawyerNeeded).toBe(false);

      expect(conversationModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'conv-simple-123',
        {
          status: 'resolved_by_ai',
          lawyerNeeded: false,
          lastUpdated: expect.any(Date),
          summary: {
            text: 'Orientação sobre direitos básicos trabalhistas - férias e 13º salário',
            lastUpdated: expect.any(Date),
            generatedBy: 'ai',
          },
        },
      );
    });
  });

  describe('Multiple Function Calls Sequence', () => {
    it('should handle registration followed by status update in sequence', async () => {
      // Primeira chamada: registro do usuário
      const mockGeminiResponse1 = {
        response: 'Vou registrar seus dados e analisar seu caso.',
        functionCalls: [
          {
            name: 'register_user' as const,
            parameters: {
              name: 'Carlos Oliveira',
              email: 'carlos.oliveira@email.com',
              phone: '+5511988888888',
              problem_description:
                'Problemas com contrato de prestação de serviços',
              urgency_level: 'medium' as const,
            },
          },
        ] as FunctionCall[],
      };

      // Segunda chamada: atualização de status
      const mockGeminiResponse2 = {
        response: 'Seu caso precisa de análise jurídica especializada.',
        functionCalls: [
          {
            name: 'update_conversation_status' as const,
            parameters: {
              status: 'assigned_to_lawyer' as const,
              lawyer_needed: true,
              specialization_required: 'Direito Empresarial',
              notes:
                'Análise de contrato de prestação de serviços com cláusulas abusivas',
            },
          },
        ] as FunctionCall[],
      };

      // Configurar mocks para simular sequência
      let callCount = 0;
      jest
        .spyOn(geminiService, 'generateAIResponseWithFunctions')
        .mockImplementation(() => {
          callCount++;
          return Promise.resolve(
            callCount === 1 ? mockGeminiResponse1 : mockGeminiResponse2,
          );
        });

      // Mocks dos serviços
      const mockFluidResult: FluidRegistrationResult = {
        success: true,
        message: 'Usuário registrado com sucesso',
        userId: 'user-carlos-123',
        userCreated: true,
        verificationSent: true,
        needsVerification: true,
      };

      jest
        .spyOn(fluidRegistrationService, 'processFluidRegistration')
        .mockResolvedValue(mockFluidResult);

      jest
        .spyOn(conversationModel, 'findByIdAndUpdate')
        .mockResolvedValue({} as any);

      // Primeira mensagem - deve registrar usuário
      const result1 = await intelligentRegistrationService.processUserMessage(
        'Olá, sou Carlos Oliveira, tenho problemas com um contrato que assinei',
        'conv-multi-123',
      );

      expect(result1.userRegistered).toBe(true);
      expect(result1.statusUpdated).toBe(false);

      // Segunda mensagem - deve atualizar status
      const result2 = await intelligentRegistrationService.processUserMessage(
        'O contrato tem cláusulas que me prejudicam muito',
        'conv-multi-123',
      );

      expect(result2.userRegistered).toBe(false);
      expect(result2.statusUpdated).toBe(true);
      expect(result2.lawyerNeeded).toBe(true);
      expect(result2.specializationRequired).toBe('Direito Empresarial');

      // Verificar que ambos os métodos foram chamados
      expect(
        fluidRegistrationService.processFluidRegistration,
      ).toHaveBeenCalledTimes(1);
      expect(conversationModel.findByIdAndUpdate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Data Validation and Error Handling', () => {
    it('should handle invalid function call parameters gracefully', async () => {
      const mockGeminiResponse = {
        response: 'Houve um problema ao processar seus dados.',
        functionCalls: [
          {
            name: 'register_user' as const,
            parameters: {
              name: '',
              email: 'invalid-email',
              urgency_level: 'invalid_level' as any,
            },
          },
        ] as FunctionCall[],
      };

      jest
        .spyOn(geminiService, 'generateAIResponseWithFunctions')
        .mockResolvedValue(mockGeminiResponse);

      // Mock do FluidRegistrationService falhando
      const mockFluidResult: FluidRegistrationResult = {
        success: false,
        message: 'Dados inválidos fornecidos',
      };

      jest
        .spyOn(fluidRegistrationService, 'processFluidRegistration')
        .mockResolvedValue(mockFluidResult);

      // Deve usar fallback para registro direto
      jest.spyOn(userModel, 'findOne').mockResolvedValue(null);
      jest.spyOn(userModel, 'create').mockResolvedValue({
        _id: 'fallback-user-123',
        name: 'Usuário Anônimo',
        email: 'anon-123@example.invalid',
        role: 'client',
      } as any);

      jest
        .spyOn(conversationModel, 'findByIdAndUpdate')
        .mockResolvedValue({} as any);

      // Deve usar fallback para resposta simples
      jest
        .spyOn(geminiService, 'generateAIResponse')
        .mockResolvedValue(
          'Desculpe, houve um problema. Como posso te ajudar?',
        );

      const result = await intelligentRegistrationService.processUserMessage(
        'Mensagem com dados inválidos',
        'conv-error-123',
      );

      // Mesmo com dados inválidos, deve tentar processar via fallback
      expect(result.response).toBe(
        'Houve um problema ao processar seus dados.',
      );
      expect(
        fluidRegistrationService.processFluidRegistration,
      ).toHaveBeenCalled();
    });

    it('should handle database errors during function call execution', async () => {
      const mockGeminiResponse = {
        response: 'Erro interno ao processar seus dados.',
        functionCalls: [
          {
            name: 'update_conversation_status' as const,
            parameters: {
              status: 'assigned_to_lawyer' as const,
              lawyer_needed: true,
              specialization_required: 'Direito Civil',
              notes: 'Caso urgente',
            },
          },
        ] as FunctionCall[],
      };

      jest
        .spyOn(geminiService, 'generateAIResponseWithFunctions')
        .mockResolvedValue(mockGeminiResponse);

      // Simular erro de banco de dados
      jest
        .spyOn(conversationModel, 'findByIdAndUpdate')
        .mockRejectedValue(new Error('Database connection failed'));

      // Deve usar fallback para resposta simples
      jest
        .spyOn(geminiService, 'generateAIResponse')
        .mockResolvedValue(
          'Desculpe, houve um problema técnico. Como posso te ajudar?',
        );

      const result = await intelligentRegistrationService.processUserMessage(
        'Mensagem que causa erro de banco',
        'conv-db-error-123',
      );

      // Deve usar fallback quando há erro de banco
      expect(result.response).toBe(
        'Desculpe, houve um problema técnico. Como posso te ajudar?',
      );
      expect(geminiService.generateAIResponse).toHaveBeenCalled();
    });
  });
});
