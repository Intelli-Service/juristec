import { Injectable } from '@nestjs/common';
import { GeminiService, RegisterUserFunctionCall, UpdateConversationStatusFunctionCall, DetectConversationCompletionFunctionCall, ScheduleAppointmentFunctionCall, CheckLawyerAvailabilityFunctionCall } from './gemini.service';
import { AIService } from './ai.service';
import { MessageService } from './message.service';
import { FluidRegistrationService } from './fluid-registration.service';
import { AppointmentService, CreateAppointmentDto } from '../appointment/appointment.service';
import Conversation from '../models/Conversation';
import { IUser } from '../models/User';
import { CaseStatus } from '../models/User';
import { AppointmentType } from '../models/Appointment';
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
  appointmentScheduled?: boolean;
  appointmentDetails?: any;
  availabilityChecked?: boolean;
  availabilityData?: any;
}

@Injectable()
export class IntelligentUserRegistrationService {
  private readonly urgencyToPriorityMap: Record<string, 'low' | 'medium' | 'high' | 'urgent'> = {
    'low': 'low',
    'medium': 'medium',
    'high': 'high',
    'urgent': 'urgent'
  };

  constructor(
    private readonly geminiService: GeminiService,
    private readonly aiService: AIService,
    private readonly messageService: MessageService,
    private readonly fluidRegistrationService: FluidRegistrationService,
    private readonly appointmentService: AppointmentService,
    @InjectModel('User') private userModel: Model<IUser>,
    @InjectModel('Conversation') private conversationModel: Model<any>
  ) {}

  /**
   * Processa uma mensagem do usuário usando IA para cadastro inteligente
   */
  async processUserMessage(
    message: string,
    conversationId: string,
    userId?: string,
    includeHistory: boolean = true
  ): Promise<IntelligentRegistrationResult> {
    try {
      let messages: any[] = [];

      if (includeHistory && userId) {
        // Buscar histórico da conversa apenas se solicitado e usuário autenticado
        messages = await this.messageService.getMessages(
          { conversationId, limit: 50 },
          { userId, role: 'client', permissions: [] }
        );
      } else {
        // Para usuários anônimos ou quando histórico não é necessário, usar apenas a mensagem atual
        messages = [{
          _id: `current-msg-${Date.now()}`,
          text: message,
          sender: 'user',
          createdAt: new Date()
        }];
      }

      // Preparar mensagens para o Gemini
      const geminiMessages = messages.map(msg => ({
        text: msg.text,
        sender: msg.sender
      }));

      // Adicionar a nova mensagem do usuário
      geminiMessages.push({
        text: message,
        sender: 'user'
      });

      // Gerar resposta com function calls
      const result = await this.geminiService.generateAIResponseWithFunctions(geminiMessages);

      let userRegistered = false;
      let statusUpdated = false;
      let newStatus: CaseStatus | undefined;
      let lawyerNeeded: boolean | undefined;
      let specializationRequired: string | undefined;
      let shouldShowFeedback = false;
      let feedbackReason: string | undefined;
      let appointmentScheduled = false;
      let appointmentDetails: any;
      let availabilityChecked = false;
      let availabilityData: any;

      // Processar function calls se existirem
      if (result.functionCalls) {
        console.log(`🔧 Executando ${result.functionCalls.length} function calls`);
        for (const functionCall of result.functionCalls) {
          console.log(`🔧 Function call: ${functionCall.name}`, functionCall.parameters);
          if (functionCall.name === 'register_user') {
            await this.handleUserRegistration(functionCall.parameters, conversationId);
            userRegistered = true;
            console.log('✅ Usuário registrado via function call');
          } else if (functionCall.name === 'update_conversation_status') {
            const statusResult = await this.handleStatusUpdate(functionCall.parameters, conversationId);
            statusUpdated = true;
            newStatus = statusResult.newStatus;
            lawyerNeeded = statusResult.lawyerNeeded;
            specializationRequired = statusResult.specializationRequired;
            console.log('✅ Status da conversa atualizado via function call');
          } else if (functionCall.name === 'detect_conversation_completion') {
            // Validação de parâmetros para evitar erros de runtime
            if (
              functionCall.parameters &&
              typeof functionCall.parameters === 'object'
            ) {
              if (typeof functionCall.parameters.should_show_feedback === 'boolean') {
                shouldShowFeedback = functionCall.parameters.should_show_feedback;
              } else {
                shouldShowFeedback = false;
                console.warn('⚠️ should_show_feedback ausente ou tipo inválido em detect_conversation_completion');
              }
              if (
                typeof functionCall.parameters.completion_reason === 'string' &&
                functionCall.parameters.completion_reason.length > 0
              ) {
                feedbackReason = functionCall.parameters.completion_reason;
              } else {
                feedbackReason = undefined;
                console.warn('⚠️ completion_reason ausente ou tipo inválido em detect_conversation_completion');
              }
            } else {
              shouldShowFeedback = false;
              feedbackReason = undefined;
              console.warn('⚠️ Parâmetros ausentes ou inválidos em detect_conversation_completion');
            }
            console.log(`✅ Detecção de conclusão de conversa: feedback=${shouldShowFeedback}, reason=${feedbackReason}`);
          } else if (functionCall.name === 'schedule_appointment') {
            try {
              const appointmentResult = await this.handleScheduleAppointment(functionCall.parameters, conversationId);
              appointmentScheduled = true;
              appointmentDetails = appointmentResult;
              console.log('✅ Agendamento criado via function call');
            } catch (error) {
              console.error('❌ Erro ao criar agendamento:', error);
            }
          } else if (functionCall.name === 'check_lawyer_availability') {
            try {
              const availability = await this.handleCheckAvailability(functionCall.parameters);
              availabilityChecked = true;
              availabilityData = availability;
              console.log('✅ Disponibilidade verificada via function call');
            } catch (error) {
              console.error('❌ Erro ao verificar disponibilidade:', error);
            }
          }
        }
      } else {
        console.log('ℹ️ Nenhuma function call executada');
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
        appointmentScheduled,
        appointmentDetails,
        availabilityChecked,
        availabilityData
      };

    } catch (error) {
      console.error('Erro no processamento inteligente:', error);
      // Fallback para resposta simples sem function calls
      const fallbackResponse = await this.geminiService.generateAIResponse([
        { text: message, sender: 'user' }
      ]);

      return {
        response: fallbackResponse
      };
    }
  }

