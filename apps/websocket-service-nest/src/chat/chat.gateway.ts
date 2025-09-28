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
import { IntelligentUserRegistrationService } from '../lib/intelligent-user-registration.service';
import { FluidRegistrationService } from '../lib/fluid-registration.service';
import { VerificationService } from '../lib/verification.service';
import { BillingService } from '../lib/billing.service';
import Conversation from '../models/Conversation';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:8080'], // Allow Next.js and nginx proxy
    methods: ['GET', 'POST'],
    credentials: true, // Permitir envio de cookies
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
    private readonly messageService: MessageService,
    private readonly intelligentRegistrationService: IntelligentUserRegistrationService,
    private readonly fluidRegistrationService: FluidRegistrationService,
    private readonly verificationService: VerificationService,
    private readonly billingService: BillingService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extrair token JWT do NextAuth (cookies ou auth token)
      let token: string | null = null;

      // Primeiro tentar do handshake auth (caso seja passado diretamente)
      if (client.handshake.auth?.token) {
        token = client.handshake.auth.token;
      }

      // Se não encontrou, tentar extrair do cookie next-auth.session-token
      if (!token && client.handshake.headers?.cookie) {
        const cookies = client.handshake.headers.cookie;

        // Extrair cookie next-auth.session-token
        const sessionCookie = this.parseCookie(
          cookies,
          'next-auth.session-token',
        );
        if (sessionCookie) {
          token = sessionCookie;
        }
      }

      // Se não encontrou, tentar do header Authorization
      if (!token && client.handshake.headers?.authorization) {
        const authHeader = client.handshake.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }

      if (token) {
        try {
          const payload = this.jwtService.verify(token, {
            secret:
              process.env.NEXTAUTH_SECRET || 'juristec_auth_key_2025_32bytes_',
          });
          console.log('payload', JSON.stringify(payload, null, 2));

          client.data.user = payload;
          client.data.isAuthenticated = !payload.isAnonymous; // Usuários anônimos têm isAnonymous: true
          client.data.userId = payload.userId || payload.sub;
          client.data.isAnonymous = payload.isAnonymous || false;

          console.log(
            `Token válido - UserId: ${client.data.userId}, Anônimo: ${client.data.isAnonymous}, Autenticado: ${client.data.isAuthenticated}`,
          );
          console.log('Payload completo:', payload);
        } catch (error) {
          console.log(
            `Token inválido: ${error.message} - desconectando cliente`,
          );
          console.log('Token que falhou:', token.substring(0, 50) + '...');
          client.data.isAuthenticated = false;
          client.data.user = null;
          client.data.userId = '';
          client.data.isAnonymous = false;

          // Desconectar imediatamente clientes com token inválido
          setTimeout(() => {
            client.disconnect(true);
          }, 100);

          return; // Não continua a execução
        }
      } else {
        console.log('Nenhum token fornecido - desconectando cliente');
        console.log('Headers recebidos:', client.handshake.headers);
        client.data.isAuthenticated = false;
        client.data.user = null;
        client.data.userId = '';
        client.data.isAnonymous = false;

        // Desconectar imediatamente clientes sem token
        setTimeout(() => {
          client.disconnect(true);
        }, 100); // Pequeno delay para permitir que a mensagem de erro seja enviada

        return; // Não continua a execução
      }

      console.log(`Dados do cliente configurados:`, {
        id: client.id,
        isAuthenticated: client.data.isAuthenticated,
        isAnonymous: client.data.isAnonymous,
        userId: client.data.userId,
        user: client.data.user
          ? { email: client.data.user.email, role: client.data.user.role }
          : null,
      });
    } catch (error) {
      console.error('Erro na conexão WebSocket:', error);
      client.data.isAuthenticated = false;
      client.data.user = null;
      client.data.userId = '';
      client.data.isAnonymous = false;
    }
  }

  handleDisconnect(_client: Socket) {}

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @MessageBody() _data: object = {},
    @ConnectedSocket() client: Socket,
  ) {
    console.log(`=== CLIENTE ENTRANDO NA SALA ===`);
    console.log(
      `Cliente ${client.id} - UserId: ${client.data.userId}, Anônimo: ${client.data.isAnonymous}, Autenticado: ${client.data.isAuthenticated}`,
    );

    // Verificar se o cliente tem um userId válido
    if (!client.data.userId) {
      console.log(`Cliente ${client.id} rejeitado - sem userId válido`);
      client.emit('error', {
        message: 'Sessão inválida. Recarregue a página.',
      });
      return;
    }

    // Usar userId como roomId
    const roomId = client.data.userId;
    console.log(`Cliente ${client.id} entrando na sala: ${roomId}`);

    // Adicionar cliente à sala
    void client.join(roomId);
    console.log(`Cliente ${client.id} adicionado à sala ${roomId}`);

    // Tentar carregar histórico da conversa baseado no userId
    try {
      // Buscar conversa por userId (todos os usuários têm userId consistente)
      let conversation = await Conversation.findOne({
        userId: client.data.userId,
      });

      if (conversation) {
        console.log(`Conversa encontrada para userId ${client.data.userId}`);
        const messages = await this.messageService.getMessages(
          { conversationId: conversation._id },
          {
            userId: client.data.userId,
            role: client.data.isAuthenticated ? 'client' : 'anonymous',
            permissions: ['read'],
          },
        );

        client.emit(
          'load-history',
          messages.map((msg) => ({
            id: msg._id.toString(),
            text: msg.text,
            sender: msg.sender,
            timestamp: msg.createdAt,
          })),
        );

        // 🚀 NOVO: Enviar informações da conversa para o frontend
        client.emit('set-conversation', {
          conversationId: conversation._id.toString(),
          roomId: conversation.roomId,
          status: conversation.status,
          title: conversation.title || `Conversa #${conversation._id.toString().slice(-6)}`,
        });

        console.log(
          `Histórico carregado para userId ${client.data.userId}: ${messages.length} mensagens`,
        );
      } else {
        // Criar nova conversa associada ao userId com suporte a múltiplas conversas
        console.log(`Criando nova conversa para userId ${client.data.userId}`);
        
        // Gerar número sequencial da conversa para este usuário
        const existingConversations = await Conversation.countDocuments({
          userId: client.data.userId,
          isActive: true
        });
        const conversationNumber = existingConversations + 1;
        
        // Gerar roomId único para múltiplas conversas
        const newRoomId = `user_${client.data.userId}_conv_${Date.now()}`;
        
        conversation = await Conversation.create({
          roomId: newRoomId,
          userId: client.data.userId,
          isAuthenticated: client.data.isAuthenticated,
          user: client.data.user,
          
          // 🚀 NOVOS CAMPOS: Múltiplas conversas
          title: `Conversa #${conversationNumber}`,
          isActive: true,
          lastMessageAt: new Date(),
          unreadCount: 0,
          conversationNumber,
        });

        client.emit('load-history', []);
        
        // 🚀 NOVO: Enviar informações da conversa recém-criada para o frontend
        client.emit('set-conversation', {
          conversationId: conversation._id.toString(),
          roomId: conversation.roomId,
          status: conversation.status,
          title: conversation.title,
        });
        console.log(
          `Nova conversa criada para userId ${client.data.userId} na sala ${roomId}`,
        );
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      // Mesmo com erro de DB, permitir que o usuário continue
      client.emit('load-history', []);
    }
  }

  // 🚀 NOVO: Handler para conectar a todas as conversas ativas do usuário
  @SubscribeMessage('join-all-conversations')
  async handleJoinAllConversations(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    
    if (!userId) {
      client.emit('error', { message: 'UserId não encontrado' });
      return;
    }

    try {
      // Buscar TODAS as conversas ativas do usuário
      const conversations = await Conversation.find({
        userId,
        isActive: true
      }).sort({ lastMessageAt: -1 });

      console.log(`🔗 Conectando usuário ${userId} a ${conversations.length} conversas`);

      // Conectar a TODAS as salas simultaneamente
      const roomsJoined = [];
      for (const conv of conversations) {
        await client.join(conv.roomId);
        roomsJoined.push(conv.roomId);
      }

      console.log(`✅ Cliente ${client.id} conectado a salas: ${roomsJoined.join(', ')}`);

      // Retornar lista de conversas para o frontend
      client.emit('conversations-loaded', {
        conversations: conversations.map(conv => ({
          id: conv._id.toString(),
          roomId: conv.roomId,
          title: conv.title,
          status: conv.status,
          unreadCount: conv.unreadCount,
          lastMessageAt: conv.lastMessageAt,
          conversationNumber: conv.conversationNumber,
          classification: conv.classification
        })),
        activeRooms: roomsJoined
      });

    } catch (error) {
      console.error('❌ Erro ao conectar a múltiplas conversas:', error);
      client.emit('error', { message: 'Erro ao carregar conversas' });
    }
  }

  // 🚀 NOVO: Handler para criar nova conversa
  @SubscribeMessage('create-new-conversation')
  async handleCreateNewConversation(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    
    if (!userId) {
      client.emit('error', { message: 'UserId não encontrado' });
      return;
    }

    try {
      // Contar conversas ativas existentes para numeração
      const existingCount = await Conversation.countDocuments({ 
        userId, 
        isActive: true 
      });
      const conversationNumber = existingCount + 1;

      // Gerar roomId único
      const roomId = `user_${userId}_conv_${Date.now()}`;

      // Criar nova conversa
      const newConversation = await Conversation.create({
        roomId,
        userId,
        title: `Nova Conversa #${conversationNumber}`,
        isActive: true,
        lastMessageAt: new Date(),
        unreadCount: 0,
        conversationNumber,
        isAuthenticated: client.data.isAuthenticated,
        user: client.data.user
      });

      // Conectar cliente à nova sala
      await client.join(newConversation.roomId);

      console.log(`🆕 Nova conversa criada: ${newConversation.title} (${newConversation.roomId})`);

      // Emitir nova conversa para o cliente
      client.emit('new-conversation-created', {
        id: newConversation._id.toString(),
        roomId: newConversation.roomId,
        title: newConversation.title,
        status: newConversation.status,
        unreadCount: 0,
        lastMessageAt: newConversation.lastMessageAt,
        conversationNumber: newConversation.conversationNumber
      });

    } catch (error) {
      console.error('❌ Erro ao criar nova conversa:', error);
      client.emit('error', { message: 'Erro ao criar nova conversa' });
    }
  }

  @SubscribeMessage('join-lawyer-room')
  @UseGuards(NextAuthGuard)
  async handleJoinLawyerRoom(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Verificar se o usuário é advogado
      if (
        !client.data.user ||
        !['lawyer', 'super_admin'].includes(client.data.user.role)
      ) {
        client.emit('error', {
          message: 'Acesso negado - apenas advogados podem acessar',
        });
        return;
      }

      // Verificar se o caso existe
      const conversation = await Conversation.findOne({ roomId });
      if (!conversation) {
        client.emit('error', { message: 'Caso não encontrado' });
        return;
      }

      // Super admins podem acessar qualquer caso, advogados apenas casos atribuídos a eles
      if (
        client.data.user.role !== 'super_admin' &&
        conversation.assignedTo !== client.data.user.userId
      ) {
        client.emit('error', {
          message: 'Acesso negado - caso não atribuído a você',
        });
        return;
      }

      // Entrar na sala do cliente (para comunicação direta) e na sala específica do advogado
      void client.join(roomId); // Sala principal do cliente
      void client.join(`lawyer-${roomId}`); // Sala específica dos advogados

      // Carregar histórico completo da conversa
      const messages = await this.messageService.getMessages(
        { conversationId: conversation._id },
        {
          userId: client.data.user._id,
          role: client.data.user.role,
          permissions: client.data.user.permissions,
        },
      );
      client.emit(
        'lawyer-history-loaded',
        messages.map((msg) => ({
          id: msg._id.toString(),
          text: msg.text,
          sender: msg.sender,
          createdAt: msg.createdAt,
        })),
      );
    } catch (error) {
      console.error('Erro ao entrar na sala do advogado:', error);
      client.emit('error', { message: 'Erro interno do servidor' });
    }
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @MessageBody() data: { text: string; attachments?: any[] },
    @ConnectedSocket() client: Socket,
  ) {
    const { text: message, attachments: _attachments = [] } = data;

    // Usar userId do cliente como roomId
    const roomId = client.data.userId;

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
        console.warn(
          'Erro de conexão com banco de dados, continuando sem persistência:',
          dbError.message,
        );
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
      } catch (_dbError) {
        console.warn(
          'Erro ao salvar mensagem do usuário, continuando sem persistência',
        );
        userMessage = {
          _id: `temp-msg-${Date.now()}`,
          text: message,
          sender: 'user',
        };
      }

      // Buscar mensagens para contexto (se o DB estiver funcionando)
      let _messages: any[] = [];
      // Tentar carregar histórico de mensagens (apenas se usuário autenticado)
      if (client.data.isAuthenticated) {
        try {
          _messages = await this.messageService.getMessages(
            { conversationId: conversation._id },
            {
              userId: client.data.user.id,
              role: client.data.user.role,
              permissions: client.data.user.permissions || [],
            },
          );
        } catch (_dbError) {
          console.warn('Não foi possível carregar histórico de mensagens');
          // Usar apenas a mensagem atual como contexto
          _messages = [userMessage];
        }
      } else {
        // Para usuários anônimos, usar apenas a mensagem atual
        _messages = [userMessage];
      }

      // Verificar se a mensagem é um código de verificação (6 dígitos)
      const codeMatch = message.match(/^\d{6}$/);
      if (codeMatch && !client.data.isAuthenticated) {
        // Tentar verificar código para a conversa atual
        const verificationResult =
          await this.fluidRegistrationService.verifyAndCompleteRegistration(
            {}, // Contact info será buscada da conversa
            message,
            conversation._id.toString(),
          );

        if (verificationResult.success) {
          // Atualizar dados do cliente na conversa
          await Conversation.findByIdAndUpdate(conversation._id, {
            updatedAt: new Date(),
          });

          this.server.to(roomId).emit('receive-message', {
            text: verificationResult.message,
            sender: 'system',
            messageId: `verification-${Date.now()}`,
          });

          // Se usuário foi verificado, atualizar dados do cliente
          if (verificationResult.userId) {
            client.data.user = {
              ...client.data.user,
              userId: verificationResult.userId,
            };
            client.data.isAuthenticated = true;
          }
        } else {
          this.server.to(roomId).emit('receive-message', {
            text: verificationResult.message,
            sender: 'system',
            messageId: `error-${Date.now()}`,
          });
        }
        return; // Não processar como mensagem normal da IA
      }

      // Processar mensagem com cadastro inteligente
      let registrationResult;
      let aiResponseText =
        'Olá! Sou o assistente jurídico da Juristec. Como posso ajudar você hoje com suas questões legais?';

      try {
        registrationResult =
          await this.intelligentRegistrationService.processUserMessage(
            message,
            conversation._id.toString(),
            client.data.userId, // Usar userId consistente (sempre existe, mesmo para usuários anônimos)
            true, // Sempre incluir histórico quando há conversationId (todas as mensagens são salvas no banco)
            client.data.isAuthenticated, // Passar se o usuário está autenticado para determinar o role correto
          );
        aiResponseText = registrationResult.response;
      } catch (aiError) {
        console.warn('Erro na IA Gemini:', aiError?.message || aiError);
        // Qualquer erro do Gemini deve ser tratado como erro crítico
        const errorMsg =
          aiError?.message || String(aiError) || 'Erro desconhecido na IA';
        throw new Error(
          `Serviço de IA temporariamente indisponível: ${errorMsg}`,
        );
      }

      // Usar a resposta da IA (que pode incluir function calls)

      // Log de eventos importantes
      if (registrationResult.userRegistered) {
        // Usuário registrado na conversa
      }
      if (registrationResult.statusUpdated) {
        // Status da conversa atualizado
        if (registrationResult.lawyerNeeded) {
          // Conversa necessita advogado especializado
        }
      }
      if (registrationResult.shouldShowFeedback) {
        // Mapear feedbackReason para uma mensagem de contexto apropriada
        const feedbackContextMap: Record<string, string> = {
          resolved_by_ai: 'Conversa resolvida com sucesso pela IA',
          assigned_to_lawyer: 'Caso encaminhado para advogado especializado',
          user_satisfied: 'Usuário demonstrou satisfação com a solução',
          user_abandoned: 'Usuário abandonou a conversa',
        };
        const contextMessage =
          feedbackContextMap[registrationResult.feedbackReason || ''] ||
          'Conversa finalizada';
        // Emitir evento para o frontend mostrar o modal de feedback
        client.emit('show-feedback-modal', {
          reason: registrationResult.feedbackReason,
          context: contextMessage,
        });
      }

      // Salvar resposta da IA
      let aiMessage;
      try {
        aiMessage = await this.messageService.createMessage({
          conversationId: conversation._id.toString(),
          text: aiResponseText,
          sender: 'ai',
          metadata: { generatedBy: 'gemini' },
        });
      } catch (_dbError) {
        console.warn(
          'Erro ao salvar mensagem da IA, continuando sem persistência',
        );
        aiMessage = {
          _id: `temp-ai-${Date.now()}`,
          text: aiResponseText,
          sender: 'ai',
        };
      }

      // Tentar classificar conversa (opcional)
      try {
        await this.aiService.classifyConversation(roomId);
      } catch (classifyError) {
        console.warn('Erro ao classificar conversa:', classifyError.message);
      }

      console.log('Antes de emitir mensagem da IA:', aiResponseText);
      this.server.to(roomId).emit('receive-message', {
        text: aiResponseText,
        sender: 'ai',
        messageId: aiMessage._id.toString(),
      });
      console.log('Depois de emitir mensagem da IA');
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);

      let errorMessage =
        'Desculpe, ocorreu um erro interno. Tente novamente em alguns instantes.';
      let shouldRetry = false;

      // Garantir que error é um objeto com message
      const errorObj = error || {};
      const errorMsg =
        errorObj.message || String(errorObj) || 'Erro desconhecido';

      // Tratar erros específicos da API do Google Gemini
      if (
        errorMsg.includes('Modelo Gemini indisponível') ||
        errorMsg.includes('Serviço de IA temporariamente indisponível')
      ) {
        errorMessage =
          'Estamos passando por uma instabilidade temporária no nosso assistente de IA. Nossa equipe foi notificada e estamos trabalhando para resolver. Tente novamente em alguns minutos.';
        shouldRetry = true;
      } else if (
        errorMsg.includes('503') ||
        errorMsg.includes('Service Unavailable')
      ) {
        errorMessage =
          'O assistente está temporariamente indisponível devido à alta demanda. Aguarde alguns minutos e tente novamente.';
        shouldRetry = true;
      } else if (
        errorMsg.includes('429') ||
        errorMsg.includes('Too Many Requests')
      ) {
        errorMessage =
          'Muitas solicitações foram feitas. Aguarde alguns minutos antes de tentar novamente.';
        shouldRetry = true;
      } else if (
        errorMsg.includes('404') ||
        errorMsg.includes('Not Found') ||
        errorMsg.includes('models/gemini-flash-lite-latest is not found')
      ) {
        errorMessage =
          'O modelo de IA está temporariamente indisponível. Nossa equipe foi notificada e estamos trabalhando para resolver. Tente novamente em alguns minutos.';
        shouldRetry = true;
      } else if (
        errorMsg.includes('401') ||
        errorMsg.includes('Unauthorized')
      ) {
        errorMessage =
          'Erro de autenticação com o serviço de IA. Entre em contato com o suporte.';
      } else if (errorMsg.includes('400') || errorMsg.includes('Bad Request')) {
        errorMessage =
          'A mensagem enviada não pôde ser processada. Tente reformular sua pergunta.';
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
              originalError: errorMsg,
              shouldRetry,
            },
          });
        }
      } catch (_dbError) {
        console.warn('Erro ao salvar mensagem de erro no banco de dados');
      }

      this.server.to(roomId).emit('receive-message', {
        text: errorMessage,
        sender: 'system',
        messageId: `error-${Date.now()}`,
        isError: true,
        shouldRetry,
      });
    }
  }

  @SubscribeMessage('verify-code')
  async handleVerifyCode(
    @MessageBody()
    data: { roomId: string; code: string; email?: string; phone?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, code, email, phone } = data;

    try {
      const contactInfo = { email, phone };
      const conversation = await Conversation.findOne({ roomId });

      if (!conversation) {
        client.emit('receive-message', {
          text: 'Erro: Conversa não encontrada.',
          sender: 'system',
          messageId: `error-${Date.now()}`,
        });
        return;
      }

      const result =
        await this.fluidRegistrationService.verifyAndCompleteRegistration(
          contactInfo,
          code,
          conversation._id.toString(),
        );

      if (result.success) {
        // Atualizar dados do cliente na conversa
        await Conversation.findByIdAndUpdate(conversation._id, {
          'clientInfo.email': email,
          'clientInfo.phone': phone,
          updatedAt: new Date(),
        });

        client.emit('receive-message', {
          text: result.message,
          sender: 'system',
          messageId: `verification-${Date.now()}`,
        });

        // Se usuário foi criado/verificado, atualizar dados do cliente
        if (result.userId) {
          client.data.user = { ...client.data.user, userId: result.userId };
          client.data.isAuthenticated = true;
        }
      } else {
        client.emit('receive-message', {
          text: result.message,
          sender: 'system',
          messageId: `error-${Date.now()}`,
        });
      }
    } catch (error) {
      console.error('Erro na verificação de código:', error);
      client.emit('receive-message', {
        text: 'Erro ao verificar código. Tente novamente.',
        sender: 'system',
        messageId: `error-${Date.now()}`,
      });
    }
  }

  @SubscribeMessage('send-lawyer-message')
  @UseGuards(NextAuthGuard)
  async handleSendLawyerMessage(
    @MessageBody() data: { roomId: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, message } = data;

    try {
      // Verificar se o usuário é advogado
      if (
        !client.data.user ||
        !['lawyer', 'super_admin'].includes(client.data.user.role)
      ) {
        client.emit('error', {
          message: 'Acesso negado - apenas advogados podem enviar mensagens',
        });
        return;
      }

      const conversation = await Conversation.findOne({ roomId });
      if (!conversation) {
        client.emit('error', { message: 'Caso não encontrado' });
        return;
      }

      // Verificar permissão para o caso
      if (
        client.data.user.role !== 'super_admin' &&
        conversation.assignedTo !== client.data.user.userId
      ) {
        client.emit('error', {
          message: 'Acesso negado - caso não atribuído a você',
        });
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
        createdAt: lawyerMessage.createdAt,
      });

      // Também enviar confirmação para todos os advogados na sala específica
      this.server.to(`lawyer-${roomId}`).emit('receive-lawyer-message', {
        text: message,
        sender: 'lawyer',
        messageId: lawyerMessage._id.toString(),
        createdAt: lawyerMessage.createdAt,
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem do advogado:', error);
      client.emit('error', {
        message: 'Erro ao enviar mensagem',
      });
    }
  }

  /**
   * Notifica sobre cobrança criada
   */
  async notifyChargeCreated(roomId: string, charge: any) {
    try {
      // Notificar cliente sobre nova cobrança
      this.server.to(roomId).emit('charge-created', {
        chargeId: charge._id,
        amount: charge.amount,
        title: charge.title,
        description: charge.description,
        reason: charge.reason,
        type: charge.type,
        expiresAt: charge.expiresAt,
        splitConfig: charge.splitConfig,
        createdAt: charge.createdAt,
      });

      // Notificar advogados sobre cobrança criada
      this.server.to(`lawyer-${roomId}`).emit('charge-created-lawyer', {
        chargeId: charge._id,
        amount: charge.amount,
        title: charge.title,
        description: charge.description,
        clientId: charge.clientId,
        status: charge.status,
        createdAt: charge.createdAt,
      });
    } catch (error) {
      console.error('Erro ao notificar cobrança criada:', error);
    }
  }

  /**
   * Notifica sobre atualização de cobrança
   */
  async notifyChargeUpdated(roomId: string, charge: any) {
    try {
      // Notificar cliente sobre atualização da cobrança
      this.server.to(roomId).emit('charge-updated', {
        chargeId: charge._id,
        status: charge.status,
        updatedAt: charge.updatedAt,
      });

      // Notificar advogados sobre atualização da cobrança
      this.server.to(`lawyer-${roomId}`).emit('charge-updated-lawyer', {
        chargeId: charge._id,
        status: charge.status,
        clientId: charge.clientId,
        updatedAt: charge.updatedAt,
      });
    } catch (error) {
      console.error('Erro ao notificar atualização de cobrança:', error);
    }
  }

  private parseCookie(cookieHeader: string, name: string): string | undefined {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    const cookie = cookies.find((c) => c.startsWith(`${name}=`));
    return cookie
      ? decodeURIComponent(cookie.substring(name.length + 1))
      : undefined;
  }
}
