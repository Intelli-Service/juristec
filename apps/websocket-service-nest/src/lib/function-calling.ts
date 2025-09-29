// Function calling definitions for Gemini AI
// These functions are used by the AI to perform actions

// Function calling definitions for Gemini AI
import { SchemaType } from '@google/generative-ai';

export const registerUserFunction = {
  name: 'register_user',
  description: 'Registra um novo usuário no sistema com os dados coletados',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      name: {
        type: SchemaType.STRING,
        description: 'Nome completo do usuário',
      },
      email: {
        type: SchemaType.STRING,
        description: 'Email do usuário',
      },
      phone: {
        type: SchemaType.STRING,
        description: 'Telefone do usuário (opcional)',
      },
    },
    required: ['name', 'email'],
  },
};

export const updateConversationStatusFunction = {
  name: 'update_conversation_status',
  description: 'Atualiza o status de uma conversa',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      conversationId: {
        type: SchemaType.STRING,
        description: 'ID da conversa',
      },
      status: {
        type: SchemaType.STRING,
        description: 'Novo status da conversa',
      },
    },
    required: ['conversationId', 'status'],
  },
};

export const detectConversationCompletionFunction = {
  name: 'detect_conversation_completion',
  description: 'Detecta quando uma conversa deve ser finalizada e se deve mostrar feedback ao usuário',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      should_show_feedback: {
        type: SchemaType.BOOLEAN,
        description: 'Se deve mostrar o modal de feedback ao usuário',
      },
      completion_reason: {
        type: SchemaType.STRING,
        description: 'Razão pela qual a conversa está sendo finalizada',
      },
      feedback_context: {
        type: SchemaType.STRING,
        description: 'Contexto adicional para o feedback (opcional)',
      },
    },
    required: ['should_show_feedback', 'completion_reason'],
  },
};
