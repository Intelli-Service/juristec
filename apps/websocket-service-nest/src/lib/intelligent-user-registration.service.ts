import { Injectable, Logger } from '@nestjs/common';
import {
  GeminiService,
  RegisterUserFunctionCall,
  RequireLawyerAssistanceFunctionCall,
  GeminiAttachment,
  MessageWithAttachments,
  FunctionCall,
} from './gemini.service';
import { AIService } from './ai.service';
import { MessageService } from './message.service';
import { FluidRegistrationService } from './fluid-registration.service';
import { UploadsService } from '../uploads/uploads.service';
import { IUser } from '../models/User';
import { CaseStatus } from '../models/User';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IntelligentRegistrationResult {
  response: string;
  userRegistered?: boolean;
  statusUpdated?: boolean;
  newStatus?: CaseStatus;
  lawyerNeeded?: boolean;
  specializationRequired?: string;
  shouldShowFeedback?: boolean;
  feedbackReason?: string;
}

interface RegistrationOutcome {
  success: boolean;
  mode: 'fluid' | 'fallback';
  userId?: string | null;
  createdUser?: boolean;
  message?: string;
}

@Injectable()
export class IntelligentUserRegistrationService {
  private readonly urgencyToPriorityMap: Record<
    string,
    'low' | 'medium' | 'high' | 'urgent'
  > = {
    low: 'low',
    medium: 'medium',
    high: 'high',
    urgent: 'urgent',
  };
  private readonly logger = new Logger(IntelligentUserRegistrationService.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly aiService: AIService,
    private readonly messageService: MessageService,
    private readonly fluidRegistrationService: FluidRegistrationService,
    private readonly uploadsService: UploadsService,
    @InjectModel('User') private userModel: Model<IUser>,
    @InjectModel('Conversation') private conversationModel: Model<any>,
    @InjectModel('FileAttachment') private fileAttachmentModel: Model<any>,
  ) {}

