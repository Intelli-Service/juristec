import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NextAuthGuard } from '../guards/nextauth.guard';
import { GeminiService } from '../lib/gemini.service';
import { AIService } from '../lib/ai.service';
import { MessageService } from '../lib/message.service';
import Conversation from '../models/Conversation';
import Message from '../models/Message';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:8080'], // Allow Next.js and nginx proxy
    methods: ['GET', 'POST'],
  },
})
@Injectable()
// @UseGuards(NextAuthGuard) // Removido para permitir clientes anônimos
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly geminiService: GeminiService,
    private readonly aiService: AIService,
    private readonly jwtService: JwtService,
    private readonly messageService: MessageService
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Tentar autenticar se houver token, mas permitir conexões anônimas
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];

      if (token) {
        const payload = this.jwtService.verify(token, { secret: process.env.NEXTAUTH_SECRET || 'fallback-secret' });
        client.data.user = payload;
        client.data.isAuthenticated = true;
        console.log('Usuário autenticado conectado:', client.id, 'User:', payload.email);
      } else {
        client.data.isAuthenticated = false;
        client.data.user = null;
        console.log('Cliente anônimo conectado:', client.id);
      }
    } catch (error) {
      // Se o token for inválido, tratar como anônimo
      client.data.isAuthenticated = false;
      client.data.user = null;
      console.log('Cliente anônimo conectado (token inválido):', client.id);
    }
  }

  handleDisconnect(client: Socket) {
    console.log('Usuário desconectado:', client.id);
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
    client.join(roomId);
    console.log(`Usuário ${client.id} entrou na sala ${roomId}`);

    try {
      const conversation = await Conversation.findOne({ roomId });
      if (conversation) {
        const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });
        client.emit('load-history', messages.map(msg => ({
          id: msg._id.toString(),
          text: msg.text,
          sender: msg.sender,
        })));
      } else {
        // Criar nova conversa
        await Conversation.create({ roomId });
        // Não emitir mensagem inicial - deixar o frontend controlar a experiência
        client.emit('load-history', []);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  }

  @SubscribeMessage('join-lawyer-room')
  async handleJoinLawyerRoom(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
    // Verificar se o usuário é advogado e tem acesso ao caso
    const conversation = await Conversation.findOne({ roomId });
    if (!conversation) {
      client.emit('error', { message: 'Caso não encontrado' });
      return;
    }

    if (conversation.assignedTo !== client.data.user.userId && client.data.user.role !== 'super_admin') {
      client.emit('error', { message: 'Acesso negado a este caso' });
      return;
    }

    client.join(`lawyer-${roomId}`);
    console.log(`Advogado ${client.data.user.email} entrou na sala do caso ${roomId}`);

    // Carregar histórico completo da conversa
    const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });
    client.emit('lawyer-history-loaded', messages.map(msg => ({
      id: msg._id.toString(),
      text: msg.text,
      sender: msg.sender,
      createdAt: msg.createdAt,
    })));
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(@MessageBody() data: { roomId: string; message: string }, @ConnectedSocket() client: Socket) {
    const { roomId, message } = data;
    console.log(`Mensagem na sala ${roomId}: ${message}`);

    let conversation: any;

    try {
      conversation = await Conversation.findOne({ roomId });
      if (!conversation) {
        conversation = new Conversation({ roomId });
        await conversation.save();
      }

      // Criar mensagem do usuário usando o MessageService
      const userMessage = await this.messageService.createMessage({
        conversationId: conversation._id.toString(),
        text: message,
        sender: 'user',
        senderId: client.data.user?.userId, // Pode ser null para usuários anônimos
      });

      const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });

      const aiResponseText = await this.geminiService.generateAIResponse(messages);

      // Criar mensagem da IA usando o MessageService
      const aiMessage = await this.messageService.createMessage({
        conversationId: conversation._id.toString(),
        text: aiResponseText,
        sender: 'ai',
        metadata: { generatedBy: 'gemini' },
      });

      // Classificar conversa após resposta da IA
      await this.aiService.classifyConversation(roomId, messages.concat([aiMessage]));

      this.server.to(roomId).emit('receive-message', {
        text: aiResponseText,
        sender: 'ai',
        messageId: aiMessage._id.toString()
      });
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);

      let errorMessage = 'Desculpe, ocorreu um erro interno. Tente novamente em alguns instantes.';
      let shouldRetry = false;

      // Tratar erros específicos da API do Google Gemini
      if (error.message?.includes('503') || error.message?.includes('Service Unavailable')) {
        errorMessage = 'O assistente está temporariamente indisponível devido à alta demanda. Aguarde alguns minutos e tente novamente.';
        shouldRetry = true;
      } else if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
        errorMessage = 'Muitas solicitações foram feitas. Aguarde alguns minutos antes de tentar novamente.';
        shouldRetry = true;
      } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        errorMessage = 'Erro de autenticação com o serviço de IA. Entre em contato com o suporte.';
      } else if (error.message?.includes('400') || error.message?.includes('Bad Request')) {
        errorMessage = 'A mensagem enviada não pôde ser processada. Tente reformular sua pergunta.';
      }

      // Criar mensagem de erro no banco de dados para rastreamento
      try {
        await this.messageService.createMessage({
          conversationId: conversation._id.toString(),
          text: errorMessage,
          sender: 'system',
          metadata: {
            error: true,
            originalError: error.message,
            shouldRetry
          },
        });
      } catch (dbError) {
        console.error('Erro ao salvar mensagem de erro:', dbError);
      }

      this.server.to(roomId).emit('receive-message', {
        text: errorMessage,
        sender: 'system',
        messageId: `error-${Date.now()}`,
        isError: true,
        shouldRetry
      });
    }
  }

  @SubscribeMessage('send-lawyer-message')
  @UseGuards(NextAuthGuard)
  async handleSendLawyerMessage(@MessageBody() data: { roomId: string; message: string }, @ConnectedSocket() client: Socket) {
    const { roomId, message } = data;

    try {
      const conversation = await Conversation.findOne({ roomId });
      if (!conversation) {
        throw new Error('Caso não encontrado');
      }

      // Criar mensagem do advogado usando o MessageService
      const lawyerMessage = await this.messageService.createMessage({
        conversationId: conversation._id.toString(),
        text: message,
        sender: 'lawyer',
        senderId: client.data.user?.userId,
        metadata: { lawyerRole: client.data.user?.role },
      });

      // Enviar para todos na sala do caso (cliente e outros advogados)
      this.server.to(roomId).emit('receive-message', {
        text: message,
        sender: 'lawyer',
        messageId: lawyerMessage._id.toString()
      });

      // Também enviar para advogados na sala específica do advogado
      this.server.to(`lawyer-${roomId}`).emit('receive-lawyer-message', {
        text: message,
        sender: 'lawyer',
        messageId: lawyerMessage._id.toString()
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem do advogado:', error);
      this.server.to(`lawyer-${roomId}`).emit('error', {
        message: 'Erro ao enviar mensagem'
      });
    }
  }
}