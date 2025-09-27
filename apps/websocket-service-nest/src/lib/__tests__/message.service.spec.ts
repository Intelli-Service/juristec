import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException } from '@nestjs/common';
import { Model, Query, Document } from 'mongoose';
import {
  MessageService,
  CreateMessageData,
  MessageFilters,
} from '../message.service';
import MessageModel, { IMessage, MessageSender } from '../../models/Message';
import ConversationModel, { IConversation } from '../../models/Conversation';
import { IUser, CaseStatus } from '../../models/User';

// Mock dos modelos
jest.mock('../../models/Message');
jest.mock('../../models/Conversation');

// Tipagem para o modelo mockado
type MockModel<T extends Document> = Model<T> & {
  [K in keyof Model<T>]: jest.Mock;
} & {
  new (data?: any): T;
};

const MockMessage = MessageModel as unknown as MockModel<IMessage>;
const MockConversation =
  ConversationModel as unknown as MockModel<IConversation>;

describe('MessageService', () => {
  let service: MessageService;
  let mockMessageInstance: IMessage;
  let mockConversationInstance: IConversation;

  beforeEach(async () => {
    // Reset dos mocks
    jest.clearAllMocks();

    // Criar instâncias mockadas com tipos
    mockMessageInstance = {
      _id: 'message-id-123',
      conversationId: 'conversation-id-123',
      text: 'Test message',
      sender: 'user',
      senderId: 'user-id-123',
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn().mockResolvedValue({
        _id: 'message-id-123',
        conversationId: 'conversation-id-123',
        text: 'Test message',
        sender: 'user',
        senderId: 'user-id-123',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    } as unknown as IMessage;

    mockConversationInstance = {
      _id: 'conversation-id-123',
      roomId: 'room-123',
      status: CaseStatus.OPEN,
      assignedTo: 'lawyer-id-123',
      save: jest.fn().mockResolvedValue(this),
    } as unknown as IConversation;

    // Configurar Message mock
    const MockMessage = Object.assign(
      jest.fn().mockImplementation((data: Partial<IMessage>) => {
        const messageInstance = {
          ...mockMessageInstance,
          ...data,
          _id: 'mock-message-id',
        };
        messageInstance.save = jest.fn().mockResolvedValue(messageInstance);
        return messageInstance;
      }),
      {
        create: jest.fn().mockResolvedValue(mockMessageInstance),
        find: jest.fn(),
        findOne: jest.fn(),
        findById: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        countDocuments: jest.fn(),
        aggregate: jest.fn(),
      },
    );

    const mockMessageQuery = {
      populate: jest.fn().mockResolvedValue({
        _id: 'msg-123',
        conversationId: {
          _id: 'conv-1',
          roomId: 'room-1',
          status: CaseStatus.OPEN,
        },
        text: 'Test message',
        sender: 'user',
      }),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };

    MockMessage.find.mockReturnValue(
      mockMessageQuery as unknown as Query<IMessage[], IMessage>,
    );
    MockMessage.findById.mockReturnValue(
      mockMessageQuery as unknown as Query<IMessage | null, IMessage>,
    );
    MockMessage.countDocuments.mockResolvedValue(0);
    MockMessage.findByIdAndUpdate.mockResolvedValue(mockMessageInstance);
    MockMessage.create.mockResolvedValue(mockMessageInstance);

    // Configurar Conversation mock
    const MockConversation = Object.assign(
      jest.fn().mockImplementation(() => mockConversationInstance),
      {
        create: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        findById: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        countDocuments: jest.fn(),
        aggregate: jest.fn(),
      },
    );
    MockConversation.findById.mockResolvedValue(mockConversationInstance);
    MockConversation.findByIdAndUpdate.mockResolvedValue(
      mockConversationInstance,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        {
          provide: getModelToken('Message'),
          useValue: MockMessage,
        },
        {
          provide: getModelToken('Conversation'),
          useValue: MockConversation,
        },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
  });

  describe('createMessage', () => {
    const validMessageData: CreateMessageData = {
      conversationId: 'conversation-id-123',
      text: 'Test message',
      sender: 'user',
      senderId: 'user-id-123',
      metadata: { test: true },
    };

    it('should create a message successfully for user sender', async () => {
      // Arrange
      MockConversation.findById.mockResolvedValue({
        ...mockConversationInstance,
        status: 'open',
      } as IConversation);
      MockMessage.findByIdAndUpdate.mockResolvedValue(mockConversationInstance);

      // Spy on Message constructor
      const messageConstructorSpy = jest.spyOn(require('../../models/Message'), 'default');
      messageConstructorSpy.mockImplementation((data: any) => {
        const messageInstance = {
          ...mockMessageInstance,
          ...(data || {}),
          _id: 'mock-message-id',
          save: jest.fn().mockImplementation(() => {
            return Promise.resolve({
              ...mockMessageInstance,
              ...(data || {}),
              _id: 'mock-message-id',
            });
          }),
        };
        return messageInstance;
      });

      // Act
      const result = await service.createMessage(validMessageData);

      // Assert
      expect(result).toBeDefined();
      expect(result.text).toBe('Test message');
      expect(result.sender).toBe('user');
      expect(MockConversation.findById).toHaveBeenCalledWith(
        'conversation-id-123',
      );
      expect(MockConversation.findByIdAndUpdate).toHaveBeenCalledWith(
        'conversation-id-123',
        {
          updatedAt: expect.any(Date),
        },
      );
    });

    it('should create a message successfully for AI sender', async () => {
      // Arrange
      const aiMessageData = { ...validMessageData, sender: 'ai' as const };
      MockConversation.findById.mockResolvedValue({
        ...mockConversationInstance,
        status: CaseStatus.OPEN,
      } as IConversation);

      // Act
      const result = await service.createMessage(aiMessageData);

      // Assert
      expect(result).toBeDefined();
      expect(result.sender).toBe('ai');
    });

    it('should create a message successfully for lawyer sender', async () => {
      // Arrange
      const lawyerMessageData = {
        ...validMessageData,
        sender: 'lawyer' as const,
        senderId: 'lawyer-id-123',
      };
      MockConversation.findById.mockResolvedValue({
        ...mockConversationInstance,
        status: CaseStatus.ASSIGNED,
        assignedTo: 'lawyer-id-123',
      } as IConversation);

      // Act
      const result = await service.createMessage(lawyerMessageData);

      // Assert
      expect(result).toBeDefined();
      expect(result.sender).toBe('lawyer');
    });

    it('should create a message successfully for system sender', async () => {
      // Arrange
      const systemMessageData: CreateMessageData = {
        ...validMessageData,
        sender: 'system' as const,
        senderId: undefined,
      };
      MockConversation.findById.mockResolvedValue(mockConversationInstance);

      // Act
      const result = await service.createMessage(systemMessageData);

      // Assert
      expect(result).toBeDefined();
      expect(result.sender).toBe('system');
    });

    it('should throw error when conversation not found', async () => {
      // Arrange
      MockConversation.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createMessage(validMessageData)).rejects.toThrow(
        'Conversa não encontrada',
      );
    });

    it('should throw ForbiddenException for user sending to closed conversation', async () => {
      // Arrange
      MockConversation.findById.mockResolvedValue({
        ...mockConversationInstance,
        status: CaseStatus.CLOSED,
      } as IConversation);

      // Act & Assert
      await expect(service.createMessage(validMessageData)).rejects.toThrow(
        ForbiddenException,
      );
      expect(MockMessage).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException for AI sending to non-active conversation', async () => {
      // Arrange
      const aiMessageData = { ...validMessageData, sender: 'ai' as const };
      MockConversation.findById.mockResolvedValue({
        ...mockConversationInstance,
        status: CaseStatus.CLOSED,
      } as IConversation);

      // Act & Assert
      await expect(service.createMessage(aiMessageData)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException for lawyer not assigned to conversation', async () => {
      // Arrange
      const lawyerMessageData = {
        ...validMessageData,
        sender: 'lawyer' as const,
        senderId: 'wrong-lawyer-id',
      };
      MockConversation.findById.mockResolvedValue({
        ...mockConversationInstance,
        status: CaseStatus.ASSIGNED_TO_LAWYER,
        assignedTo: 'lawyer-id-123',
      } as IConversation);

      // Act & Assert
      await expect(service.createMessage(lawyerMessageData)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException for invalid sender type', async () => {
      // Arrange
      const invalidMessageData = {
        ...validMessageData,
        sender: 'invalid' as MessageSender,
      };
      MockConversation.findById.mockResolvedValue(mockConversationInstance);

      // Act & Assert
      await expect(service.createMessage(invalidMessageData)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getMessages', () => {
    const requestingUser = {
      userId: 'user-id-123',
      role: 'lawyer',
      permissions: ['moderate_conversations'],
    } as any;

    const mockMessages: Partial<IMessage>[] = [
      {
        _id: 'msg-1',
        conversationId: 'conv-1' as any,
        text: 'Message 1',
        sender: 'user',
        createdAt: new Date(),
      },
      {
        _id: 'msg-2',
        conversationId: 'conv-1' as any,
        text: 'Message 2',
        sender: 'ai',
        createdAt: new Date(),
      },
    ];

    it('should get messages with conversation filter', async () => {
      // Arrange
      const filters: MessageFilters = { conversationId: 'conv-1' };
      MockConversation.findById.mockResolvedValue({
        ...mockConversationInstance,
        assignedTo: 'user-id-123', // Mesmo ID do requestingUser
      } as IConversation);

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessages),
      };
      MockMessage.find.mockReturnValue(
        mockQuery as unknown as Query<IMessage[], IMessage>,
      );

      // Act
      const result = await service.getMessages(filters, requestingUser);

      // Assert
      expect(result).toEqual(mockMessages);
      expect(MockConversation.findById).toHaveBeenCalledWith('conv-1');
    });

    it('should get messages with multiple filters', async () => {
      // Arrange
      const filters: MessageFilters = {
        conversationId: 'conv-1',
        sender: 'user',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        limit: 10,
        offset: 5,
      };
      MockConversation.findById.mockResolvedValue({
        ...mockConversationInstance,
        assignedTo: 'user-id-123', // Mesmo ID do requestingUser
      } as IConversation);

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockMessages[0]]),
      };
      MockMessage.find.mockReturnValue(
        mockQuery as unknown as Query<IMessage[], IMessage>,
      );

      // Act
      const result = await service.getMessages(filters, requestingUser);

      // Assert
      expect(result).toEqual([mockMessages[0]]);
      expect(MockMessage.find).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        sender: 'user',
        createdAt: {
          $gte: new Date('2024-01-01'),
          $lte: new Date('2024-12-31'),
        },
      });
    });

    it('should throw ForbiddenException for unauthorized lawyer access', async () => {
      // Arrange
      const filters: MessageFilters = { conversationId: 'conv-1' };
      MockConversation.findById.mockResolvedValue({
        ...mockConversationInstance,
        assignedTo: 'different-lawyer-id',
      } as IConversation);

      // Act & Assert
      await expect(
        service.getMessages(filters, requestingUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow super_admin access to any conversation', async () => {
      // Arrange
      const superAdminUser = {
        ...requestingUser,
        role: 'super_admin',
      } as any;
      const filters: MessageFilters = { conversationId: 'conv-1' };
      MockConversation.findById.mockResolvedValue(mockConversationInstance);
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockMessages),
      };
      MockMessage.find.mockReturnValue(
        mockQuery as unknown as Query<IMessage[], IMessage>,
      );

      // Act
      const result = await service.getMessages(filters, superAdminUser);

      // Assert
      expect(result).toEqual(mockMessages);
    });
  });

  describe('getMessageById', () => {
    const requestingUser = {
      userId: 'user-id-123',
      role: 'lawyer',
      permissions: ['moderate_conversations'],
    } as any;

    it('should get message by id successfully', async () => {
      // Arrange
      const messageId = 'msg-123';
      const mockMessage = {
        _id: messageId,
        conversationId: {
          _id: 'conv-1',
          roomId: 'room-1',
          status: CaseStatus.OPEN,
        },
        text: 'Test message',
        sender: 'user',
      } as unknown as IMessage;

      const mockQuery = {
        populate: jest.fn().mockResolvedValue(mockMessage),
      };
      MockMessage.findById.mockReturnValue(
        mockQuery as unknown as Query<IMessage | null, IMessage>,
      );
      MockConversation.findById.mockResolvedValue({
        ...mockConversationInstance,
        assignedTo: 'user-id-123', // Mesmo ID do requestingUser
      } as IConversation);

      // Act
      const result = await service.getMessageById(messageId, requestingUser);

      // Assert
      expect(result).toEqual(mockMessage);
      expect(MockMessage.findById).toHaveBeenCalledWith(messageId);
    });

    it('should throw error when message not found', async () => {
      // Arrange
      const messageId = 'non-existent-msg';
      const mockQuery = {
        populate: jest.fn().mockResolvedValue(null),
      };
      MockMessage.findById.mockReturnValue(
        mockQuery as unknown as Query<IMessage | null, IMessage>,
      );

      // Act & Assert
      await expect(
        service.getMessageById(messageId, requestingUser),
      ).rejects.toThrow('Mensagem não encontrada');
    });

    it('should throw ForbiddenException for unauthorized access', async () => {
      // Arrange
      const messageId = 'msg-123';
      const mockMessage = {
        _id: messageId,
        conversationId: {
          _id: 'conv-1',
          roomId: 'room-1',
          status: CaseStatus.OPEN,
        },
        text: 'Test message',
        sender: 'user',
      } as unknown as IMessage;

      const mockQuery = {
        populate: jest.fn().mockResolvedValue(mockMessage),
      };
      MockMessage.findById.mockReturnValue(
        mockQuery as unknown as Query<IMessage | null, IMessage>,
      );
      MockConversation.findById.mockResolvedValue({
        ...mockConversationInstance,
        assignedTo: 'different-lawyer-id',
      } as IConversation);

      // Act & Assert
      await expect(
        service.getMessageById(messageId, requestingUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('countMessages', () => {
    it('should count messages with filters', async () => {
      // Arrange
      const filters: MessageFilters = {
        conversationId: 'conv-1',
        sender: 'user',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };
      MockMessage.countDocuments.mockResolvedValue(5);

      // Act
      const result = await service.countMessages(filters);

      // Assert
      expect(result).toBe(5);
      expect(MockMessage.countDocuments).toHaveBeenCalledWith({
        conversationId: 'conv-1',
        sender: 'user',
        createdAt: {
          $gte: new Date('2024-01-01'),
          $lte: new Date('2024-12-31'),
        },
      });
    });

    it('should count all messages without filters', async () => {
      // Arrange
      const filters: MessageFilters = {};
      MockMessage.countDocuments.mockResolvedValue(25);

      // Act
      const result = await service.countMessages(filters);

      // Assert
      expect(result).toBe(25);
      expect(MockMessage.countDocuments).toHaveBeenCalledWith({});
    });
  });

  describe('validateConversationAccess', () => {
    it('should allow super_admin access', async () => {
      // Arrange
      const user = {
        userId: 'admin-123',
        role: 'super_admin',
        permissions: [],
      } as any;
      MockConversation.findById.mockResolvedValue(mockConversationInstance);

      // Act & Assert
      await expect(
        service['validateConversationAccess']('conv-1', user),
      ).resolves.not.toThrow();
    });

    it('should allow lawyer access to assigned conversation', async () => {
      // Arrange
      const user = {
        userId: 'lawyer-123',
        role: 'lawyer',
        permissions: [],
      } as any;
      MockConversation.findById.mockResolvedValue({
        ...mockConversationInstance,
        assignedTo: 'lawyer-123',
      } as IConversation);

      // Act & Assert
      await expect(
        service['validateConversationAccess']('conv-1', user),
      ).resolves.not.toThrow();
    });

    it('should deny lawyer access to unassigned conversation', async () => {
      // Arrange
      const user = {
        userId: 'lawyer-123',
        role: 'lawyer',
        permissions: [],
      } as any;
      MockConversation.findById.mockResolvedValue({
        ...mockConversationInstance,
        assignedTo: 'different-lawyer',
      } as IConversation);

      // Act & Assert
      await expect(
        service['validateConversationAccess']('conv-1', user),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow moderator access with permissions', async () => {
      // Arrange
      const user = {
        userId: 'mod-123',
        role: 'moderator',
        permissions: ['moderate_conversations'],
      } as any;
      MockConversation.findById.mockResolvedValue(mockConversationInstance);

      // Act & Assert
      await expect(
        service['validateConversationAccess']('conv-1', user),
      ).resolves.not.toThrow();
    });

    it('should deny moderator access without permissions', async () => {
      // Arrange
      const user = {
        userId: 'mod-123',
        role: 'moderator',
        permissions: [],
      } as any;
      MockConversation.findById.mockResolvedValue(mockConversationInstance);

      // Act & Assert
      await expect(
        service['validateConversationAccess']('conv-1', user),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should deny client access', async () => {
      // Arrange
      const user = {
        userId: 'client-123',
        role: 'client',
        permissions: [],
      } as any;
      MockConversation.findById.mockResolvedValue(mockConversationInstance);

      // Act & Assert
      await expect(
        service['validateConversationAccess']('conv-1', user),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw error for non-existent conversation', async () => {
      // Arrange
      const user = {
        userId: 'admin-123',
        role: 'super_admin',
        permissions: [],
      } as any;
      MockConversation.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service['validateConversationAccess']('non-existent', user),
      ).rejects.toThrow('Conversa não encontrada');
    });
  });
});