  /**
   * Processa uma mensagem do usuário usando IA para cadastro inteligente
   */
  async processUserMessage(
    message: string,
    conversationId: string,
    userId?: string,
    includeHistory: boolean = true,
    isAuthenticated: boolean = false,
    attachments: any[] = [],
    realtimeEmitter?: (event: string, data: any) => void, // Callback para emitir mensagens em tempo real
  ): Promise<IntelligentRegistrationResult> {
    try {
      this.logger.debug(
        `processUserMessage:start conversation=${conversationId} user=${userId} includeHistory=${includeHistory} authenticated=${isAuthenticated} messageSize=${message?.length}`,
      );

      let messages: any[] = [];

      if (includeHistory && userId) {
        // Buscar histórico da conversa com role apropriado
        messages = await this.messageService.getMessages(
          { conversationId, limit: 50 },
          {
            userId,
            role: isAuthenticated ? 'client' : 'anonymous',
            permissions: [],
          },
        );
      } else {
        // Para usuários anônimos ou quando histórico não é necessário, usar apenas a mensagem atual
        messages = [
          {
            _id: `current-msg-${Date.now()}`,
            text: message,
            sender: 'user',
            createdAt: new Date(),
          },
        ];
      }

      // Preparar mensagens para o Gemini
      const geminiMessages: MessageWithAttachments[] = [];

      if (includeHistory && userId) {
        // Usar histórico completo com anexos de cada mensagem
        for (const msg of messages) {
          const isHiddenForClients = msg?.metadata?.hiddenFromClients === true;

          // Buscar anexos específicos desta mensagem (pular para mensagens ocultas)
          const messageAttachments = isHiddenForClients
            ? []
            : await this.uploadsService.getFilesByMessageId(msg._id.toString());

          // Converter anexos da mensagem para o formato GeminiAttachment
          const geminiAttachments: GeminiAttachment[] = messageAttachments
            .filter((attachment: any) => attachment && attachment.aiSignedUrl) // Filtrar apenas anexos válidos
            .map((attachment: any) => ({
              fileUri: attachment.aiSignedUrl,
              mimeType: attachment.mimeType,
              displayName: attachment.originalName,
            }));

          console.log(
            `📎 Mensagem ${msg._id}: ${geminiAttachments.length} anexos encontrados`,
          );

          let messageText = msg.text || '';

          // Adicionar contexto textual dos anexos apenas se houver anexos E houver texto na mensagem
          if (geminiAttachments.length > 0 && messageText.trim().length > 0) {
            let attachmentsContext =
              '\n\n📎 DOCUMENTOS ANEXADOS NESTA MENSAGEM:\n';
            geminiAttachments.forEach((file, index) => {
              attachmentsContext += `${index + 1}. **${file.displayName}**\n`;
              attachmentsContext += `   - Tipo: ${file.mimeType}\n`;
              attachmentsContext += '\n';
            });
            attachmentsContext +=
              '**IMPORTANTE:** Os documentos foram enviados como anexos para análise direta pela IA.\n\n';

            messageText += attachmentsContext;
          }

          geminiMessages.push({
            text: messageText,
            sender: msg.sender,
            attachments: geminiAttachments,
            metadata: msg.metadata || undefined,
          });
        }

        // NÃO adicionar a mensagem atual novamente - ela já está no histórico

        console.log(`🤖 GEMINI CONTEXT - Conversação ${conversationId}:`);
        console.log(`   📨 Total de mensagens históricas: ${messages.length}`);
        console.log(
          `   📨 Total de mensagens para IA: ${geminiMessages.length}`,
        );
        console.log(
          `   📨 Nova mensagem já incluída no histórico: "${message}"`,
        );
        geminiMessages.forEach((msg, index) => {
          console.log(`   ${index + 1}. [${msg.sender}]: "${msg.text}"`);
        });
      } else {
        // Para usuários anônimos, usar apenas a mensagem atual
        let attachmentsContext = '';
        let geminiAttachments: GeminiAttachment[] = [];

        if (attachments && attachments.length > 0) {
          console.log(
            `📎 PROCESSANDO ${attachments.length} ANEXOS para usuário anônimo:`,
          );

          // Log detalhado de cada anexo recebido
          attachments.forEach((att, idx) => {
            console.log(`🔍 ANEXO ${idx + 1} DETALHES COMPLETOS:`, {
              originalName: att?.originalName,
              mimeType: att?.mimeType,
              aiSignedUrl: att?.aiSignedUrl,
              hasAiSignedUrl: !!att?.aiSignedUrl,
              objetoCompleto: JSON.stringify(att, null, 2),
            });
          });

          // Converter anexos da mensagem atual para o formato GeminiAttachment
          geminiAttachments = attachments
            .filter((attachment) => attachment && attachment.aiSignedUrl) // Filtrar apenas anexos válidos
            .map((attachment) => ({
              fileUri: attachment.aiSignedUrl,
              mimeType: attachment.mimeType,
              displayName: attachment.originalName,
            }));

          console.log(
            `✅ RESULTADO: ${geminiAttachments.length} GeminiAttachments válidos criados`,
          );

          // Log dos GeminiAttachments criados
          geminiAttachments.forEach((att, idx) => {
            console.log(`📎 GeminiAttachment ${idx + 1}:`, {
              fileUri: att.fileUri,
              mimeType: att.mimeType,
              displayName: att.displayName,
            });
          });

          // Adicionar contexto textual dos anexos apenas se houver texto na mensagem
          if (message.trim().length > 0) {
            attachmentsContext = '\n\n📎 DOCUMENTOS ANEXADOS NESTA MENSAGEM:\n';
            geminiAttachments.forEach((file, index) => {
              attachmentsContext += `${index + 1}. **${file.displayName}**\n`;
              attachmentsContext += `   - Tipo: ${file.mimeType}\n`;
              attachmentsContext += '\n';
            });
            attachmentsContext +=
              '**IMPORTANTE:** Os documentos foram enviados como anexos para análise direta pela IA.\n\n';
          }
        }

        geminiMessages.push({
          text: message + attachmentsContext,
          sender: 'user',
          attachments: geminiAttachments,
          metadata: undefined,
        });

        console.log(`📤 ENVIANDO PARA GEMINI SERVICE - DETALHES COMPLETOS:`, {
          totalMessages: geminiMessages.length,
          lastMessage: {
            text: (message + attachmentsContext).substring(0, 100) + '...',
            sender: 'user',
            attachmentsCount: geminiAttachments.length,
            attachments: geminiAttachments,
          },
          allMessages: geminiMessages.map((msg, idx) => ({
            index: idx,
            sender: msg.sender,
            textLength: msg.text.length,
            attachmentsCount: msg.attachments?.length || 0,
            attachments: msg.attachments || [],
          })),
        });
      }

      // Log final antes de chamar o Gemini
      console.log(`🚀 CHAMADA FINAL PARA GEMINI - RESUMO:`, {
        messagesTotal: geminiMessages.length,
        anexosEncontrados: geminiMessages.reduce(
          (total, msg) => total + (msg.attachments?.length || 0),
          0,
        ),
        ultimaMensagem: {
          hasAttachments:
            (geminiMessages[geminiMessages.length - 1]?.attachments?.length ||
              0) > 0,
          attachmentsDetails:
            geminiMessages[geminiMessages.length - 1]?.attachments,
        },
      });

      // Gerar resposta com function calls
      const result =
        await this.geminiService.generateAIResponseWithFunctions(
          geminiMessages,
        );

      if (result.functionCalls?.length) {
        this.logger.log(
          `processUserMessage: função(ões) retornadas pelo Gemini (${result.functionCalls.length}) para conversation=${conversationId}`,
        );
        this.logger.debug(JSON.stringify(result, null, 2), 'ResultComplete');
      } else {
        this.logger.warn(
          `processUserMessage: GEMINI NÃO RETORNOU FUNCTION CALLS conversation=${conversationId} respostaPreview="${(
            result.response || ''
          )
            .replace(/\s+/g, ' ')
            .substring(
              0,
              200,
            )}${(result.response || '').length > 200 ? '...' : ''}"`,
        );
      }

      let userRegistered = false;
      let statusUpdated = false;
      let newStatus: CaseStatus | undefined;
      let lawyerNeeded: boolean | undefined;
      let specializationRequired: string | undefined;
      let shouldShowFeedback = false;
      let feedbackReason: string | undefined;

      // SE HÁ RESPOSTA DE TEXTO NA RESPOSTA INICIAL, ENVIAR IMEDIATAMENTE (independentemente de function calls)
      if (result.response && result.response.trim()) {
        this.logger.log(
          `📝 GEMINI RETORNOU TEXTO INICIAL - Enviando resposta como mensagem separada (function calls: ${result.functionCalls?.length || 0})`,
        );

        // Criar mensagem separada para a resposta inicial
        if (realtimeEmitter) {
          const initialMessageData = await this.messageService.createMessage({
            conversationId,
            text: result.response,
            sender: 'ai',
            senderId: 'ai-gemini',
            metadata: {
              generatedBy: 'gemini',
              isInitialResponse: true,
              hasFunctionCalls: Boolean(result.functionCalls?.length),
            },
          });

          realtimeEmitter('receive-message', {
            text: initialMessageData.text,
            sender: initialMessageData.sender,
            messageId: initialMessageData._id.toString(),
            conversationId: conversationId,
            createdAt: initialMessageData.createdAt?.toISOString(),
            metadata: initialMessageData.metadata,
          });
        }
      } else if (!result.functionCalls?.length) {
        this.logger.warn(
          `⚠️ GEMINI NÃO RETORNOU TEXTO NEM FUNCTION CALLS - Resposta vazia para conversation=${conversationId}`,
        );
      }

      // LOOP DE FUNCTION CALLS: Executar function calls e chamar Gemini novamente até obter resposta final
      let currentResult = result;
      let iterationCount = 0;
      const maxIterations = 5; // Limite de segurança para evitar loops infinitos

      while (
        currentResult.functionCalls?.length &&
        iterationCount < maxIterations
      ) {
        iterationCount++;
        this.logger.log(
          `🔄 FUNCTION CALL LOOP - Iteração ${iterationCount}/${maxIterations} para conversation=${conversationId}`,
        );

        // Processar function calls da resposta atual
        let sequenceCounter = 0;

        for (const functionCall of currentResult.functionCalls) {
          // Adicionar delay mínimo para garantir timestamps distintos
          if (sequenceCounter > 0) {
            await new Promise((resolve) => setTimeout(resolve, 10)); // 10ms delay
          }

          await this.recordFunctionCallMessage(
            conversationId,
            functionCall,
            sequenceCounter,
            realtimeEmitter,
          );

          this.logger.debug(
            `processUserMessage: executando function call "${functionCall.name}" ` +
              `para conversation=${conversationId} payload=${this.formatLogPayload(functionCall.parameters)}`,
          );
          let functionExecutionResult: unknown = undefined;
          if (functionCall.name === 'register_user') {
            const registrationOutcome = await this.handleUserRegistration(
              functionCall.parameters,
              conversationId,
            );
            userRegistered = registrationOutcome.success;
            functionExecutionResult = registrationOutcome;
            this.logger.log(
              `processUserMessage: register_user concluído para conversation=${conversationId}`,
            );
          } else if (functionCall.name === 'require_lawyer_assistance') {
            const assistanceResult = await this.handleLawyerAssistanceRequest(
              functionCall.parameters,
              conversationId,
            );
            lawyerNeeded = assistanceResult.lawyerNeeded;
            specializationRequired = assistanceResult.specializationRequired;
            functionExecutionResult = assistanceResult;
            this.logger.log(
              `processUserMessage: require_lawyer_assistance aplicado para conversation=${conversationId} ` +
                `lawyerNeeded=${lawyerNeeded} specialization=${specializationRequired}`,
            );
          } else if (functionCall.name === 'update_conversation_status') {
            const statusResult = await this.handleConversationStatusUpdate(
              functionCall.parameters,
              conversationId,
            );
            statusUpdated = statusResult.statusUpdated;
            newStatus = statusResult.newStatus;
            functionExecutionResult = statusResult;
            this.logger.log(
              `processUserMessage: update_conversation_status aplicado para conversation=${conversationId} ` +
                `statusUpdated=${statusUpdated} newStatus=${newStatus}`,
            );
          } else if (functionCall.name === 'detect_conversation_completion') {
            // Validação de parâmetros para evitar erros de runtime
            if (
              functionCall.parameters &&
              typeof functionCall.parameters === 'object'
            ) {
              if (
                typeof functionCall.parameters.should_show_feedback ===
                'boolean'
              ) {
                shouldShowFeedback =
                  functionCall.parameters.should_show_feedback;
              } else {
                shouldShowFeedback = false;
                console.warn(
                  '⚠️ should_show_feedback ausente ou tipo inválido em detect_conversation_completion',
                );
              }
              if (
                typeof functionCall.parameters.completion_reason === 'string' &&
                functionCall.parameters.completion_reason.length > 0
              ) {
                feedbackReason = functionCall.parameters.completion_reason;
              } else {
                feedbackReason = undefined;
                console.warn(
                  '⚠️ completion_reason ausente ou tipo inválido em detect_conversation_completion',
                );
              }
            } else {
              shouldShowFeedback = false;
              feedbackReason = undefined;
            }

            functionExecutionResult = {
              shouldShowFeedback,
              feedbackReason,
            } satisfies Record<string, unknown>;
          }

          // Adicionar delay mínimo antes de gravar o resultado também
          await new Promise((resolve) => setTimeout(resolve, 5)); // 5ms delay
          await this.recordFunctionResultMessage(
            conversationId,
            functionCall.name,
            functionExecutionResult ?? { acknowledged: true },
            sequenceCounter,
            realtimeEmitter,
          );

          sequenceCounter++;
        }

        // APÓS EXECUTAR TODAS AS FUNCTION CALLS, CHAMAR NOVAMENTE O GEMINI
        // Recarregar histórico atualizado (incluindo as function calls recém-executadas)
        const updatedMessages = await this.messageService.getMessages(
          { conversationId, limit: 50 },
          {
            userId: userId || '',
            role: isAuthenticated ? 'client' : 'anonymous',
            permissions: [],
          },
        );

        // Preparar mensagens atualizadas para o Gemini
        const updatedGeminiMessages: MessageWithAttachments[] = [];

        for (const msg of updatedMessages) {
          const isHiddenForClients = msg?.metadata?.hiddenFromClients === true;
          const messageAttachments = isHiddenForClients
            ? []
            : await this.uploadsService.getFilesByMessageId(msg._id.toString());

          const geminiAttachments: GeminiAttachment[] = messageAttachments
            .filter((attachment: any) => attachment && attachment.aiSignedUrl)
            .map((attachment: any) => ({
              fileUri: attachment.aiSignedUrl,
              mimeType: attachment.mimeType,
              displayName: attachment.originalName,
            }));

          let messageText = msg.text || '';

          if (geminiAttachments.length > 0 && messageText.trim().length > 0) {
            let attachmentsContext =
              '\n\n📎 DOCUMENTOS ANEXADOS NESTA MENSAGEM:\n';
            geminiAttachments.forEach((file, index) => {
              attachmentsContext += `${index + 1}. **${file.displayName}**\n`;
              attachmentsContext += `   - Tipo: ${file.mimeType}\n`;
              attachmentsContext += '\n';
            });
            attachmentsContext +=
              '**IMPORTANTE:** Os documentos foram enviados como anexos para análise direta pela IA.\n\n';

            messageText += attachmentsContext;
          }

          updatedGeminiMessages.push({
            text: messageText,
            sender: msg.sender,
            attachments: geminiAttachments,
            metadata: msg.metadata || undefined,
          });
        }

        this.logger.log(
          `🔄 CHAMANDO GEMINI NOVAMENTE - Iteração ${iterationCount} com ${updatedGeminiMessages.length} mensagens atualizadas`,
        );

        // Chamar Gemini novamente com histórico atualizado
        currentResult =
          await this.geminiService.generateAIResponseWithFunctions(
            updatedGeminiMessages,
          );

        // Se o Gemini retornou mais texto, criar uma NOVA mensagem separada
        if (currentResult.response && currentResult.response.trim()) {
          this.logger.log(
            `📝 GEMINI RETORNOU TEXTO ADICIONAL na iteração ${iterationCount} - Criando nova mensagem separada`,
          );

          // Criar uma nova mensagem separada para o texto adicional
          if (realtimeEmitter) {
            const additionalMessageData =
              await this.messageService.createMessage({
                conversationId,
                text: currentResult.response,
                sender: 'ai',
                senderId: 'ai-gemini',
                metadata: {
                  generatedBy: 'gemini',
                  iteration: iterationCount,
                  isAdditionalResponse: true,
                },
              });

            realtimeEmitter('receive-message', {
              text: additionalMessageData.text,
              sender: additionalMessageData.sender,
              messageId: additionalMessageData._id.toString(),
              conversationId: conversationId,
              createdAt: additionalMessageData.createdAt?.toISOString(),
              metadata: additionalMessageData.metadata,
            });
          }
        }

        if (currentResult.functionCalls?.length) {
          this.logger.log(
            `🔄 GEMINI RETORNOU MAIS ${currentResult.functionCalls.length} FUNCTION CALLS - Continuando loop`,
          );
        } else {
          this.logger.log(
            `✅ GEMINI RETORNOU APENAS TEXTO - Finalizando loop após ${iterationCount} iterações`,
          );
        }
      }

      // Verificar se atingimos o limite de iterações
      if (iterationCount >= maxIterations) {
        this.logger.warn(
          `⚠️ FUNCTION CALL LOOP - Limite de ${maxIterations} iterações atingido para conversation=${conversationId}`,
        );
      }

      this.logger.debug(
        `processUserMessage:final conversation=${conversationId} userRegistered=${userRegistered} ` +
          `statusUpdated=${statusUpdated} newStatus=${newStatus} lawyerNeeded=${lawyerNeeded} shouldShowFeedback=${shouldShowFeedback}`,
      );

      const response: IntelligentRegistrationResult = {
        response: result.response, // Retornar APENAS a resposta inicial (texto + function calls originais)
        userRegistered,
        shouldShowFeedback,
        feedbackReason,
      };

      // Só incluir campos de status se foram realmente alterados
      if (statusUpdated && newStatus) {
        response.statusUpdated = statusUpdated;
        response.newStatus = newStatus;
      }

      if (lawyerNeeded) {
        response.lawyerNeeded = lawyerNeeded;
      }

      if (specializationRequired) {
        response.specializationRequired = specializationRequired;
      }

      return response;
    } catch (error) {
      this.logger.error(
        `processUserMessage:error conversation=${conversationId}: ${error?.message || error}`,
        error?.stack,
      );
      // Fallback para resposta simples sem function calls
      const fallbackResponse =
        await this.geminiService.generateAIResponseWithFunctionsLegacy([
          { text: message, sender: 'user' },
        ]);

      return {
        response: fallbackResponse.response,
      };
    }
  }

