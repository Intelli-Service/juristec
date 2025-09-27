import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import AIConfig from '../models/AIConfig'; // Corrigido
import { IAIConfig } from '../models/AIConfig'; // Corrigido
import { IConversation } from '../models/Conversation'; // Corrigido
import Conversation from '../models/Conversation';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private genAI: GoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GOOGLE_API_KEY');
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not defined in the environment');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private async getAIConfig(): Promise<IAIConfig> {
    try {
      const config = await AIConfig.findOne().sort({ createdAt: -1 }).exec();
      if (!config) {
        throw new Error(
          'AI configuration not found in database. System cannot operate without proper configuration.',
        );
      }
      return config;
    } catch (error) {
      this.logger.error('Error fetching AI configuration:', error);
      throw new Error(
        'System is currently experiencing technical difficulties. Please try again later.',
      );
    }
  }

  private getDefaultConfig(): IAIConfig {
    return {
      systemPrompt:
        'Você é um assistente jurídico brasileiro. Sua principal função é realizar uma triagem inicial de casos, coletando informações essenciais do usuário de forma natural e conversacional. Com base nos dados, você deve classificar o caso, avaliar sua complexidade e, se necessário, encaminhá-lo para um advogado especialista. Use as funções disponíveis para registrar novos usuários e atualizar o status da conversa quando a coleta de dados for concluída.',
      behaviorSettings: {
        maxTokens: 2048,
        temperature: 0.7,
        ethicalGuidelines: [
          'Sempre manter confidencialidade',
          'Não dar aconselhamento jurídico definitivo',
        ],
        specializationAreas: [
          'Direito Civil',
          'Direito Trabalhista',
          'Direito Empresarial',
        ],
      },
      classificationSettings: {
        enabled: true,
        categories: [
          'Direito Civil',
          'Direito Trabalhista',
          'Direito Penal',
          'Direito Empresarial',
        ],
        summaryTemplate: 'Resumo do caso: [categoria] - [complexidade]',
      },
      updatedBy: 'system',
      updatedAt: new Date(),
      createdAt: new Date(),
    } as IAIConfig;
  }

  async generateResponse(
    conversationHistory: any[],
    _conversation?: IConversation,
  ): Promise<any> {
    try {
      const aiConfig = await this.getAIConfig();
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: aiConfig.behaviorSettings.temperature,
          topK: 50,
          topP: 0.9,
          maxOutputTokens: aiConfig.behaviorSettings.maxTokens,
        },
        systemInstruction: aiConfig.systemPrompt,
        // tools: [
        //   {
        //     functionDeclarations: [
        //       registerUserFunction,
        //       updateConversationStatusFunction,
        //     ],
        //   },
        // ],
      });

      const chat = model.startChat({
        history: conversationHistory,
      });

      const lastMessage =
        conversationHistory[conversationHistory.length - 1].parts[0].text;
      const result = await chat.sendMessage(lastMessage);
      const response = result.response;

      const functionCalls = response.functionCalls();
      if (functionCalls && functionCalls.length > 0) {
        this.logger.log('Function call detected:', functionCalls);
        return {
          type: 'function_call',
          calls: functionCalls.map((call) => ({
            name: call.name,
            args: call.args,
          })),
        };
      }

      const text = response.text();
      this.logger.log('AI Response:', text);
      return { type: 'text', content: text };
    } catch (error) {
      this.logger.error('Error generating AI response:', error);

      // Se o erro for relacionado à configuração do sistema, propagar a mensagem específica
      if (
        error instanceof Error &&
        error.message.includes('technical difficulties')
      ) {
        throw error;
      }

      throw new Error('Failed to generate AI response');
    }
  }

  // Método para obter configuração atual (usado pelo admin.controller)
  async getCurrentConfig(): Promise<IAIConfig> {
    return this.getAIConfig();
  }

  // Método para atualizar configuração (usado pelo admin.controller)
  async updateConfig(
    updates: Partial<IAIConfig>,
    _updatedBy: string,
  ): Promise<IAIConfig> {
    try {
      const existingConfig = await AIConfig.findOne()
        .sort({ createdAt: -1 })
        .exec();

      if (existingConfig) {
        // Atualizar configuração existente
        Object.assign(existingConfig, updates, { updatedAt: new Date() });
        return await existingConfig.save();
      } else {
        // Criar nova configuração
        const newConfig = new AIConfig({
          ...this.getDefaultConfig(),
          ...updates,
        });
        return await newConfig.save();
      }
    } catch (error) {
      this.logger.error('Error updating AI configuration:', error);
      throw new Error('Failed to update AI configuration');
    }
  }

  // Método para classificar conversa (usado pelo chat.gateway)
  async classifyConversation(conversationId: string): Promise<any> {
    try {
      // Implementação básica de classificação
      this.logger.log(`Classifying conversation: ${conversationId}`);

      // Por enquanto, retorna uma classificação simples
      // Pode ser expandido para usar IA para classificação real
      return {
        category: 'legal_consultation',
        complexity: 'medium',
        priority: 'normal',
        estimatedTime: '30 minutes',
      };
    } catch (error) {
      this.logger.error('Error classifying conversation:', error);
      throw new Error('Failed to classify conversation');
    }
  }

  // Método para atualizar dados do usuário (usado pelo user-data-collection.service)
  async updateUserData(conversationId: string, updateData: any): Promise<void> {
    try {
      this.logger.log(
        `Updating user data for conversation: ${conversationId}`,
        updateData,
      );

      // Implementação básica - pode ser expandida para persistir dados
      // Por enquanto, apenas loga os dados
    } catch (error) {
      this.logger.error('Error updating user data:', error);
      throw new Error('Failed to update user data');
    }
  }

  async getCasesForLawyer(lawyerId: string): Promise<any[]> {
    try {
      this.logger.log(`Getting cases for lawyer: ${lawyerId}`);

      // Buscar conversas atribuídas ao advogado ou disponíveis
      const conversations = await Conversation.find({
        $or: [
          { assignedTo: lawyerId },
          { status: 'open' }, // Casos disponíveis
        ],
      })
        .select('roomId status assignedTo createdAt')
        .exec();

      return conversations.map((conv) => ({
        roomId: conv.roomId,
        status: conv.status,
        assignedTo: conv.assignedTo,
        createdAt: conv.createdAt,
      }));
    } catch (error) {
      this.logger.error('Error getting cases for lawyer:', error);
      throw new Error('Failed to get cases for lawyer');
    }
  }

  async assignCase(
    roomId: string,
    lawyerId: string,
  ): Promise<{ success: boolean }> {
    try {
      this.logger.log(`Assigning case ${roomId} to lawyer ${lawyerId}`);

      const result = await Conversation.findOneAndUpdate(
        { roomId, status: 'open' }, // Só pode atribuir casos abertos
        {
          assignedTo: lawyerId,
          status: 'assigned',
          assignedAt: new Date(),
        },
        { new: true },
      ).exec();

      if (!result) {
        throw new Error('Case not found or already assigned');
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Error assigning case:', error);
      throw new Error('Failed to assign case');
    }
  }
}
