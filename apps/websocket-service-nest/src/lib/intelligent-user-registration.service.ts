import { Injectable } from '@nestjs/common';
import { GeminiService, RegisterUserFunctionCall, UpdateConversationStatusFunctionCall } from './gemini.service';
import { AIService } from './ai.service';
import { MessageService } from './message.service';
import Conversation from '../models/Conversation';
import { IUser } from '../models/User';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export enum ConversationStatus {
  COLLECTING_DATA = 'collecting_data',
  ANALYZING_CASE = 'analyzing_case',
  CONNECTING_LAWYER = 'connecting_lawyer',
  RESOLVED = 'resolved'
}

export interface IntelligentRegistrationResult {
  response: string;
  userRegistered?: boolean;
  statusUpdated?: boolean;
  newStatus?: ConversationStatus;
  lawyerNeeded?: boolean;
  specializationRequired?: string;
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
    @InjectModel('User') private userModel: Model<IUser>,
    @InjectModel(Conversation.name) private conversationModel: Model<any>
  ) {}

  /**
   * Processa uma mensagem do usuário usando IA para cadastro inteligente
   */
  async processUserMessage(
    message: string,
    conversationId: string,
    userId?: string
  ): Promise<IntelligentRegistrationResult> {
    try {
      // Buscar histórico da conversa usando o método correto
      const messages = await this.messageService.getMessages(
        { conversationId, limit: 50 },
        { userId: userId || '', role: 'client', permissions: [] }
      );

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
      let newStatus: ConversationStatus | undefined;
      let lawyerNeeded: boolean | undefined;
      let specializationRequired: string | undefined;

      // Processar function calls se existirem
      if (result.functionCalls) {
        for (const functionCall of result.functionCalls) {
          if (functionCall.name === 'register_user') {
            await this.handleUserRegistration(functionCall.parameters, conversationId);
            userRegistered = true;
          } else if (functionCall.name === 'update_conversation_status') {
            const statusResult = await this.handleStatusUpdate(functionCall.parameters, conversationId);
            statusUpdated = true;
            newStatus = statusResult.newStatus;
            lawyerNeeded = statusResult.lawyerNeeded;
            specializationRequired = statusResult.specializationRequired;
          }
        }
      }

      return {
        response: result.response,
        userRegistered,
        statusUpdated,
        newStatus,
        lawyerNeeded,
        specializationRequired
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
      // Criar ou atualizar usuário
      const userData = {
        name: params.name,
        email: params.email || `${uuidv4()}@temp.juristec.com`, // Email temporário único se não fornecido
        role: 'client' as const,
        profile: {
          bio: `Problema relatado: ${params.problem_description}. Nível de urgência: ${params.urgency_level}`
        }
      };

      // Verificar se usuário já existe por email
      let user: IUser | null = null;
      if (params.email) {
        user = await this.userModel.findOne({ email: params.email });
      }

      if (user) {
        // Atualizar usuário existente
        user.name = params.name;
        user.profile = {
          ...user.profile,
          bio: `Problema relatado: ${params.problem_description}. Nível de urgência: ${params.urgency_level}`
        };
        await user.save();
      } else {
        // Criar novo usuário
        const newUser = new this.userModel(userData);
        user = await newUser.save();
      }

      // Atualizar conversa com ID do usuário
      await this.conversationModel.findByIdAndUpdate(conversationId, {
        userId: user._id,
        status: ConversationStatus.COLLECTING_DATA,
        clientInfo: {
          name: params.name,
          email: params.email,
          phone: params.phone
        },
        priority: this.urgencyToPriorityMap[params.urgency_level] || 'low'
      });

      console.log(`Usuário registrado/atualizado: ${user.name}`);

    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      throw error;
    }
  }

  /**
   * Trata a atualização de status da conversa via function call
   */
  private async handleStatusUpdate(
    params: UpdateConversationStatusFunctionCall['parameters'],
    conversationId: string
  ): Promise<{ newStatus: ConversationStatus; lawyerNeeded: boolean; specializationRequired?: string }> {
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
        newStatus: params.status as ConversationStatus,
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
  async getConversationStats(): Promise<Record<ConversationStatus, number>> {
    const stats = await this.conversationModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result: Record<ConversationStatus, number> = {
      [ConversationStatus.COLLECTING_DATA]: 0,
      [ConversationStatus.ANALYZING_CASE]: 0,
      [ConversationStatus.CONNECTING_LAWYER]: 0,
      [ConversationStatus.RESOLVED]: 0
    };

    stats.forEach(stat => {
      if (stat._id in result) {
        result[stat._id as ConversationStatus] = stat.count;
      }
    });

    return result;
  }
}