  /**
   * Trata o registro de usuário via function call
   */
  private async handleUserRegistration(
    params: RegisterUserFunctionCall['parameters'],
    conversationId: string,
  ): Promise<RegistrationOutcome> {
    try {
      // Usar o FluidRegistrationService para cadastro fluido
      const contactInfo = {
        email: params.email,
        phone: params.phone,
        name: params.name,
      };

      const fluidResult =
        await this.fluidRegistrationService.processFluidRegistration(
          contactInfo,
          conversationId,
        );

      if (fluidResult.success) {
        // Se foi criado/verificado automaticamente, atualizar conversa
        if (fluidResult.userId) {
          await this.conversationModel.findByIdAndUpdate(conversationId, {
            status: CaseStatus.ACTIVE,
            clientInfo: {
              name: params.name,
              email: params.email,
              phone: params.phone,
              userId: fluidResult.userId,
            },
            priority: this.urgencyToPriorityMap[params.urgency_level] || 'low',
          });
        }

        return {
          success: true,
          mode: 'fluid',
          userId: fluidResult.userId,
          createdUser: Boolean(fluidResult.userId),
          message: fluidResult.message,
        };
      } else {
        console.error(`❌ Erro no cadastro fluido: ${fluidResult.message}`);
        // Fallback para criação direta se o fluido falhar
        return this.fallbackUserRegistration(params, conversationId);
      }
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      throw error;
    }
  }

