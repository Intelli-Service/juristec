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
import { CaseStatus } from '../models/User';

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

    // Conectar cliente a TODAS as suas conversas de uma vez
    console.log(`Cliente ${client.id} conectando a todas as suas conversas...`);

    // Buscar todas as conversas do usuário
    const userConversations = await Conversation.find({
      userId: client.data.userId,
      isActive: true,
    })
      .select('roomId _id')
      .lean();

    console.log(
      `Encontradas ${userConversations.length} conversas para o usuário ${client.data.userId}`,
    );

    // Conectar cliente a todas as salas de suas conversas
    for (const conv of userConversations) {
      const roomId = conv.roomId || (conv._id as any).toString();
      await client.join(roomId);
      console.log(`Cliente ${client.id} conectado à sala: ${roomId}`);
    }

    // Também conectar à sala geral do usuário (para notificações gerais)
    const userRoomId = client.data.userId;
    await client.join(userRoomId);
    console.log(`Cliente ${client.id} conectado à sala geral: ${userRoomId}`);

    // Carregar lista de conversas (sem carregar mensagens automaticamente)
    try {
      // Verificar se o usuário tem conversas existentes
      const existingConversations = await Conversation.find({
        userId: client.data.userId,
      })
        .sort({ lastMessageAt: -1 })
        .select(
          '_id roomId title status createdAt lastMessageAt unreadCount classification',
        )
        .lean();

      if (existingConversations.length === 0) {
        // Se não tem conversas, criar a primeira
        console.log(
          `Criando primeira conversa para userId ${client.data.userId}`,
        );
        const newRoomId = `user_${client.data.userId}_conv_${Date.now()}`;

        const newConversation = await Conversation.create({
          roomId: newRoomId,
          userId: client.data.userId,
          isAuthenticated: client.data.isAuthenticated,
          user: client.data.user,
          conversationNumber: 1,
          status: 'active',
          title: 'Nova Conversa #1',
        });

        // Conectar cliente à nova sala
        await client.join(newRoomId);

        // Enviar lista com a nova conversa
        client.emit('conversations-loaded', {
          conversations: [
            {
              id: newConversation._id.toString(),
              roomId: newConversation.roomId,
              title: newConversation.title || 'Nova Conversa #1',
              status: newConversation.status || 'active',
              unreadCount: 0,
              lastMessageAt: newConversation.createdAt,
              classification: newConversation.classification,
            },
          ],
          activeRooms: [newRoomId],
        });

        console.log(
          `Nova primeira conversa criada para userId ${client.data.userId} na sala ${newRoomId}`,
        );
      } else {
        // Enviar lista de conversas existentes
        client.emit('conversations-loaded', {
          conversations: existingConversations.map((conv) => ({
            id: (conv._id as any).toString(),
            roomId: conv.roomId || (conv._id as any).toString(),
            title: conv.title || 'Conversa sem título',
            status: conv.status || 'active',
            unreadCount: conv.unreadCount || 0,
            lastMessageAt: conv.lastMessageAt || conv.createdAt,
            classification: conv.classification,
          })),
          activeRooms: existingConversations.map(
            (conv) => conv.roomId || (conv._id as any).toString(),
          ),
        });

        console.log(
          `Conversas carregadas para userId ${client.data.userId}: ${existingConversations.length} conversas`,
        );
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      client.emit('conversations-loaded', {
        conversations: [],
        activeRooms: [],
      });
    }

    // NÃO carregar histórico automaticamente - deixar para o conversation-switched
    console.log(
      `Cliente ${client.id} conectado com sucesso - aguardando seleção de conversa`,
    );
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
    @MessageBody()
    data: { text: string; attachments?: any[]; conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const {
      text: message,
      attachments: _attachments = [],
      conversationId,
    } = data;
    const userId = client.data.userId;

    console.log(`🔍 DEBUG - send-message recebido:`);
    console.log(`   userId: ${userId}`);
    console.log(`   conversationId: ${conversationId}`);
    console.log(`   message: "${message}"`);
    console.log(`   message length: ${message.length}`);

    if (!userId) {
      client.emit('error', { message: 'UserId não encontrado' });
      return;
    }

    if (!conversationId) {
      client.emit('error', { message: 'ConversationId é obrigatório' });
      return;
    }

    // Buscar a conversa específica
    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: userId,
      isActive: true,
    });

    if (!conversation) {
      client.emit('error', { message: 'Conversa não encontrada ou não ativa' });
      return;
    }

    const roomId = conversation.roomId;

    try {
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
            conversationId: conversation._id.toString(),
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
            conversationId: conversation._id.toString(),
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
      console.log('💾 Tentando salvar mensagem da IA no banco de dados...');
      let aiMessage;
      try {
        aiMessage = await this.messageService.createMessage({
          conversationId: conversation._id.toString(),
          text: aiResponseText,
          sender: 'ai',
          senderId: 'ai-gemini', // Identificador único para IA
          metadata: { generatedBy: 'gemini' },
        });
        console.log('✅ Mensagem da IA salva com sucesso:', aiMessage._id);
      } catch (_dbError) {
        console.warn(
          '❌ Erro ao salvar mensagem da IA, continuando sem persistência:',
          _dbError.message,
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
        conversationId: conversation._id.toString(),
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
        conversationId: conversation._id.toString(),
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
          conversationId: roomId, // usar roomId como fallback
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
          conversationId: conversation._id.toString(),
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
          conversationId: conversation._id.toString(),
        });
      }
    } catch (error) {
      console.error('Erro na verificação de código:', error);
      client.emit('receive-message', {
        text: 'Erro ao verificar código. Tente novamente.',
        sender: 'system',
        messageId: `error-${Date.now()}`,
        conversationId: roomId, // usar roomId como fallback
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
        conversationId: conversation._id.toString(),
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

  /**
   * Handle create new conversation
   */
  @SubscribeMessage('create-new-conversation')
  async handleCreateNewConversation(@ConnectedSocket() client: Socket) {
    console.log(
      `🆕 HANDLER: create-new-conversation recebido de cliente ${client.id}`,
    );
    try {
      const userId = client.data.userId;
      console.log(`🔍 HANDLER: userId = ${userId}, client.data =`, client.data);

      if (!userId) {
        console.log(`❌ HANDLER: Usuário não autenticado`);
        client.emit('error', { message: 'Usuário não autenticado' });
        return;
      }

      console.log(`✅ HANDLER: Criando nova conversa para userId: ${userId}`);

      // Generate unique roomId for new conversation
      const roomId = `user_${userId}_conv_${Date.now()}`;
      console.log(`🔑 HANDLER: roomId gerado: ${roomId}`);

      // Get next conversation number for this user
      console.log(`🔢 HANDLER: Buscando próximo número de conversa...`);
      const existingConversations = await Conversation.find({ userId })
        .sort({ conversationNumber: -1 })
        .limit(1);
      const nextConversationNumber =
        existingConversations.length > 0
          ? existingConversations[0].conversationNumber + 1
          : 1;
      console.log(
        `🔢 HANDLER: Próximo número de conversa: ${nextConversationNumber}`,
      );

      // Create new conversation
      console.log(`💾 HANDLER: Chamando Conversation.create...`);

      let newConversation;
      try {
        newConversation = await Conversation.create({
          userId,
          roomId,
          title: `Nova Conversa #${nextConversationNumber}`,
          status: CaseStatus.ACTIVE, // Usar status válido do enum CaseStatus
          conversationNumber: nextConversationNumber,
          isAnonymous: client.data.isAnonymous || false,
          metadata: {
            clientInfo: client.data.user || {},
            conversationType: 'chat',
          },
        });
        console.log(`✅ HANDLER: Nova conversa criada: ${newConversation._id}`);
      } catch (dbError) {
        console.error(`❌ HANDLER: Erro ao criar conversa no banco:`, dbError);
        client.emit('error', {
          message: 'Erro ao criar nova conversa no banco de dados',
        });
        return;
      }

      // Conectar cliente à nova sala (adicionar às salas já conectadas)
      await client.join(roomId);
      console.log(`✅ HANDLER: Cliente conectado à nova sala: ${roomId}`);

      // Get all user conversations
      const conversations = await Conversation.find({ userId })
        .sort({ createdAt: -1 })
        .select('_id title status createdAt lastMessageAt unreadCount')
        .lean();

      // Emit the new conversation and updated list
      client.emit('new-conversation-created', {
        id: newConversation._id.toString(),
        roomId: newConversation.roomId || newConversation._id.toString(),
        title: newConversation.title,
        status: newConversation.status,
        unreadCount: newConversation.unreadCount || 0,
        lastMessageAt: newConversation.lastMessageAt,
        classification: newConversation.classification,
      });

      // Also emit updated conversations list
      client.emit('conversations-loaded', {
        conversations: conversations.map((conv) => ({
          id: (conv._id as any).toString(),
          roomId: conv.roomId || (conv._id as any).toString(),
          title: conv.title,
          status: conv.status,
          unreadCount: conv.unreadCount || 0,
          lastMessageAt: conv.lastMessageAt,
          classification: conv.classification,
        })),
        activeRooms: conversations.map(
          (conv) => conv.roomId || (conv._id as any).toString(),
        ),
      });

      console.log(
        `🎉 HANDLER: Eventos emitidos com sucesso para nova conversa ${newConversation._id}`,
      );
    } catch (error) {
      console.error('❌ HANDLER: Erro geral ao criar nova conversa:', error);
      client.emit('error', { message: 'Erro ao criar nova conversa' });
    }

    console.log(
      `🏁 HANDLER: create-new-conversation finalizado para cliente ${client.id}`,
    );
  }

  /**
   * Handle switch conversation
   */
  @SubscribeMessage('switch-conversation')
  async handleSwitchConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    console.log(
      `🔄 SWITCH-HANDLER: switch-conversation recebido de cliente ${client.id}`,
    );
    console.log(`🔄 SWITCH-HANDLER: data recebida:`, data);

    try {
      const userId = client.data.userId;
      const { conversationId } = data;

      console.log(
        `🔄 SWITCH-HANDLER: userId = ${userId}, conversationId = ${conversationId}`,
      );

      if (!userId) {
        console.log(`❌ SWITCH-HANDLER: Usuário não autenticado`);
        client.emit('error', { message: 'Usuário não autenticado' });
        return;
      }

      console.log(
        `✅ SWITCH-HANDLER: Loading history for conversation ${conversationId} for user ${userId}`,
      );

      // Verify conversation belongs to user
      const conversation = await Conversation.findOne({
        _id: conversationId,
        userId,
      });

      if (!conversation) {
        client.emit('error', { message: 'Conversa não encontrada' });
        return;
      }

      // Cliente já está conectado a todas as salas, apenas carregamos o histórico
      console.log(
        `📜 SWITCH-HANDLER: Carregando mensagens da conversa ${conversationId}`,
      );

      // Load conversation messages
      let messages: any[] = [];
      try {
        messages = await this.messageService.getMessages(
          { conversationId },
          {
            userId: client.data.userId,
            role: client.data.isAuthenticated ? 'client' : 'anonymous',
            permissions: ['read'],
          },
        );
        console.log(
          `📜 SWITCH-HANDLER: ${messages.length} mensagens carregadas`,
        );
      } catch (messageError) {
        console.error(
          `❌ SWITCH-HANDLER: Erro ao carregar mensagens:`,
          messageError,
        );
        // Continue sem mensagens se houver erro
        messages = [];
      }

      // Get all user conversations for sidebar
      const conversations = await Conversation.find({ userId })
        .sort({ createdAt: -1 })
        .select('_id title status createdAt lastMessageAt unreadCount')
        .lean();

      // Emit conversation switched event
      client.emit('conversation-switched', {
        conversationId,
        messages: messages.map((msg) => ({
          id: msg._id.toString(),
          text: msg.text,
          sender: msg.sender,
          timestamp: msg.createdAt,
        })),
        conversations: conversations.map((conv) => ({
          id: (conv._id as any).toString(),
          roomId: conv.roomId || (conv._id as any).toString(),
          title: conv.title || 'Conversa sem título',
          status: conv.status || 'active',
          unreadCount: conv.unreadCount || 0,
          lastMessageAt: conv.lastMessageAt || conv.createdAt,
          classification: conv.classification,
        })),
      });

      console.log(
        `🎉 SWITCH-HANDLER: Evento conversation-switched emitido com sucesso para conversa ${conversationId}`,
      );

      // TODO: Implement markMessagesAsRead method in MessageService if needed
    } catch (error) {
      console.error('❌ SWITCH-HANDLER: Erro ao trocar conversa:', error);
      client.emit('error', { message: 'Erro ao trocar conversa' });
    }

    console.log(
      `🏁 SWITCH-HANDLER: switch-conversation finalizado para cliente ${client.id}`,
    );
  }

  /**
   * Get all conversations for user
   */
  @SubscribeMessage('get-conversations')
  async handleGetConversations(@ConnectedSocket() client: Socket) {
    try {
      const userId = client.data.userId;
      if (!userId) {
        client.emit('error', { message: 'Usuário não autenticado' });
        return;
      }

      const conversations = await Conversation.find({ userId })
        .sort({ createdAt: -1 })
        .select('_id title status createdAt lastMessageAt unreadCount')
        .lean();

      client.emit('conversations-loaded', {
        conversations: conversations.map((conv) => ({
          id: (conv._id as any).toString(),
          title: conv.title,
          status: conv.status,
          createdAt: conv.createdAt,
          lastMessageAt: conv.lastMessageAt,
          unreadCount: conv.unreadCount || 0,
        })),
      });
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      client.emit('error', { message: 'Erro ao carregar conversas' });
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
