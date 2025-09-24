import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { AIService } from './ai.service';

export interface RegisterUserFunctionCall {
  name: 'register_user';
  parameters: {
    name: string;
    email?: string;
    phone?: string;
    problem_description: string;
    urgency_level: 'low' | 'medium' | 'high' | 'urgent';
  };
}

export interface UpdateConversationStatusFunctionCall {
  name: 'update_conversation_status';
  parameters: {
    status: 'collecting_data' | 'analyzing_case' | 'connecting_lawyer' | 'resolved';
    lawyer_needed: boolean;
    specialization_required?: string;
    notes?: string;
  };
}

export type FunctionCall = RegisterUserFunctionCall | UpdateConversationStatusFunctionCall;

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;

  constructor(private aiService: AIService) {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  }

  getModel() {
    const config = this.aiService.getCurrentConfig();
    return this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: config?.systemPrompt || 'Você é um assistente útil.',
      tools: [
        {
          functionDeclarations: [
            {
              name: 'register_user',
              description: 'Registra um novo usuário no sistema com dados coletados da conversa',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  name: {
                    type: SchemaType.STRING,
                    description: 'Nome completo do usuário'
                  },
                  email: {
                    type: SchemaType.STRING,
                    description: 'Email do usuário (opcional se não fornecido)'
                  },
                  phone: {
                    type: SchemaType.STRING,
                    description: 'Telefone/WhatsApp do usuário (opcional se não fornecido)'
                  },
                  problem_description: {
                    type: SchemaType.STRING,
                    description: 'Descrição resumida do problema jurídico relatado'
                  },
                  urgency_level: {
                    type: SchemaType.STRING,
                    format: 'enum',
                    enum: ['low', 'medium', 'high', 'urgent'],
                    description: 'Nível de urgência do caso baseado na descrição'
                  }
                },
                required: ['name', 'problem_description', 'urgency_level']
              }
            },
            {
              name: 'update_conversation_status',
              description: 'Atualiza o status da conversa e determina próximos passos',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  status: {
                    type: SchemaType.STRING,
                    format: 'enum',
                    enum: ['collecting_data', 'analyzing_case', 'connecting_lawyer', 'resolved'],
                    description: 'Status atual da conversa'
                  },
                  lawyer_needed: {
                    type: SchemaType.BOOLEAN,
                    description: 'Se é necessário conectar com um advogado'
                  },
                  specialization_required: {
                    type: SchemaType.STRING,
                    description: 'Especialização jurídica necessária (se lawyer_needed for true)'
                  },
                  notes: {
                    type: SchemaType.STRING,
                    description: 'Notas adicionais sobre a conversa ou decisão'
                  }
                },
                required: ['status', 'lawyer_needed']
              }
            }
          ]
        }
      ]
    });
  }

  async generateAIResponse(messages: { text: string; sender: string }[]): Promise<string> {
    const model = this.getModel();
    const config = this.aiService.getCurrentConfig();

    // Preparar histórico para chat session
    const history = messages.slice(0, -1).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    // Iniciar chat com histórico
    const chat = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: config?.behaviorSettings?.maxTokens || 1000,
        temperature: config?.behaviorSettings?.temperature || 0.7,
      },
    });

    // Última mensagem do usuário
    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.text);

    return result.response.text();
  }

  async generateAIResponseWithFunctions(
    messages: { text: string; sender: string }[]
  ): Promise<{ response: string; functionCalls?: FunctionCall[] }> {
    const model = this.getModel();
    const config = this.aiService.getCurrentConfig();

    // Preparar histórico para chat session
    const history = messages.slice(0, -1).map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    // Iniciar chat com histórico
    const chat = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: config?.behaviorSettings?.maxTokens || 1000,
        temperature: config?.behaviorSettings?.temperature || 0.7,
      },
    });

    // Última mensagem do usuário
    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.text);

    const response = result.response;
    const functionCalls: FunctionCall[] = [];

    // Processar function calls se existirem
    if (response.functionCalls && typeof response.functionCalls === 'function') {
      const functionCallsFn = response.functionCalls;
      const calls = functionCallsFn();
      if (calls) {
        for (const call of calls) {
          if (call.name === 'register_user') {
            functionCalls.push({
              name: 'register_user',
              parameters: call.args as RegisterUserFunctionCall['parameters']
            });
          } else if (call.name === 'update_conversation_status') {
            functionCalls.push({
              name: 'update_conversation_status',
              parameters: call.args as UpdateConversationStatusFunctionCall['parameters']
            });
          }
        }
      }
    }

    return {
      response: response.text(),
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined
    };
  }

  // Método para atualizar o prompt do sistema (para administração)
  updateSystemPrompt(newPrompt: string) {
    // Este método agora delega para o AIService
    console.log('Use AIService.updateConfig() para atualizar o prompt do sistema');
  }

  // Método para obter o prompt atual
  getSystemPrompt(): string {
    const config = this.aiService.getCurrentConfig();
    return config?.systemPrompt || '';
  }
}