  /**
   * Fallback para registro direto (caso o fluido falhe)
   */
  private async fallbackUserRegistration(
    params: RegisterUserFunctionCall['parameters'],
    conversationId: string,
  ): Promise<RegistrationOutcome> {
    try {
      this.logger.warn(
        `fallbackUserRegistration: executando fallback para conversation=${conversationId} payload=${this.formatLogPayload(
          params,
        )}`,
      );
      // Criar ou atualizar usuário diretamente
      const userData = {
        name: params.name,
        email: params.email || `${uuidv4()}@example.invalid`,
        role: 'client' as const,
        profile: {
          bio: `Problema relatado: ${params.problem_description}. Nível de urgência: ${params.urgency_level}`,
        },
      };

      let user: IUser | null = null;
      if (params.email) {
        user = await this.userModel.findOne({ email: params.email });
      }

      let createdUser = false;

      if (user) {
        user.name = params.name;
        user.profile = {
          ...user.profile,
          bio: `Problema relatado: ${params.problem_description}. Nível de urgência: ${params.urgency_level}`,
        };
        await user.save();
      } else {
        user = await this.userModel.create(userData);
        createdUser = true;
      }

      await this.conversationModel.findByIdAndUpdate(conversationId, {
        userId: user._id,
        status: CaseStatus.ACTIVE,
        clientInfo: {
          name: params.name,
          email: params.email,
          phone: params.phone,
        },
        priority: this.urgencyToPriorityMap[params.urgency_level] || 'low',
      });
      this.logger.log(
        `fallbackUserRegistration: conclusão bem-sucedida para conversation=${conversationId} userId=${user._id}`,
      );

      return {
        success: true,
        mode: 'fallback',
        userId: user._id?.toString?.() ?? user._id,
        createdUser,
      };
    } catch (error) {
      this.logger.error(
        `fallbackUserRegistration:error conversation=${conversationId}: ${error?.message || error}`,
        error?.stack,
      );
      throw error;
    }
  }

