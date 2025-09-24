import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from '../chat.gateway';
import { GeminiService } from '../../lib/gemini.service';
import { AIService } from '../../lib/ai.service';
import { MessageService } from '../../lib/message.service';
import { IntelligentUserRegistrationService } from '../../lib/intelligent-user-registration.service';
import { FluidRegistrationService } from '../../lib/fluid-registration.service';
import { VerificationService } from '../../lib/verification.service';
import { JwtService } from '@nestjs/jwt';

// Mock do mongoose - deve ser o primeiro mock
jest.doMock('mongoose', () => ({
  connect: jest.fn(),
  connection: {
    readyState: 1,
  },
  Schema: function() {
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
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

describe('ChatGateway - User Data Collection Integration', () => {
  let gateway: ChatGateway;
  let intelligentUserRegistrationService: IntelligentUserRegistrationService;

  beforeEach(async () => {
    // Mock do Conversation model
    const Conversation = require('../../models/Conversation');
    Conversation.findOne.mockResolvedValue({
      _id: 'conversation-id',
      roomId: 'test-room',
      userEmail: null,
      userPhone: null,
    });
    Conversation.create.mockResolvedValue({
      _id: 'conversation-id',
      roomId: 'test-room',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        {
          provide: GeminiService,
          useValue: {
            generateAIResponse: jest.fn().mockResolvedValue('Resposta da IA'),
          },
        },
        {
          provide: AIService,
          useValue: {
            classifyConversation: jest.fn(),
            updateUserData: jest.fn(),
          },
        },
        {
          provide: MessageService,
          useValue: {
            createMessage: jest.fn().mockResolvedValue({
              _id: 'msg-id',
              text: 'test message',
              sender: 'user',
            }),
            getMessages: jest.fn().mockResolvedValue([
              {
                _id: 'msg-1',
                text: 'Olá, preciso de ajuda jurídica',
                sender: 'user',
                createdAt: new Date('2025-01-01T10:00:00Z'),
              },
              {
                _id: 'msg-2',
                text: 'Claro, posso te ajudar. Qual é o seu problema?',
                sender: 'ai',
                createdAt: new Date('2025-01-01T10:01:00Z'),
              },
            ]),
          },
        },
        {
          provide: IntelligentUserRegistrationService,
          useValue: {
            processUserMessage: jest.fn(),
          },
        },
        {
          provide: FluidRegistrationService,
          useValue: {
            processFluidRegistration: jest.fn(),
            verifyAndCompleteRegistration: jest.fn(),
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
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    intelligentUserRegistrationService = module.get<IntelligentUserRegistrationService>(IntelligentUserRegistrationService);
  });

  describe('User Data Collection Integration', () => {
    it('should request contact info when appropriate', async () => {
      // Mock do serviço de coleta de dados
      jest.spyOn(intelligentUserRegistrationService, 'processUserMessage').mockResolvedValue({
        response: 'Olá! Para te ajudar melhor, preciso de algumas informações. Qual é o seu nome?',
        userRegistered: false,
        statusUpdated: false
      });

      // Simular socket e server
      const mockSocket = {
        id: 'socket-id',
        data: { isAuthenticated: false, user: null },
        emit: jest.fn(),
      };

      const mockServer = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };

      gateway.server = mockServer as any;

      // Chamar o método handleSendMessage
      await gateway.handleSendMessage(
        { roomId: 'test-room', message: 'Olá, preciso de ajuda' },
        mockSocket as any
      );

      // Verificar se processUserMessage foi chamado
      expect(intelligentUserRegistrationService.processUserMessage).toHaveBeenCalledWith(
        'Olá, preciso de ajuda',
        'conversation-id',
        undefined,
        false
      );

      // Verificar se a mensagem de contato foi enviada
      expect(mockServer.to).toHaveBeenCalledWith('test-room');
      expect(mockServer.emit).toHaveBeenCalledWith('receive-message', {
        text: 'Olá! Para te ajudar melhor, preciso de algumas informações. Qual é o seu nome?',
        sender: 'ai',
        messageId: 'msg-id',
      });
    }, 10000);

    it('should not request contact info when user already has data', async () => {
      // Mock do Conversation com dados do usuário
      const Conversation = require('../../models/Conversation');
      Conversation.findOne.mockResolvedValue({
        _id: 'conversation-id',
        roomId: 'test-room',
        userEmail: 'teste@email.com',
        userPhone: null,
      });

      // Mock do serviço de coleta de dados - usuário já tem dados
      jest.spyOn(intelligentUserRegistrationService, 'processUserMessage').mockResolvedValue({
        response: 'Obrigado pelas informações. Como posso te ajudar?',
        userRegistered: true,
        statusUpdated: false
      });

      // Mock do GeminiService
      const generateResponseSpy = jest.spyOn(gateway['geminiService'], 'generateAIResponse');

      // Simular socket e server
      const mockSocket = {
        id: 'socket-id',
        data: { isAuthenticated: false, user: null },
        emit: jest.fn(),
      };

      const mockServer = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };

      gateway.server = mockServer as any;

      // Chamar o método handleSendMessage
      await gateway.handleSendMessage(
        { roomId: 'test-room', message: 'Olá, preciso de ajuda' },
        mockSocket as any
      );

      // Verificar se processUserMessage foi chamado (sempre é chamado agora)
      expect(intelligentUserRegistrationService.processUserMessage).toHaveBeenCalledWith(
        'Olá, preciso de ajuda',
        'conversation-id',
        undefined,
        false
      );
    }, 10000);
  });
});