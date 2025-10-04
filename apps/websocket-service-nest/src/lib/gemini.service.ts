import { Injectable } from '@nestjs/common';
import {
  GoogleGenerativeAI,
  SchemaType,
  Part,
  FileDataPart,
  TextPart,
} from '@google/generative-ai';
import { AIService } from './ai.service';
import {
  registerUserFunction,
  requireLawyerAssistanceFunction,
  detectConversationCompletionFunction,
} from './function-calling';

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

export interface RequireLawyerAssistanceFunctionCall {
  name: 'require_lawyer_assistance';
  parameters: {
    category?: string;
    specialization_required?: string;
    case_summary: string;
    required_specialties?: string;
  };
}

export interface DetectConversationCompletionFunctionCall {
  name: 'detect_conversation_completion';
  parameters: {
    should_show_feedback: boolean;
    completion_reason:
      | 'resolved_by_ai'
      | 'assigned'
      | 'user_satisfied'
      | 'user_abandoned';
    feedback_context?: string;
  };
}

export type FunctionCall =
  | RegisterUserFunctionCall
  | RequireLawyerAssistanceFunctionCall
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
  metadata?: Record<string, any>;
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

    const metadataType = message.metadata?.type;

    if (metadataType === 'function_call') {
      const functionName = message.metadata?.name;
      if (functionName) {
        const args =
          message.metadata?.arguments ??
          message.metadata?.params ??
          message.metadata?.parameters ??
          {};

        this.log('🔁 Incluindo histórico de function call no Gemini', {
          functionName,
        });

        parts.push({
          functionCall: {
            name: functionName,
            args,
          },
        } as Part);
        return parts;
      }
    }

    if (metadataType === 'function_response') {
      const functionName = message.metadata?.name;
      if (functionName) {
        const responsePayload =
          message.metadata?.result ??
          message.metadata?.response ??
          message.metadata?.data ??
          {};

        this.log('🔁 Incluindo histórico de retorno de função no Gemini', {
          functionName,
        });

        parts.push({
          functionResponse: {
            name: functionName,
            response: responsePayload,
          },
        } as Part);
        return parts;
      }
    }

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

  private getMessageRole(
    message: MessageWithAttachments,
  ): 'user' | 'model' | 'function' {
    const metadataType = message.metadata?.type;

    if (metadataType === 'function_response') {
      return 'function';
    }

    if (message.sender === 'user') {
      return 'user';
    }

    return 'model';
  }

  async getModel() {
    const config = await this.aiService.getCurrentConfig();
    const modelName = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

    return this.genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: config?.systemPrompt || 'Você é um assistente útil.',
    });
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
      .map((msg) => {
        const parts = this.buildMessageParts(msg);
        if (!parts.length) {
          return null;
        }

        return {
          role: this.getMessageRole(msg),
          parts,
        };
      })
      .filter(Boolean) as {
      role: 'user' | 'model' | 'function';
      parts: Part[];
    }[];

    // Preparar a última mensagem
    const lastMessageParts = this.buildMessageParts(lastMessage);

    // Log detalhado completo dos parts sendo enviados
    this.log(`🔍 GEMINI API REQUEST DETAILS:`);
    this.log(`📊 Total Parts da mensagem: ${lastMessageParts.length}`);

    // Log detalhado de cada part
    lastMessageParts.forEach((part, idx) => {
      if ('text' in part) {
        this.log(`  📝 Part ${idx}: TEXTO`);
        this.log(
          `     Conteúdo: "${part.text?.substring(0, 200)}${part.text && part.text.length > 200 ? '...' : ''}"`,
        );
      } else if ('fileData' in part) {
        this.log(`  📎 Part ${idx}: ARQUIVO`);
        this.log(`     URI: ${part.fileData?.fileUri}`);
        this.log(`     MimeType: ${part.fileData?.mimeType}`);
        this.log(
          `     Objeto completo:`,
          JSON.stringify(part.fileData, null, 2),
        );
      } else {
        this.log(`  ❓ Part ${idx}: TIPO DESCONHECIDO`);
        this.log(`     Objeto completo:`, JSON.stringify(part, null, 2));
      }
    });

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
            registerUserFunction as any,
            requireLawyerAssistanceFunction as any,
            detectConversationCompletionFunction as any,
          ],
        },
      ],
    });

    // Log do objeto sendo enviado (sanitizado para produção)
    if (process.env.NODE_ENV !== 'production') {
      this.log(`🚀 RESUMO DO OBJETO ENVIADO PARA GEMINI API:`);
      this.log(
        `Parts: ${lastMessageParts.length}, ` +
          `Types: [${lastMessageParts.map((p) => ('text' in p ? 'text' : 'fileData' in p ? 'fileData' : 'unknown')).join(', ')}], ` +
          `Mensagem (preview): "${lastMessage ? JSON.stringify(lastMessage).substring(0, 100) + (JSON.stringify(lastMessage).length > 100 ? '...' : '') : '[empty]'}", ` +
          `Histórico: ${messages.slice(0, -1).length} mensagens`,
      );
    } else {
      // Log sanitizado para produção
      this.log(
        `🚀 Enviando para Gemini: ${lastMessageParts.length} parts, ${messages.slice(0, -1).length} mensagens de histórico`,
      );
    }

    const result = await chat.sendMessage(lastMessageParts);

    this.log('Resposta recebida do Gemini');
    const response = result.response;
    const responseText = response.text();
    this.log(
      `Texto da resposta: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`,
    );

    const rawFunctionCalls: unknown = (response as any)?.functionCalls;
    if (Array.isArray(rawFunctionCalls) && rawFunctionCalls.length > 0) {
      this.log(
        `🔧 Function calls detectadas (nomes): ${rawFunctionCalls
          .map((call: any) => call?.name || '[sem-nome]')
          .join(', ')}`,
      );
    } else {
      this.log('ℹ️ Nenhuma function call detectada no payload bruto.');
    }

    const firstCandidate = (response as any)?.candidates?.[0];
    if (firstCandidate) {
      try {
        const candidatePreview = {
          finishReason: firstCandidate.finishReason,
          safetyRatings: firstCandidate.safetyRatings,
          parts: Array.isArray(firstCandidate.content?.parts)
            ? firstCandidate.content.parts.map((part: any, idx: number) => {
                if (part.functionCall) {
                  return {
                    index: idx,
                    type: 'functionCall',
                    name: part.functionCall.name,
                    hasArgs: Boolean(part.functionCall.args),
                  };
                }
                if (part.text) {
                  const textValue = String(part.text);
                  return {
                    index: idx,
                    type: 'text',
                    textPreview: `${textValue.substring(0, 120)}${
                      textValue.length > 120 ? '...' : ''
                    }`,
                  };
                }
                return { index: idx, type: Object.keys(part)[0] ?? 'unknown' };
              })
            : [],
        };
        this.log('📄 Candidate[0] preview:', candidatePreview);
      } catch (error) {
        this.log('⚠️ Falha ao serializar candidate[0] para log:', error);
      }
    }

    const promptFeedback = (response as any)?.promptFeedback;
    if (promptFeedback) {
      this.log('🛡️ Prompt feedback recebido:', promptFeedback);
    }

    if (!responseText?.trim()) {
      this.log('⚠️ Resposta textual vazia recebida do Gemini.');
    }

    const functionCalls: FunctionCall[] = [];

    const structuredCalls = this.extractFunctionCalls(response);
    this.log(
      `🧩 Function calls extraídas: ${structuredCalls.length}`,
      structuredCalls.map((call) => ({
        name: call.name,
        hasParameters: Boolean(call.parameters),
      })),
    );
    functionCalls.push(...structuredCalls);

    return {
      response: responseText,
      functionCalls,
    };
  }

  private extractFunctionCalls(response: any): FunctionCall[] {
    const collected: FunctionCall[] = [];

    if (!response) {
      this.log('ℹ️ extractFunctionCalls: resposta vazia recebida.');
      return collected;
    }

    let candidateCalls: any[] = [];

    if (Array.isArray(response.functionCalls)) {
      candidateCalls = response.functionCalls;
    }

    if (candidateCalls.length === 0) {
      const parts = response.candidates?.[0]?.content?.parts;
      if (Array.isArray(parts)) {
        candidateCalls = parts
          .filter((part: any) => Boolean(part?.functionCall))
          .map((part: any) => part.functionCall);
        if (candidateCalls.length > 0) {
          this.log(
            'ℹ️ extractFunctionCalls: function calls obtidas a partir de candidates[0].parts.',
          );
        }
      }
    }

    if (candidateCalls.length === 0) {
      return collected;
    }

    for (const call of candidateCalls) {
      if (!call?.name) {
        this.log('⚠️ Function call sem nome ignorada:', call);
        continue;
      }

      const normalizedArgs = call.args ?? call.arguments ?? {};

      switch (call.name) {
        case 'register_user':
          collected.push({
            name: 'register_user',
            parameters:
              normalizedArgs as RegisterUserFunctionCall['parameters'],
          });
          break;
        case 'require_lawyer_assistance':
          collected.push({
            name: 'require_lawyer_assistance',
            parameters:
              normalizedArgs as RequireLawyerAssistanceFunctionCall['parameters'],
          });
          break;
        case 'detect_conversation_completion':
          collected.push({
            name: 'detect_conversation_completion',
            parameters:
              normalizedArgs as DetectConversationCompletionFunctionCall['parameters'],
          });
          break;
        default:
          this.log(`ℹ️ Function call desconhecida ignorada: ${call.name}`);
          break;
      }
    }

    return collected;
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
