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
    status: 'active' | 'resolved_by_ai' | 'assigned_to_lawyer' | 'completed' | 'abandoned';
    lawyer_needed: boolean;
    specialization_required?: string;
    notes?: string;
  };
}

export interface DetectConversationCompletionFunctionCall {
  name: 'detect_conversation_completion';
  parameters: {
    should_show_feedback: boolean;
    completion_reason: 'resolved_by_ai' | 'assigned_to_lawyer' | 'user_satisfied' | 'user_abandoned';
    feedback_context?: string;
  };
}

export interface ScheduleAppointmentFunctionCall {
  name: 'schedule_appointment';
  parameters: {
    lawyer_id: string;
    appointment_type: 'video' | 'phone' | 'in_person';
    preferred_date: string; // YYYY-MM-DD
    preferred_time: string; // HH:MM
    duration_minutes?: number;
    notes?: string;
  };
}

export interface CheckLawyerAvailabilityFunctionCall {
  name: 'check_lawyer_availability';
  parameters: {
    lawyer_id: string;
    date: string; // YYYY-MM-DD
  };
}

export type FunctionCall = RegisterUserFunctionCall | UpdateConversationStatusFunctionCall | DetectConversationCompletionFunctionCall | ScheduleAppointmentFunctionCall | CheckLawyerAvailabilityFunctionCall;

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
                    enum: ['active', 'resolved_by_ai', 'assigned_to_lawyer', 'completed', 'abandoned'],
                    description: 'Status atual da conversa para controle de feedback inteligente'
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
            },
            {
              name: 'detect_conversation_completion',
              description: 'Detecta quando uma conversa deve mostrar feedback baseado no contexto e intenção do usuário',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  should_show_feedback: {
                    type: SchemaType.BOOLEAN,
                    description: 'Se deve mostrar o modal de feedback para esta conversa'
                  },
                  completion_reason: {
                    type: SchemaType.STRING,
                    format: 'enum',
                    enum: ['resolved_by_ai', 'assigned_to_lawyer', 'user_satisfied', 'user_abandoned'],
                    description: 'Razão pela qual a conversa deve mostrar feedback'
                  },
                  feedback_context: {
                    type: SchemaType.STRING,
                    description: 'Contexto adicional sobre por que o feedback deve ser mostrado'
                  }
                },
                required: ['should_show_feedback', 'completion_reason']
              }
            },
            {
              name: 'schedule_appointment',
              description: 'Agenda uma consulta com um advogado específico para casos em andamento',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  lawyer_id: {
                    type: SchemaType.STRING,
                    description: 'ID do advogado responsável pelo caso'
                  },
                  appointment_type: {
                    type: SchemaType.STRING,
                    format: 'enum',
                    enum: ['video', 'phone', 'in_person'],
                    description: 'Tipo de consulta: por vídeo, telefone ou presencial'
                  },
                  preferred_date: {
                    type: SchemaType.STRING,
                    description: 'Data preferida para agendamento (formato YYYY-MM-DD)'
                  },
                  preferred_time: {
                    type: SchemaType.STRING,
                    description: 'Horário preferido para agendamento (formato HH:MM)'
                  },
                  duration_minutes: {
                    type: SchemaType.NUMBER,
                    description: 'Duração da consulta em minutos (padrão: 60)'
                  },
                  notes: {
                    type: SchemaType.STRING,
                    description: 'Observações sobre o agendamento'
                  }
                },
                required: ['lawyer_id', 'appointment_type', 'preferred_date', 'preferred_time']
              }
            },
            {
              name: 'check_lawyer_availability',
              description: 'Verifica disponibilidade de horários de um advogado para agendamento',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  lawyer_id: {
                    type: SchemaType.STRING,
                    description: 'ID do advogado para verificar disponibilidade'
                  },
                  date: {
                    type: SchemaType.STRING,
                    description: 'Data para verificar disponibilidade (formato YYYY-MM-DD)'
                  }
                },
                required: ['lawyer_id', 'date']
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
    console.log('🔍 Enviando para Gemini:', lastMessage.text);
    console.log('🔍 System prompt ativo:', config?.systemPrompt?.substring(0, 200) + '...');

    const result = await chat.sendMessage(lastMessage.text);

    const response = result.response;
    const functionCalls: FunctionCall[] = [];

    // Debug: verificar estrutura da resposta
    console.log('🔍 Resposta completa do Gemini:', JSON.stringify(response, null, 2));

    // Verificar function calls na resposta
    if (response.functionCalls && Array.isArray(response.functionCalls)) {
      console.log(`🔧 Encontradas ${response.functionCalls.length} function calls`);
      for (const call of response.functionCalls) {
        console.log(`🔧 Function call: ${call.name}`, call.args);
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
        } else if (call.name === 'detect_conversation_completion') {
          functionCalls.push({
            name: 'detect_conversation_completion',
            parameters: call.args as DetectConversationCompletionFunctionCall['parameters']
          });
        }
      }
    } else {
      console.log('ℹ️ Nenhuma function call na resposta');
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