  private async handleLawyerAssistanceRequest(
    params: RequireLawyerAssistanceFunctionCall['parameters'],
    conversationId: string,
  ): Promise<{
    newStatus: CaseStatus;
    lawyerNeeded: boolean;
    specializationRequired?: string;
  }> {
    try {
      this.logger.debug(
        `handleLawyerAssistanceRequest:start conversation=${conversationId} payload=${this.formatLogPayload(
          params,
        )}`,
      );

      const updateData: Record<string, any> = {
        lawyerNeeded: true,
        updatedAt: new Date(),
      };

      if (params.category) {
        updateData['classification.category'] = params.category;
      }

      if (params.specialization_required) {
        updateData['classification.legalArea'] = params.specialization_required;
      }

      if (params.case_summary) {
        updateData['summary.text'] = params.case_summary;
        updateData['summary.lastUpdated'] = new Date();
        updateData['summary.generatedBy'] = 'ai';
      }

      if (params.required_specialties) {
        updateData['notes'] = params.required_specialties; // Armazena especialidades requeridas como notas
      }

      await this.conversationModel.findByIdAndUpdate(conversationId, {
        $set: updateData,
      });

      this.logger.log(
        `handleLawyerAssistanceRequest:concluded conversation=${conversationId} lawyerNeeded=true specialization=${params.specialization_required}`,
      );

      return {
        newStatus: CaseStatus.ACTIVE, // Mantém o status atual como ACTIVE
        lawyerNeeded: true,
        specializationRequired: params.specialization_required,
      };
    } catch (error) {
      this.logger.error(
        `handleLawyerAssistanceRequest:error conversation=${conversationId}: ${error?.message || error}`,
        error?.stack,
      );
      throw error;
    }
  }