  /**
   * Trata o registro de usuário via function call
   */
  private async handleUserRegistration(
    params: RegisterUserFunctionCall['parameters'],
    conversationId: string
  ): Promise<void> {
    try {
      // Usar o FluidRegistrationService para cadastro fluido
      const contactInfo = {
        email: params.email,
        phone: params.phone,
        name: params.name
      };

      const fluidResult = await this.fluidRegistrationService.processFluidRegistration(
        contactInfo,
        conversationId,
        '' // roomId será determinado pelo serviço
      );

      if (fluidResult.success) {
        console.log(`✅ Cadastro fluido processado: ${fluidResult.message}`);

        // Se foi criado/verificado automaticamente, atualizar conversa
        if (fluidResult.userId) {
          await this.conversationModel.findByIdAndUpdate(conversationId, {
            status: CaseStatus.ACTIVE,
            clientInfo: {
              name: params.name,
              email: params.email,
              phone: params.phone,
              userId: fluidResult.userId
            },
            priority: this.urgencyToPriorityMap[params.urgency_level] || 'low'
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
    conversationId: string
  ): Promise<void> {
    try {
      // Criar ou atualizar usuário diretamente
      const userData = {
        name: params.name,
        email: params.email || `${uuidv4()}@example.invalid`,
        role: 'client' as const,
        profile: {
          bio: `Problema relatado: ${params.problem_description}. Nível de urgência: ${params.urgency_level}`
        }
      };

      let user: IUser | null = null;
      if (params.email) {
        user = await this.userModel.findOne({ email: params.email });
      }

      if (user) {
        user.name = params.name;
        user.profile = {
          ...user.profile,
          bio: `Problema relatado: ${params.problem_description}. Nível de urgência: ${params.urgency_level}`
        };
        await user.save();
      } else {
        const newUser = new this.userModel(userData);
        user = await newUser.save();
      }

      await this.conversationModel.findByIdAndUpdate(conversationId, {
        userId: user._id,
        status: CaseStatus.ACTIVE,
        clientInfo: {
          name: params.name,
          email: params.email,
          phone: params.phone
        },
        priority: this.urgencyToPriorityMap[params.urgency_level] || 'low'
      });

      console.log(`Usuário registrado via fallback: ${user.name}`);

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
    conversationId: string
  ): Promise<{ newStatus: CaseStatus; lawyerNeeded: boolean; specializationRequired?: string }> {
    try {
      const updateData: any = {
        status: params.status,
        lawyerNeeded: params.lawyer_needed,
        lastUpdated: new Date()
      };

      if (params.specialization_required) {
        updateData.classification = {
          legalArea: params.specialization_required
        };
      }

      if (params.notes) {
        updateData.summary = {
          text: params.notes,
          lastUpdated: new Date(),
          generatedBy: 'ai'
        };
      }

      await this.conversationModel.findByIdAndUpdate(conversationId, updateData);

      console.log(`Status da conversa ${conversationId} atualizado para: ${params.status}`);

      return {
        newStatus: params.status as CaseStatus,
        lawyerNeeded: params.lawyer_needed,
        specializationRequired: params.specialization_required
      };

    } catch (error) {
      console.error('Erro ao atualizar status da conversa:', error);
      throw error;
    }
  }

  /**
   * Verifica se uma conversa precisa de intervenção humana (advogado)
   */
  async checkIfNeedsLawyerIntervention(conversationId: string): Promise<boolean> {
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
          count: { $sum: 1 }
        }
      }
    ]);

    const result: Record<CaseStatus, number> = {
      [CaseStatus.OPEN]: 0,
      [CaseStatus.ACTIVE]: 0,
      [CaseStatus.RESOLVED_BY_AI]: 0,
      [CaseStatus.ASSIGNED]: 0,
      [CaseStatus.ASSIGNED_TO_LAWYER]: 0,
      [CaseStatus.COMPLETED]: 0,
      [CaseStatus.CLOSED]: 0,
      [CaseStatus.ABANDONED]: 0,
      [CaseStatus.PENDING_REVIEW]: 0
    };

    stats.forEach(stat => {
      if (stat._id in result) {
        result[stat._id as CaseStatus] = stat.count;
      }
    });

    return result;
  }

  /**
   * Trata agendamento de consulta via function call
   */
  private async handleScheduleAppointment(
    params: ScheduleAppointmentFunctionCall['parameters'],
    conversationId: string
  ): Promise<any> {
    // Buscar informações da conversa
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }

    // Criar DTO para agendamento
    const createDto: CreateAppointmentDto = {
      conversationId,
      lawyerId: params.lawyer_id,
      clientInfo: {
        name: conversation.clientInfo?.name || 'Cliente',
        email: conversation.clientInfo?.email || '',
        phone: conversation.clientInfo?.phone
      },
      type: params.appointment_type as AppointmentType,
      scheduledDateTime: `${params.preferred_date}T${params.preferred_time}:00.000Z`,
      duration: params.duration_minutes || 60,
      notes: params.notes
    };

    // Criar o agendamento
    const appointment = await this.appointmentService.createAppointment(createDto);
    
    return {
      id: appointment._id,
      scheduledDateTime: appointment.scheduledDateTime,
      type: appointment.type,
      duration: appointment.duration,
      meetingDetails: appointment.meetingDetails
    };
  }

  /**
   * Verifica disponibilidade do advogado via function call
   */
  private async handleCheckAvailability(
    params: CheckLawyerAvailabilityFunctionCall['parameters']
  ): Promise<any> {
    const availability = await this.appointmentService.getLawyerAvailability(
      params.lawyer_id,
      params.date
    );

    return availability;
  }
}