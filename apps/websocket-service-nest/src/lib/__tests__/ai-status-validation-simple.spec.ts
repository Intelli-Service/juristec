/**
 * Testes Simples - AI Status Validation
 *
 * Testa apenas a funcionalidade crítica de validação de status para mensagens da IA
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { MessageService } from '../message.service';
import Conversation from '../../models/Conversation';
import Message from '../../models/Message';
import { CaseStatus } from '../../models/User';

// Mock dos modelos
jest.mock('../../models/Conversation');
jest.mock('../../models/Message');

describe('AI Status Validation - Critical Tests', () => {
  let service: MessageService;

  const mockConversation = {
    _id: 'conv-123',
    roomId: 'room-123',
    userId: 'user-123',
    status: CaseStatus.ACTIVE,
    isActive: true,
  };

  const validAIMessageData = {
    conversationId: 'conv-123',
    text: 'AI response',
    sender: 'ai' as const,
    senderId: 'ai-gemini',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessageService],
    }).compile();

    service = module.get<MessageService>(MessageService);
    jest.clearAllMocks();

    // Setup mocks - Simular comportamento de save
    const mockSavedMessage = {
      _id: 'msg-123',
      ...validAIMessageData,
      createdAt: new Date(),
    };

    (Message as any).mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(mockSavedMessage),
    }));

    (Conversation.findById as jest.Mock).mockResolvedValue(mockConversation);
    (Conversation.findByIdAndUpdate as jest.Mock).mockResolvedValue(
      mockConversation,
    );
  });

  /**
   * CRÍTICO: IA deve conseguir enviar mensagens em conversas ACTIVE
   * (Esta era a correção principal implementada)
   */
  it('✅ should ALLOW AI messages in ACTIVE conversations', async () => {
    // Arrange
    (Conversation.findById as jest.Mock).mockResolvedValue({
      ...mockConversation,
      status: CaseStatus.ACTIVE,
    });

    // Act & Assert - Should NOT throw
    const result = await service.createMessage(validAIMessageData);
    expect(result).toBeDefined();
    expect(result._id).toBe('msg-123');
  });

  /**
   * SEGURANÇA: IA não deve conseguir enviar mensagens em conversas CLOSED
   */
  it('🚫 should REJECT AI messages in COMPLETED conversations', async () => {
    // Arrange
    (Conversation.findById as jest.Mock).mockResolvedValue({
      ...mockConversation,
      status: CaseStatus.COMPLETED,
    });

    // Act & Assert - Should throw ForbiddenException
    await expect(service.createMessage(validAIMessageData)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.createMessage(validAIMessageData)).rejects.toThrow(
      'IA não pode enviar mensagens para esta conversa',
    );
  });

  /**
   * COMPATIBILIDADE: IA deve continuar funcionando em conversas OPEN
   */
  it('✅ should ALLOW AI messages in OPEN conversations', async () => {
    // Arrange
    (Conversation.findById as jest.Mock).mockResolvedValue({
      ...mockConversation,
      status: CaseStatus.OPEN,
    });

    // Act & Assert - Should NOT throw
    const result = await service.createMessage(validAIMessageData);
    expect(result).toBeDefined();
  });

  /**
   * COMPATIBILIDADE: IA deve continuar funcionando em conversas ASSIGNED
   */
  it('✅ should ALLOW AI messages in ASSIGNED conversations', async () => {
    // Arrange
    (Conversation.findById as jest.Mock).mockResolvedValue({
      ...mockConversation,
      status: CaseStatus.ASSIGNED_TO_LAWYER,
    });

    // Act & Assert - Should NOT throw
    const result = await service.createMessage(validAIMessageData);
    expect(result).toBeDefined();
  });

  /**
   * VALIDAÇÃO: Deve rejeitar conversa inexistente
   */
  it('🚫 should REJECT messages for non-existent conversations', async () => {
    // Arrange
    (Conversation.findById as jest.Mock).mockResolvedValue(null);

    // Act & Assert
    await expect(service.createMessage(validAIMessageData)).rejects.toThrow(
      'Conversa não encontrada',
    );
  });
});
