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
      // Tentar autenticar se houver token, mas permitir conexões anônimas
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (token) {
        const payload = this.jwtService.verify(token, {
          secret: process.env.NEXTAUTH_SECRET || 'fallback-secret',
        });
        client.data.user = payload;
        client.data.isAuthenticated = true;
      } else {
        client.data.isAuthenticated = false;
        client.data.user = null;
      }
    } catch (_error) {
      // Se o token for inválido, tratar como anônimo
      client.data.isAuthenticated = false;
      client.data.user = null;
    }
  }

  handleDisconnect(_client: Socket) {}

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId } = data;
    console.log(`=== CLIENTE ENTRANDO NA SALA ===`);
    console.log(`Cliente ${client.id} entrando na sala: ${roomId}`);

    // Adicionar cliente à sala
    client.join(roomId);
    console.log(`Cliente ${client.id} adicionado à sala ${roomId}`);

    // Tentar carregar histórico da conversa
    try {
      const conversation = await Conversation.findOne({ roomId });
      if (conversation) {
        const messages = await this.messageService.getMessages(
          { conversationId: conversation._id },
          { userId: 'system', role: 'system', permissions: ['read'] },
        );
        client.emit('load-history', messages.map((msg) => ({
          id: msg._id.toString(),
          text: msg.text,
          sender: msg.sender,
        })));
        console.log(`Histórico carregado para sala ${roomId}: ${messages.length} mensagens`);
      } else {
        // Criar nova conversa
        await Conversation.create({ roomId });
        client.emit('load-history', []);
        console.log(`Nova conversa criada para sala ${roomId}`);
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      // Mesmo com erro de DB, permitir que o usuário continue
      client.emit('load-history', []);
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
      client.join(roomId); // Sala principal do cliente
      client.join(`lawyer-${roomId}`); // Sala específica dos advogados

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
    @MessageBody() data: { roomId: string; text: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId, text: message } = data;

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
      let aiResponseText = 'Olá! Sou o assistente jurídico da Juristec. Como posso ajudar você hoje com suas questões legais?';

      try {
        registrationResult =
          await this.intelligentRegistrationService.processUserMessage(
            message,
            conversation._id.toString(),
            client.data.user?.id,
            client.data.isAuthenticated, // Passar se deve incluir histórico
          );
        aiResponseText = registrationResult.response;
      } catch (aiError) {
        console.warn('Erro na IA Gemini:', aiError?.message || aiError);
        // Qualquer erro do Gemini deve ser tratado como erro crítico
        const errorMsg = aiError?.message || String(aiError) || 'Erro desconhecido na IA';
        throw new Error(`Serviço de IA temporariamente indisponível: ${errorMsg}`);
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
      const errorMsg = errorObj.message || String(errorObj) || 'Erro desconhecido';

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
      } else if (
        errorMsg.includes('400') ||
        errorMsg.includes('Bad Request')
      ) {
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
}