  private async handleConversationStatusUpdate(
    params: { status: string; reason?: string },
    conversationId: string,
  ): Promise<{
    statusUpdated: boolean;
    newStatus: CaseStatus;
  }> {
    try {
      this.logger.debug(
        `handleConversationStatusUpdate:start conversation=${conversationId} payload=${this.formatLogPayload(
          params,
        )}`,
      );

      // Validar se o status é válido
      const validStatuses = Object.values(CaseStatus);
      if (!validStatuses.includes(params.status as CaseStatus)) {
        throw new Error(
          `Status inválido: ${params.status}. Status válidos: ${validStatuses.join(', ')}`,
        );
      }

      const newStatus = params.status as CaseStatus;

      const updateData: Record<string, any> = {
        status: newStatus,
        updatedAt: new Date(),
      };

      // Se o status for RESOLVED_BY_AI, COMPLETED ou ABANDONED, definir closedAt
      if (
        [
          CaseStatus.RESOLVED_BY_AI,
          CaseStatus.COMPLETED,
          CaseStatus.ABANDONED,
        ].includes(newStatus)
      ) {
        updateData.closedAt = new Date();
        updateData.closedBy = 'ai'; // Indica que foi fechado pela IA
      }

      // Adicionar razão se fornecida
      if (params.reason) {
        updateData.notes = params.reason;
      }

      await this.conversationModel.findByIdAndUpdate(conversationId, {
        $set: updateData,
      });

      this.logger.log(
        `handleConversationStatusUpdate:concluded conversation=${conversationId} status=${newStatus}`,
      );

      return {
        statusUpdated: true,
        newStatus,
      };
    } catch (error) {
      this.logger.error(
        `handleConversationStatusUpdate:error conversation=${conversationId}: ${error?.message || error}`,
        error?.stack,
      );
      throw error;
    }
  }

