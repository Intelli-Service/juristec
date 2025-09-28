import { Injectable, ForbiddenException } from '@nestjs/common';
import Message, { MessageSender } from '../models/Message';
import Conversation from '../models/Conversation';

export interface CreateMessageData {
  conversationId: string;
  text: string;
  sender: MessageSender;
  senderId?: string;
  metadata?: Record<string, any>;
}

export interface MessageFilters {
  conversationId?: string;
  sender?: MessageSender;
  senderId?: string;
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class MessageService {
  /**
   * Cria uma nova mensagem com validações robustas
   */
  async createMessage(data: CreateMessageData): Promise<any> {
    // Validar se a conversa existe
    const conversation = await Conversation.findById(data.conversationId);
    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }

    // Validar permissões baseadas no tipo de sender
    this.validateMessagePermissions(data, conversation);

    // Criar a mensagem
    const message = new Message({
      conversationId: data.conversationId,
      text: data.text.trim(),
      sender: data.sender,
      senderId: data.senderId,
      metadata: data.metadata || {},
    });

    const savedMessage = await message.save();

    // Atualizar timestamp da conversa
    await Conversation.findByIdAndUpdate(data.conversationId, {
      updatedAt: new Date(),
    });

    return savedMessage;
  }

  /**
   * Busca mensagens com filtros e validações de permissões
   */
  async getMessages(
    filters: MessageFilters,
    requestingUser: { userId: string; role: string; permissions: string[] },
  ): Promise<any[]> {
    // Validar se o usuário tem permissão para acessar as mensagens
    if (filters.conversationId) {
      await this.validateConversationAccess(
        filters.conversationId,
        requestingUser,
      );
    }

    const query: any = {};

    if (filters.conversationId) {
      query.conversationId = filters.conversationId;
    }

    if (filters.sender) {
      query.sender = filters.sender;
    }

    if (filters.senderId) {
      query.senderId = filters.senderId;
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .limit(filters.limit || 100)
      .skip(filters.offset || 0)
      .populate('conversationId', 'roomId status')
      .exec();

    return messages;
  }

  /**
   * Busca uma mensagem específica por ID
   */
  async getMessageById(
    messageId: string,
    requestingUser: { userId: string; role: string; permissions: string[] },
  ): Promise<any> {
    const message = await Message.findById(messageId).populate(
      'conversationId',
      'roomId status',
    );

    if (!message) {
      throw new Error('Mensagem não encontrada');
    }

    // Validar acesso à conversa
    await this.validateConversationAccess(
      message.conversationId._id.toString(),
      requestingUser,
    );

    return message;
  }

  /**
   * Valida se um usuário tem permissão para criar uma mensagem
   */
  private validateMessagePermissions(
    data: CreateMessageData,
    conversation: any,
  ): void {
    switch (data.sender) {
      case 'user':
        // Usuários podem enviar mensagens apenas se a conversa não estiver fechada
        if (conversation.status === 'closed') {
          throw new ForbiddenException(
            'Não é possível enviar mensagens para uma conversa fechada',
          );
        }
        break;

      case 'ai':
        // IA pode enviar mensagens apenas em conversas ativas
        if (!['open', 'assigned'].includes(conversation.status)) {
          throw new ForbiddenException(
            'IA não pode enviar mensagens para esta conversa',
          );
        }
        break;

      case 'lawyer':
        // Advogados só podem enviar se estiverem atribuídos ao caso
        if (conversation.assignedTo !== data.senderId) {
          throw new ForbiddenException(
            'Advogado não autorizado para esta conversa',
          );
        }
        if (conversation.status !== 'assigned') {
          throw new ForbiddenException(
            'Caso deve estar atribuído para receber mensagens do advogado',
          );
        }
        break;

      case 'moderator':
        // Moderadores podem enviar mensagens em qualquer conversa ativa
        if (!['open', 'assigned'].includes(conversation.status)) {
          throw new ForbiddenException(
            'Moderador não pode enviar mensagens para esta conversa',
          );
        }
        break;

      case 'system':
        // Sistema pode enviar mensagens em qualquer situação
        break;

      default:
        throw new ForbiddenException('Tipo de sender inválido');
    }
  }

  /**
   * Valida se um usuário tem permissão para acessar uma conversa
   */
  private async validateConversationAccess(
    conversationId: string,
    requestingUser: { userId: string; role: string; permissions: string[] },
  ): Promise<void> {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }

    switch (requestingUser.role) {
      case 'super_admin':
        // Super admin tem acesso total
        return;

      case 'anonymous':
        // Usuários anônimos só acessam suas próprias conversas
        if (conversation.userId !== requestingUser.userId) {
          throw new ForbiddenException('Acesso negado a esta conversa');
        }
        break;

      case 'lawyer':
        // Advogados só acessam casos atribuídos a eles
        if (conversation.assignedTo !== requestingUser.userId) {
          throw new ForbiddenException('Acesso negado a esta conversa');
        }
        break;

      case 'moderator':
        // Moderadores acessam todas as conversas ativas
        if (!requestingUser.permissions.includes('moderate_conversations')) {
          throw new ForbiddenException('Permissões insuficientes');
        }
        break;

      case 'anonymous':
        // Usuários anônimos só acessam suas próprias conversas
        if (conversation.userId !== requestingUser.userId) {
          throw new ForbiddenException('Acesso negado a esta conversa');
        }
        break;

      case 'client':
        // Clientes só acessam suas próprias conversas (não implementado ainda)
        throw new ForbiddenException(
          'Clientes não têm acesso direto às mensagens',
        );
        break;

      default:
        throw new ForbiddenException('Role não autorizado');
    }
  }

  /**
   * Conta mensagens por filtros
   */
  async countMessages(filters: MessageFilters): Promise<number> {
    const query: any = {};

    if (filters.conversationId) {
      query.conversationId = filters.conversationId;
    }

    if (filters.sender) {
      query.sender = filters.sender;
    }

    if (filters.senderId) {
      query.senderId = filters.senderId;
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = filters.startDate;
      if (filters.endDate) query.createdAt.$lte = filters.endDate;
    }

    return Message.countDocuments(query);
  }
}
