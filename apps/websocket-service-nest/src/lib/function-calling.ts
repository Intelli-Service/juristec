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
        enum: ['active', 'resolved_by_ai', 'assigned_to_lawyer', 'completed'],
      },
    },
    required: ['conversationId', 'status'],
  },
};
