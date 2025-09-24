import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from '../chat.gateway';
import { GeminiService } from '../../lib/gemini.service';
import { AIService } from '../../lib/ai.service';
import { MessageService } from '../../lib/message.service';
import { UserDataCollectionService } from '../../lib/user-data-collection.service';
import { JwtService } from '@nestjs/jwt';

// Mock do mongoose
jest.mock('mongoose', () => ({
  connect: jest.fn(),
  connection: {
    readyState: 1,
  },
  Schema: jest.fn().mockImplementation(() => ({
    pre: jest.fn(),
    post: jest.fn(),
  })),
  model: jest.fn(),
}));

// Mock dos modelos
jest.mock('../../models/Conversation', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

jest.mock('../../models/Message', () => ({
  find: jest.fn(),
  create: jest.fn(),
}));

describe('ChatGateway - User Data Collection Integration', () => {
  let gateway: ChatGateway;
  let userDataCollectionService: UserDataCollectionService;

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
          },
        },
        {
          provide: UserDataCollectionService,
          useValue: {
            processUserMessage: jest.fn(),
            extractContactInfo: jest.fn(),
            shouldCollectContactInfo: jest.fn(),
            generateContactRequest: jest.fn(),
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
    userDataCollectionService = module.get<UserDataCollectionService>(UserDataCollectionService);
  });

  describe('User Data Collection Integration', () => {
    it('should request contact info when appropriate', async () => {
      // Mock do serviço de coleta de dados
      jest.spyOn(userDataCollectionService, 'processUserMessage').mockResolvedValue({
        shouldRequestContact: true,
        contactRequestMessage: 'Por favor, informe seu contato',
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
      expect(userDataCollectionService.processUserMessage).toHaveBeenCalledWith(
        'Olá, preciso de ajuda',
        expect.objectContaining({
          email: null,
          phone: null,
          conversationCount: expect.any(Number),
        }),
        'conversation-id'
      );

      // Verificar se a mensagem de contato foi enviada
      expect(mockServer.to).toHaveBeenCalledWith('test-room');
      expect(mockServer.emit).toHaveBeenCalledWith('receive-message', {
        text: 'Por favor, informe seu contato',
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
      jest.spyOn(userDataCollectionService, 'processUserMessage').mockResolvedValue({
        shouldRequestContact: false,
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

      // Verificar se a resposta da IA foi gerada (não foi interrompida pela coleta de dados)
      expect(generateResponseSpy).toHaveBeenCalled();
    }, 10000);
  });
});