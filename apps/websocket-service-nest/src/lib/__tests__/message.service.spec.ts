import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { MessageService, CreateMessageData, MessageFilters } from '../message.service';
import Message from '../../models/Message';
import Conversation from '../../models/Conversation';

// Mock dos modelos
jest.mock('../../models/Message');
jest.mock('../../models/Conversation');

const MockMessage = Message as jest.MockedFunction<any>;
const MockConversation = Conversation as jest.MockedFunction<any>;

describe('MessageService', () => {
  let service: MessageService;
  let mockMessageInstance: any;
  let mockConversationInstance: any;

  beforeEach(async () => {
    // Reset dos mocks
    jest.clearAllMocks();

    // Criar instâncias mockadas
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
    };

    mockConversationInstance = {
      _id: 'conversation-id-123',
      roomId: 'room-123',
      status: 'open',
      assignedTo: 'lawyer-id-123',
      save: jest.fn().mockResolvedValue(mockConversationInstance),
    };

    // Configurar Message mock
    MockMessage.mockImplementation((data) => ({
      ...mockMessageInstance,
      ...data,
      save: jest.fn().mockResolvedValue({
        ...mockMessageInstance,
        ...data,
      }),
    }));
    MockMessage.find = jest.fn();
    MockMessage.findById = jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: 'msg-123',
        conversationId: { _id: 'conv-1', roomId: 'room-1', status: 'open' },
        text: 'Test message',
        sender: 'user',
      }),
    });
    MockMessage.countDocuments = jest.fn();
    MockMessage.findByIdAndUpdate = jest.fn();

    // Configurar Conversation mock
    MockConversation.mockImplementation(() => mockConversationInstance);
    MockConversation.findById = jest.fn();
    MockConversation.findByIdAndUpdate = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [MessageService],
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
      });
      MockMessage.findByIdAndUpdate.mockResolvedValue(mockConversationInstance);

      // Act
      const result = await service.createMessage(validMessageData);

      // Assert
      expect(result).toBeDefined();
      expect(result.text).toBe('Test message');
      expect(result.sender).toBe('user');
      expect(MockConversation.findById).toHaveBeenCalledWith('conversation-id-123');
      expect(MockConversation.findByIdAndUpdate).toHaveBeenCalledWith('conversation-id-123', {
        updatedAt: expect.any(Date),
      });
    });

    it('should create a message successfully for AI sender', async () => {
      // Arrange
      const aiMessageData = { ...validMessageData, sender: 'ai' as const };
      MockConversation.findById.mockResolvedValue({
        ...mockConversationInstance,
        status: 'open',
      });

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
        status: 'assigned',
        assignedTo: 'lawyer-id-123',
      });

      // Act
      const result = await service.createMessage(lawyerMessageData);

      // Assert
      expect(result).toBeDefined();
      expect(result.sender).toBe('lawyer');
    });

    it('should create a message successfully for system sender', async () => {
      // Arrange
      const systemMessageData = {
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
        'Conversa não encontrada'
      );
    });

    it('should throw ForbiddenException for user sending to closed conversation', async () => {
      // Arrange
      MockConversation.findById.mockResolvedValue({
        ...mockConversationInstance,
        status: 'closed',
      });

      // Act & Assert
      await expect(service.createMessage(validMessageData)).rejects.toThrow(
        ForbiddenException
      );
      expect(MockMessage).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException for AI sending to non-active conversation', async () => {
      // Arrange
      const aiMessageData = { ...validMessageData, sender: 'ai' as const };
      MockConversation.findById.mockResolvedValue({
        ...mockConversationInstance,
        status: 'closed',
      });

      // Act & Assert
      await expect(service.createMessage(aiMessageData)).rejects.toThrow(
        ForbiddenException
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
        status: 'assigned',
        assignedTo: 'lawyer-id-123',
      });

      // Act & Assert
      await expect(service.createMessage(lawyerMessageData)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw ForbiddenException for invalid sender type', async () => {
      // Arrange
      const invalidMessageData = {
        ...validMessageData,
        sender: 'invalid' as any,
      };
      MockConversation.findById.mockResolvedValue(mockConversationInstance);

      // Act & Assert
      await expect(service.createMessage(invalidMessageData)).rejects.toThrow(
        ForbiddenException
      );
    });
  });

  describe('getMessages', () => {
    const requestingUser = {
      userId: 'user-id-123',
      role: 'lawyer',
      permissions: ['moderate_conversations'],
    };

    const mockMessages = [
      {
        _id: 'msg-1',
        conversationId: { _id: 'conv-1', roomId: 'room-1', status: 'open' },
        text: 'Message 1',
        sender: 'user',
        createdAt: new Date(),
      },
      {
        _id: 'msg-2',
        conversationId: { _id: 'conv-1', roomId: 'room-1', status: 'open' },
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
      });
      MockMessage.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockMessages),
              }),
            }),
          }),
        }),
      });

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
      });
      MockMessage.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue([mockMessages[0]]),
              }),
            }),
          }),
        }),
      });

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
      });

      // Act & Assert
      await expect(service.getMessages(filters, requestingUser)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should allow super_admin access to any conversation', async () => {
      // Arrange
      const superAdminUser = { ...requestingUser, role: 'super_admin' };
      const filters: MessageFilters = { conversationId: 'conv-1' };
      MockConversation.findById.mockResolvedValue(mockConversationInstance);
      MockMessage.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockMessages),
              }),
            }),
          }),
        }),
      });

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
    };

    it('should get message by id successfully', async () => {
      // Arrange
      const messageId = 'msg-123';
      const mockMessage = {
        _id: messageId,
        conversationId: { _id: 'conv-1', roomId: 'room-1', status: 'open' },
        text: 'Test message',
        sender: 'user',
      };
      MockMessage.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockMessage),
      });
      MockConversation.findById.mockResolvedValue({
        ...mockConversationInstance,
        assignedTo: 'user-id-123', // Mesmo ID do requestingUser
      });

      // Act
      const result = await service.getMessageById(messageId, requestingUser);

      // Assert
      expect(result).toEqual(mockMessage);
      expect(MockMessage.findById).toHaveBeenCalledWith(messageId);
    });

    it('should throw error when message not found', async () => {
      // Arrange
      const messageId = 'non-existent-msg';
      MockMessage.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(service.getMessageById(messageId, requestingUser)).rejects.toThrow(
        'Mensagem não encontrada'
      );
    });

    it('should throw ForbiddenException for unauthorized access', async () => {
      // Arrange
      const messageId = 'msg-123';
      const mockMessage = {
        _id: messageId,
        conversationId: { _id: 'conv-1', roomId: 'room-1', status: 'open' },
        text: 'Test message',
        sender: 'user',
      };
      MockMessage.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockMessage),
      });
      MockConversation.findById.mockResolvedValue({
        ...mockConversationInstance,
        assignedTo: 'different-lawyer-id',
      });

      // Act & Assert
      await expect(service.getMessageById(messageId, requestingUser)).rejects.toThrow(
        ForbiddenException
      );
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
      const user = { userId: 'admin-123', role: 'super_admin', permissions: [] };
      MockConversation.findById.mockResolvedValue(mockConversationInstance);

      // Act & Assert
      await expect(service['validateConversationAccess']('conv-1', user)).resolves.not.toThrow();
    });

    it('should allow lawyer access to assigned conversation', async () => {
      // Arrange
      const user = { userId: 'lawyer-123', role: 'lawyer', permissions: [] };
      MockConversation.findById.mockResolvedValue({
        ...mockConversationInstance,
        assignedTo: 'lawyer-123',
      });

      // Act & Assert
      await expect(service['validateConversationAccess']('conv-1', user)).resolves.not.toThrow();
    });

    it('should deny lawyer access to unassigned conversation', async () => {
      // Arrange
      const user = { userId: 'lawyer-123', role: 'lawyer', permissions: [] };
      MockConversation.findById.mockResolvedValue({
        ...mockConversationInstance,
        assignedTo: 'different-lawyer',
      });

      // Act & Assert
      await expect(service['validateConversationAccess']('conv-1', user)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should allow moderator access with permissions', async () => {
      // Arrange
      const user = {
        userId: 'mod-123',
        role: 'moderator',
        permissions: ['moderate_conversations'],
      };
      MockConversation.findById.mockResolvedValue(mockConversationInstance);

      // Act & Assert
      await expect(service['validateConversationAccess']('conv-1', user)).resolves.not.toThrow();
    });

    it('should deny moderator access without permissions', async () => {
      // Arrange
      const user = { userId: 'mod-123', role: 'moderator', permissions: [] };
      MockConversation.findById.mockResolvedValue(mockConversationInstance);

      // Act & Assert
      await expect(service['validateConversationAccess']('conv-1', user)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should deny client access', async () => {
      // Arrange
      const user = { userId: 'client-123', role: 'client', permissions: [] };
      MockConversation.findById.mockResolvedValue(mockConversationInstance);

      // Act & Assert
      await expect(service['validateConversationAccess']('conv-1', user)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should throw error for non-existent conversation', async () => {
      // Arrange
      const user = { userId: 'admin-123', role: 'super_admin', permissions: [] };
      MockConversation.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service['validateConversationAccess']('non-existent', user)).rejects.toThrow(
        'Conversa não encontrada'
      );
    });
  });
});