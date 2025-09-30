import { Injectable } from '@nestjs/common';
import {
  GeminiService,
  RegisterUserFunctionCall,
  UpdateConversationStatusFunctionCall,
  GeminiAttachment,
  MessageWithAttachments,
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
  ): Promise<IntelligentRegistrationResult> {
    try {
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

      // Buscar arquivos da conversa com signed URLs temporárias para IA
      const conversationFiles = await this.uploadsService.getFilesWithAISignedUrls(conversationId);

      if (includeHistory && userId) {
        // Usar histórico completo (a mensagem atual já foi salva antes de chamar este método)
        messages.forEach((msg) => {
          // Para mensagens históricas, não temos anexos associados diretamente
          // Os anexos serão incluídos apenas na mensagem atual
          geminiMessages.push({
            text: msg.text,
            sender: msg.sender,
            attachments: [], // Anexos serão adicionados apenas na mensagem atual
          });
        });

        // Adicionar anexos da mensagem atual (se houver)
        if (attachments && attachments.length > 0) {
          const lastUserMessageIndex = geminiMessages
            .map((msg, index) => ({ msg, index }))
            .reverse()
            .find(({ msg }) => msg.sender === 'user')?.index;

          if (lastUserMessageIndex !== undefined) {
            // Converter anexos da mensagem atual para o formato GeminiAttachment
            const geminiAttachments: GeminiAttachment[] = attachments
              .filter(attachment => attachment && attachment.aiSignedUrl) // Filtrar apenas anexos válidos
              .map(attachment => ({
                fileUri: attachment.aiSignedUrl,
                mimeType: attachment.mimeType,
                displayName: attachment.originalName,
              }));

            geminiMessages[lastUserMessageIndex].attachments = geminiAttachments;

            // Adicionar contexto textual dos anexos (compatibilidade)
            let attachmentsContext = '\n\n📎 DOCUMENTOS ANEXADOS NESTA MENSAGEM:\n';
            geminiAttachments.forEach((file, index) => {
              attachmentsContext += `${index + 1}. **${file.displayName}**\n`;
              attachmentsContext += `   - Tipo: ${file.mimeType}\n`;
              attachmentsContext += '\n';
            });
            attachmentsContext += '**IMPORTANTE:** Os documentos foram enviados como anexos para análise direta pela IA.\n\n';

            geminiMessages[lastUserMessageIndex].text += attachmentsContext;
          }
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
          console.log(`📎 Processando ${attachments.length} anexos para usuário anônimo:`);
          attachments.forEach((att, idx) => {
            console.log(`   ${idx + 1}. Anexo:`, {
              originalName: att?.originalName,
              mimeType: att?.mimeType,
              aiSignedUrl: att?.aiSignedUrl ? 'PRESENTE' : 'AUSENTE',
              hasAiSignedUrl: !!att?.aiSignedUrl,
            });
          });

          // Converter anexos da mensagem atual para o formato GeminiAttachment
          geminiAttachments = attachments
            .filter(attachment => attachment && attachment.aiSignedUrl) // Filtrar apenas anexos válidos
            .map(attachment => ({
              fileUri: attachment.aiSignedUrl,
              mimeType: attachment.mimeType,
              displayName: attachment.originalName,
            }));

          console.log(`✅ Criados ${geminiAttachments.length} GeminiAttachments válidos`);

          // Adicionar contexto textual dos anexos
          attachmentsContext = '\n\n📎 DOCUMENTOS ANEXADOS NESTA MENSAGEM:\n';
          geminiAttachments.forEach((file, index) => {
            attachmentsContext += `${index + 1}. **${file.displayName}**\n`;
            attachmentsContext += `   - Tipo: ${file.mimeType}\n`;
            attachmentsContext += '\n';
          });
          attachmentsContext += '**IMPORTANTE:** Os documentos foram enviados como anexos para análise direta pela IA.\n\n';
        }

        geminiMessages.push({
          text: message + attachmentsContext,
          sender: 'user',
          attachments: geminiAttachments,
        });

        console.log(`📤 Enviando para GeminiService:`, {
          totalMessages: geminiMessages.length,
          lastMessageAttachments: geminiMessages[geminiMessages.length - 1]?.attachments?.length || 0,
          attachmentsDetails: geminiMessages[geminiMessages.length - 1]?.attachments || [],
        });
      }

      // Gerar resposta com function calls
      const result =
        await this.geminiService.generateAIResponseWithFunctions(
          geminiMessages,
        );

      let userRegistered = false;
      let statusUpdated = false;
      let newStatus: CaseStatus | undefined;
      let lawyerNeeded: boolean | undefined;
      let specializationRequired: string | undefined;
      let shouldShowFeedback = false;
      let feedbackReason: string | undefined;

      // Processar function calls se existirem
      if (result.functionCalls) {
        for (const functionCall of result.functionCalls) {
          if (functionCall.name === 'register_user') {
            await this.handleUserRegistration(
              functionCall.parameters,
              conversationId,
            );
            userRegistered = true;
          } else if (functionCall.name === 'update_conversation_status') {
            const statusResult = await this.handleStatusUpdate(
              functionCall.parameters,
              conversationId,
            );
            statusUpdated = true;
            newStatus = statusResult.newStatus;
            lawyerNeeded = statusResult.lawyerNeeded;
            specializationRequired = statusResult.specializationRequired;
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
          }
        }
      }

      return {
        response: result.response,
        userRegistered,
        statusUpdated,
        newStatus,
        lawyerNeeded,
        specializationRequired,
        shouldShowFeedback,
        feedbackReason,
      };
    } catch (error) {
      console.error('Erro no processamento inteligente:', error);
      // Fallback para resposta simples sem function calls
      const fallbackResponse = await this.geminiService.generateAIResponse([
        { text: message, sender: 'user' },
      ]);

      return {
        response: fallbackResponse,
      };
    }
  }

  /**
   * Trata o registro de usuário via function call
   */
  private async handleUserRegistration(
    params: RegisterUserFunctionCall['parameters'],
    conversationId: string,
  ): Promise<void> {
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
      } else {
        console.error(`❌ Erro no cadastro fluido: ${fluidResult.message}`);
        // Fallback para criação direta se o fluido falhar
        await this.fallbackUserRegistration(params, conversationId);
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
  ): Promise<void> {
    try {
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

      if (user) {
        user.name = params.name;
        user.profile = {
          ...user.profile,
          bio: `Problema relatado: ${params.problem_description}. Nível de urgência: ${params.urgency_level}`,
        };
        await user.save();
      } else {
        user = await this.userModel.create(userData);
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
    } catch (error) {
      console.error('Erro no fallback de registro:', error);
      throw error;
    }
  }

  /**
   * Trata a atualização de status da conversa via function call
   */
  private async handleStatusUpdate(
    params: UpdateConversationStatusFunctionCall['parameters'],
    conversationId: string,
  ): Promise<{
    newStatus: CaseStatus;
    lawyerNeeded: boolean;
    specializationRequired?: string;
  }> {
    try {
      const updateData: any = {
        status: params.status,
        lawyerNeeded: params.lawyer_needed,
        lastUpdated: new Date(),
      };

      if (params.specialization_required) {
        updateData.classification = {
          legalArea: params.specialization_required,
        };
      }

      if (params.notes) {
        updateData.summary = {
          text: params.notes,
          lastUpdated: new Date(),
          generatedBy: 'ai',
        };
      }

      await this.conversationModel.findByIdAndUpdate(
        conversationId,
        updateData,
      );

      return {
        newStatus: params.status as CaseStatus,
        lawyerNeeded: params.lawyer_needed,
        specializationRequired: params.specialization_required,
      };
    } catch (error) {
      console.error('Erro ao atualizar status da conversa:', error);
      throw error;
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
      [CaseStatus.ASSIGNED_TO_LAWYER]: 0,
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
