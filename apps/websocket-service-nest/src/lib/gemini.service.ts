import { Injectable } from '@nestjs/common';
import {
  GoogleGenerativeAI,
  SchemaType,
  Part,
  FileDataPart,
  TextPart,
} from '@google/generative-ai';
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
    status:
      | 'active'
      | 'resolved_by_ai'
      | 'assigned_to_lawyer'
      | 'completed'
      | 'abandoned';
    lawyer_needed: boolean;
    specialization_required?: string;
    notes?: string;
  };
}

export interface DetectConversationCompletionFunctionCall {
  name: 'detect_conversation_completion';
  parameters: {
    should_show_feedback: boolean;
    completion_reason:
      | 'resolved_by_ai'
      | 'assigned_to_lawyer'
      | 'user_satisfied'
      | 'user_abandoned';
    feedback_context?: string;
  };
}

export type FunctionCall =
  | RegisterUserFunctionCall
  | UpdateConversationStatusFunctionCall
  | DetectConversationCompletionFunctionCall;

export interface GeminiAttachment {
  fileUri: string;
  mimeType: string;
  displayName?: string;
}

export interface MessageWithAttachments {
  text: string;
  sender: string;
  attachments?: GeminiAttachment[];
}

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private isDevelopment = process.env.NODE_ENV !== 'production';

  constructor(private aiService: AIService) {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  }

  private log(message: string, data?: any) {
    if (this.isDevelopment) {
      if (data) {
        console.log(`🤖 ${message}`, data);
      } else {
        console.log(`🤖 ${message}`);
      }
    }
  }

  /**
   * Converte uma mensagem com anexos em Parts do Gemini
   */
  private buildMessageParts(message: MessageWithAttachments): Part[] {
    const parts: Part[] = [];

    // Adicionar texto da mensagem se existir
    if (message.text && message.text.trim()) {
      parts.push({
        text: message.text,
      } as TextPart);
    }

    // Adicionar arquivos como FileDataParts
    if (message.attachments && message.attachments.length > 0) {
      message.attachments.forEach((attachment) => {
        console.log(`📎 Adding file to Gemini parts:`, {
          fileUri: attachment.fileUri,
          mimeType: attachment.mimeType,
          displayName: attachment.displayName,
        });

        parts.push({
          fileData: {
            fileUri: attachment.fileUri,
            mimeType: attachment.mimeType,
          },
        } as FileDataPart);
      });
    }

    return parts;
  }

  async getModel() {
    const config = await this.aiService.getCurrentConfig();
    const modelName = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

    return this.genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: config?.systemPrompt || 'Você é um assistente útil.',
    });
  }

  async generateAIResponse(
    messages: { text: string; sender: string }[],
  ): Promise<string> {
    const model = await this.getModel();
    const config = await this.aiService.getCurrentConfig();

    // Preparar histórico para chat session
    const history = messages.slice(0, -1).map((msg) => ({
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
      tools: [
        {
          functionDeclarations: [
            {
              name: 'register_user',
              description:
                'Registra um novo usuário no sistema com dados coletados da conversa',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  name: {
                    type: SchemaType.STRING,
                    description: 'Nome completo do usuário',
                  },
                  email: {
                    type: SchemaType.STRING,
                    description: 'Email do usuário (opcional se não fornecido)',
                  },
                  phone: {
                    type: SchemaType.STRING,
                    description:
                      'Telefone/WhatsApp do usuário (opcional se não fornecido)',
                  },
                  problem_description: {
                    type: SchemaType.STRING,
                    description:
                      'Descrição resumida do problema jurídico relatado',
                  },
                  urgency_level: {
                    type: SchemaType.STRING,
                    format: 'enum',
                    enum: ['low', 'medium', 'high', 'urgent'],
                    description:
                      'Nível de urgência do caso baseado na descrição',
                  },
                },
                required: ['name', 'problem_description', 'urgency_level'],
              },
            },
            {
              name: 'update_conversation_status',
              description:
                'Atualiza o status da conversa e determina próximos passos',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  status: {
                    type: SchemaType.STRING,
                    format: 'enum',
                    enum: [
                      'open',
                      'active',
                      'resolved_by_ai',
                      'assigned_to_lawyer',
                      'completed',
                      'abandoned',
                    ],
                    description:
                      'Status atual da conversa para controle de feedback inteligente',
                  },
                  lawyer_needed: {
                    type: SchemaType.BOOLEAN,
                    description: 'Se é necessário conectar com um advogado',
                  },
                  specialization_required: {
                    type: SchemaType.STRING,
                    description:
                      'Especialização jurídica necessária (se lawyer_needed for true)',
                  },
                  notes: {
                    type: SchemaType.STRING,
                    description: 'Notas adicionais sobre a conversa ou decisão',
                  },
                },
                required: ['status', 'lawyer_needed'],
              },
            },
            {
              name: 'detect_conversation_completion',
              description:
                'Detecta quando uma conversa deve mostrar feedback baseado no contexto e intenção do usuário',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  should_show_feedback: {
                    type: SchemaType.BOOLEAN,
                    description:
                      'Se deve mostrar o modal de feedback para esta conversa',
                  },
                  completion_reason: {
                    type: SchemaType.STRING,
                    format: 'enum',
                    enum: [
                      'resolved_by_ai',
                      'assigned_to_lawyer',
                      'user_satisfied',
                      'user_abandoned',
                    ],
                    description:
                      'Razão pela qual a conversa deve mostrar feedback',
                  },
                  feedback_context: {
                    type: SchemaType.STRING,
                    description:
                      'Contexto adicional sobre por que o feedback deve ser mostrado',
                  },
                },
                required: ['should_show_feedback', 'completion_reason'],
              },
            },
          ],
        },
      ],
    });

    // Última mensagem do usuário
    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.text);

    return result.response.text();
  }

  async generateAIResponseWithFunctions(
    messages: MessageWithAttachments[],
  ): Promise<{ response: string; functionCalls?: FunctionCall[] }> {
    const model = await this.getModel();
    const config = await this.aiService.getCurrentConfig();

    this.log('GEMINI SERVICE - Iniciando processamento com suporte a arquivos');
    this.log(`Total de mensagens recebidas: ${messages.length}`);

    // Log detalhado dos anexos
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.attachments && lastMessage.attachments.length > 0) {
      this.log(`📎 ANEXOS ENCONTRADOS: ${lastMessage.attachments.length}`);
      lastMessage.attachments.forEach((attachment, idx) => {
        this.log(
          `  ${idx + 1}. ${attachment.displayName || 'Arquivo sem nome'}`,
        );
        this.log(`     Tipo: ${attachment.mimeType}`);
        this.log(`     URL: ${attachment.fileUri}`);
      });
    }

    // Preparar histórico para chat session
    const history = messages
      .slice(0, -1)
      .filter((msg) => msg.sender === 'user' || msg.sender === 'ai')
      .map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: this.buildMessageParts(msg),
      }));

    // Iniciar chat com histórico
    const chat = model.startChat({
      history,
      generationConfig: {
        maxOutputTokens: config?.behaviorSettings?.maxTokens || 1000,
        temperature: config?.behaviorSettings?.temperature || 0.7,
      },
      tools: [
        {
          functionDeclarations: [
            {
              name: 'register_user',
              description:
                'Registra um novo usuário no sistema com dados coletados da conversa',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  name: {
                    type: SchemaType.STRING,
                    description: 'Nome completo do usuário',
                  },
                  email: {
                    type: SchemaType.STRING,
                    description: 'Email do usuário (opcional se não fornecido)',
                  },
                  phone: {
                    type: SchemaType.STRING,
                    description:
                      'Telefone/WhatsApp do usuário (opcional se não fornecido)',
                  },
                  problem_description: {
                    type: SchemaType.STRING,
                    description:
                      'Descrição resumida do problema jurídico relatado',
                  },
                  urgency_level: {
                    type: SchemaType.STRING,
                    format: 'enum',
                    enum: ['low', 'medium', 'high', 'urgent'],
                    description:
                      'Nível de urgência do caso baseado na descrição',
                  },
                },
                required: ['name', 'problem_description', 'urgency_level'],
              },
            },
            {
              name: 'update_conversation_status',
              description:
                'Atualiza o status da conversa e determina próximos passos',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  status: {
                    type: SchemaType.STRING,
                    format: 'enum',
                    enum: [
                      'open',
                      'active',
                      'resolved_by_ai',
                      'assigned_to_lawyer',
                      'completed',
                      'abandoned',
                    ],
                    description:
                      'Status atual da conversa para controle de feedback inteligente',
                  },
                  lawyer_needed: {
                    type: SchemaType.BOOLEAN,
                    description: 'Se é necessário conectar com um advogado',
                  },
                  specialization_required: {
                    type: SchemaType.STRING,
                    description:
                      'Especialização jurídica necessária (se lawyer_needed for true)',
                  },
                  notes: {
                    type: SchemaType.STRING,
                    description: 'Notas adicionais sobre a conversa ou decisão',
                  },
                },
                required: ['status', 'lawyer_needed'],
              },
            },
            {
              name: 'detect_conversation_completion',
              description:
                'Detecta quando uma conversa deve mostrar feedback baseado no contexto e intenção do usuário',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  should_show_feedback: {
                    type: SchemaType.BOOLEAN,
                    description:
                      'Se deve mostrar o modal de feedback para esta conversa',
                  },
                  completion_reason: {
                    type: SchemaType.STRING,
                    format: 'enum',
                    enum: [
                      'resolved_by_ai',
                      'assigned_to_lawyer',
                      'user_satisfied',
                      'user_abandoned',
                    ],
                    description:
                      'Razão pela qual a conversa deve mostrar feedback',
                  },
                  feedback_context: {
                    type: SchemaType.STRING,
                    description:
                      'Contexto adicional sobre por que o feedback deve ser mostrado',
                  },
                },
                required: ['should_show_feedback', 'completion_reason'],
              },
            },
          ],
        },
      ],
    });

    this.log('Enviando mensagem para Gemini...');
    const lastMessageParts = this.buildMessageParts(lastMessage);

    // Log detalhado completo dos parts sendo enviados
    this.log(`🔍 GEMINI API REQUEST DETAILS:`);
    this.log(`📊 Total Parts da mensagem: ${lastMessageParts.length}`);
    
    // Log detalhado de cada part
    lastMessageParts.forEach((part, idx) => {
      if ('text' in part) {
        this.log(`  📝 Part ${idx}: TEXTO`);
        this.log(`     Conteúdo: "${part.text?.substring(0, 200)}${part.text && part.text.length > 200 ? '...' : ''}"`);
      } else if ('fileData' in part) {
        this.log(`  📎 Part ${idx}: ARQUIVO`);
        this.log(`     URI: ${part.fileData?.fileUri}`);
        this.log(`     MimeType: ${part.fileData?.mimeType}`);
        this.log(`     Objeto completo:`, JSON.stringify(part.fileData, null, 2));
      } else {
        this.log(`  ❓ Part ${idx}: TIPO DESCONHECIDO`);
        this.log(`     Objeto completo:`, JSON.stringify(part, null, 2));
      }
    });

    // Log do objeto completo sendo enviado para Gemini
    this.log(`🚀 OBJETO COMPLETO ENVIADO PARA GEMINI API:`);
    this.log(JSON.stringify({
      parts: lastMessageParts,
      message: lastMessage,
      historyLength: messages.slice(0, -1).length
    }, null, 2));

    const result = await chat.sendMessage(lastMessageParts);

    this.log('Resposta recebida do Gemini');
    const response = result.response;
    this.log(
      `Texto da resposta: ${response.text().substring(0, 200)}${response.text().length > 200 ? '...' : ''}`,
    );

    const functionCalls: FunctionCall[] = [];

    // Verificar function calls na resposta
    if (response.functionCalls && Array.isArray(response.functionCalls)) {
      for (const call of response.functionCalls) {
        if (call.name === 'register_user') {
          functionCalls.push({
            name: 'register_user',
            parameters: call.args as RegisterUserFunctionCall['parameters'],
          });
        } else if (call.name === 'update_conversation_status') {
          functionCalls.push({
            name: 'update_conversation_status',
            parameters:
              call.args as UpdateConversationStatusFunctionCall['parameters'],
          });
        } else if (call.name === 'detect_conversation_completion') {
          functionCalls.push({
            name: 'detect_conversation_completion',
            parameters:
              call.args as DetectConversationCompletionFunctionCall['parameters'],
          });
        }
      }
    }

    return {
      response: response.text(),
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
    };
  }

  /**
   * Método legado para compatibilidade - usa apenas texto
   * @deprecated Use generateAIResponseWithFunctions com MessageWithAttachments
   */
  async generateAIResponseWithFunctionsLegacy(
    messages: { text: string; sender: string }[],
  ): Promise<{ response: string; functionCalls?: FunctionCall[] }> {
    // Converter mensagens legadas para o novo formato
    const messagesWithAttachments: MessageWithAttachments[] = messages.map(
      (msg) => ({
        text: msg.text,
        sender: msg.sender,
        attachments: [],
      }),
    );

    return this.generateAIResponseWithFunctions(messagesWithAttachments);
  }

  // Método para atualizar o prompt do sistema (para administração)
  updateSystemPrompt() {
    // Este método agora delega para o AIService
    // Use AIService.updateConfig() para atualizar o prompt do sistema
  }

  // Método para obter o prompt atual
  async getSystemPrompt(): Promise<string> {
    const config = await this.aiService.getCurrentConfig();
    return config?.systemPrompt || '';
  }
}