  private async recordFunctionCallMessage(
    conversationId: string,
    functionCall: FunctionCall,
    sequenceCounter?: number,
    realtimeEmitter?: (event: string, data: any) => void,
  ): Promise<void> {
    try {
      const messageData = await this.messageService.createMessage({
        conversationId,
        text: `Função IA executada: ${functionCall.name}`,
        sender: 'ai',
        senderId: 'ai-gemini',
        metadata: {
          type: 'function_call',
          name: functionCall.name,
          arguments: functionCall.parameters,
          sequence: sequenceCounter,
          hiddenFromClients: true,
        },
      });

      // Emitir em tempo real se callback fornecido
      if (realtimeEmitter && messageData) {
        realtimeEmitter('receive-message', {
          text: messageData.text,
          sender: messageData.sender,
          messageId: messageData._id.toString(),
          conversationId: conversationId,
          createdAt: messageData.createdAt?.toISOString(),
          metadata: messageData.metadata,
        });
      }
    } catch (error) {
      this.logger.warn(
        `recordFunctionCallMessage: falha ao registrar function call ${functionCall.name} para conversation=${conversationId}: ${error?.message || error}`,
      );
    }
  }

  private async recordFunctionResultMessage(
    conversationId: string,
    functionName: FunctionCall['name'],
    result: unknown,
    sequenceCounter?: number,
    realtimeEmitter?: (event: string, data: any) => void,
  ): Promise<void> {
    try {
      const messageData = await this.messageService.createMessage({
        conversationId,
        text: `Resultado da função ${functionName}`,
        sender: 'system',
        metadata: {
          type: 'function_response',
          name: functionName,
          result,
          sequence: sequenceCounter,
          hiddenFromClients: true,
        },
      });

      // Emitir em tempo real se callback fornecido
      if (realtimeEmitter && messageData) {
        realtimeEmitter('receive-message', {
          text: messageData.text,
          sender: messageData.sender,
          messageId: messageData._id.toString(),
          conversationId: conversationId,
          createdAt: messageData.createdAt?.toISOString(),
          metadata: messageData.metadata,
        });
      }
    } catch (error) {
      this.logger.warn(
        `recordFunctionResultMessage: falha ao registrar resultado da função ${functionName} para conversation=${conversationId}: ${error?.message || error}`,
      );
    }
  }

