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
      let conversation = await Conversation.findOne({ roomId });
      if (conversation) {
        const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });
        client.emit('load-history', messages.map(msg => ({
          id: msg._id.toString(),
          text: msg.text,
          sender: msg.sender,
        })));
      } else {
        // Criar nova conversa
        conversation = await Conversation.create({ roomId });
        // Não emitir mensagem inicial - deixar o frontend controlar a experiência
        client.emit('load-history', []);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      // Mesmo com erro de DB, permitir que o usuário continue
      client.emit('load-history', []);
    }
  }

  @SubscribeMessage('join-lawyer-room')
  @UseGuards(NextAuthGuard)
  async handleJoinLawyerRoom(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
    try {
      // Verificar se o usuário é advogado
      if (!client.data.user || !['lawyer', 'super_admin'].includes(client.data.user.role)) {
        client.emit('error', { message: 'Acesso negado - apenas advogados podem acessar' });
        return;
      }

      // Verificar se o caso existe
      const conversation = await Conversation.findOne({ roomId });
      if (!conversation) {
        client.emit('error', { message: 'Caso não encontrado' });
        return;
      }

      // Super admins podem acessar qualquer caso, advogados apenas casos atribuídos a eles
      if (client.data.user.role !== 'super_admin' && conversation.assignedTo !== client.data.user.userId) {
        client.emit('error', { message: 'Acesso negado - caso não atribuído a você' });
        return;
      }

      // Entrar na sala do cliente (para comunicação direta) e na sala específica do advogado
      client.join(roomId); // Sala principal do cliente
      client.join(`lawyer-${roomId}`); // Sala específica dos advogados
      
      console.log(`Advogado ${client.data.user.email} entrou na sala do caso ${roomId}`);

      // Carregar histórico completo da conversa
      const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });
      client.emit('lawyer-history-loaded', messages.map(msg => ({
        id: msg._id.toString(),
        text: msg.text,
        sender: msg.sender,
        createdAt: msg.createdAt,
      })));
    } catch (error) {
      console.error('Erro ao entrar na sala do advogado:', error);
      client.emit('error', { message: 'Erro interno do servidor' });
    }
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(@MessageBody() data: { roomId: string; message: string }, @ConnectedSocket() client: Socket) {
    const { roomId, message } = data;
    console.log(`Mensagem na sala ${roomId}: ${message}`);

    let conversation: any;

    try {
      // Tentar usar o banco de dados, mas continuar sem ele se necessário
      try {
        conversation = await Conversation.findOne({ roomId });
        if (!conversation) {
          conversation = new Conversation({ roomId });
          await conversation.save();
        }
      } catch (dbError) {
        console.warn('Erro de conexão com banco de dados, continuando sem persistência:', dbError.message);
        // Criar objeto de conversa temporário para teste
        conversation = { _id: `temp-${roomId}`, roomId };
      }

      // Criar mensagem do usuário
      let userMessage;
      try {
        userMessage = await this.messageService.createMessage({
          conversationId: conversation._id.toString(),
          text: message,
          sender: 'user',
          senderId: client.data.user?.userId, // Pode ser null para usuários anônimos
        });
      } catch (dbError) {
        console.warn('Erro ao salvar mensagem do usuário, continuando sem persistência');
        userMessage = { _id: `temp-msg-${Date.now()}`, text: message, sender: 'user' };
      }

      // Buscar mensagens para contexto (se o DB estiver funcionando)
      let messages: any[] = [];
      try {
        messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });
      } catch (dbError) {
        console.warn('Não foi possível carregar histórico de mensagens');
        // Usar apenas a mensagem atual como contexto
        messages = [userMessage];
      }

      // Gerar resposta da IA
      const aiResponseText = await this.geminiService.generateAIResponse(messages);

      // Salvar resposta da IA
      let aiMessage;
      try {
        aiMessage = await this.messageService.createMessage({
          conversationId: conversation._id.toString(),
          text: aiResponseText,
          sender: 'ai',
          metadata: { generatedBy: 'gemini' },
        });
      } catch (dbError) {
        console.warn('Erro ao salvar mensagem da IA, continuando sem persistência');
        aiMessage = { _id: `temp-ai-${Date.now()}`, text: aiResponseText, sender: 'ai' };
      }

      // Tentar classificar conversa (opcional)
      try {
        await this.aiService.classifyConversation(roomId, messages.concat([aiMessage]));
      } catch (classifyError) {
        console.warn('Erro ao classificar conversa:', classifyError.message);
      }

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

      // Tentar salvar mensagem de erro (opcional)
      try {
        if (conversation) {
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
        }
      } catch (dbError) {
        console.warn('Erro ao salvar mensagem de erro no banco de dados');
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
      // Verificar se o usuário é advogado
      if (!client.data.user || !['lawyer', 'super_admin'].includes(client.data.user.role)) {
        client.emit('error', { message: 'Acesso negado - apenas advogados podem enviar mensagens' });
        return;
      }

      const conversation = await Conversation.findOne({ roomId });
      if (!conversation) {
        client.emit('error', { message: 'Caso não encontrado' });
        return;
      }

      // Verificar permissão para o caso
      if (client.data.user.role !== 'super_admin' && conversation.assignedTo !== client.data.user.userId) {
        client.emit('error', { message: 'Acesso negado - caso não atribuído a você' });
        return;
      }

      // Criar mensagem do advogado usando o MessageService
      const lawyerMessage = await this.messageService.createMessage({
        conversationId: conversation._id.toString(),
        text: message,
        sender: 'lawyer',
        senderId: client.data.user?.userId,
        metadata: { lawyerRole: client.data.user?.role },
      });

      // Enviar para todos na sala do cliente (sala principal)
      this.server.to(roomId).emit('receive-message', {
        text: message,
        sender: 'lawyer', // Cliente verá como mensagem do advogado
        messageId: lawyerMessage._id.toString(),
        createdAt: lawyerMessage.createdAt
      });

      // Também enviar confirmação para todos os advogados na sala específica
      this.server.to(`lawyer-${roomId}`).emit('receive-lawyer-message', {
        text: message,
        sender: 'lawyer',
        messageId: lawyerMessage._id.toString(),
        createdAt: lawyerMessage.createdAt
      });

      console.log(`Mensagem do advogado ${client.data.user.email} enviada para caso ${roomId}: ${message}`);
    } catch (error) {
      console.error('Erro ao enviar mensagem do advogado:', error);
      client.emit('error', {
        message: 'Erro ao enviar mensagem'
      });
    }
  }
}