  private formatLogPayload(payload: unknown): string {
    try {
      return JSON.stringify(payload, (key, value) => {
        if (typeof value === 'string' && value.length > 200) {
          return `${value.substring(0, 200)}…(${value.length} chars)`;
        }
        return value;
      });
    } catch (error) {
      this.logger.warn(
        `formatLogPayload: não foi possível serializar payload (${error?.message || error})`,
      );
      return '[unserializable-payload]';
    }
  }

  /**
   * Verifica se uma conversa precisa de intervenção humana (advogado)
   */
  async checkIfNeedsLawyerIntervention(
    conversationId: string,
  ): Promise<boolean> {
    const conversation = await this.conversationModel.findById(conversationId);
    return conversation?.lawyerNeeded || false;
  }

  /**
   * Obtém estatísticas de conversas por status
   */
  async getConversationStats(): Promise<Record<CaseStatus, number>> {
    const stats = await this.conversationModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const result: Record<CaseStatus, number> = {
      [CaseStatus.OPEN]: 0,
      [CaseStatus.ACTIVE]: 0,
      [CaseStatus.RESOLVED_BY_AI]: 0,
      [CaseStatus.ASSIGNED]: 0,
      [CaseStatus.COMPLETED]: 0,
      [CaseStatus.ABANDONED]: 0,
    };

    stats.forEach((stat) => {
      if (stat._id in result) {
        result[stat._id as CaseStatus] = stat.count;
      }
    });

    return result;
  }
}
