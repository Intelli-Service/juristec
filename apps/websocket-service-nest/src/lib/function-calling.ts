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

export const requireLawyerAssistanceFunction = {
  name: 'require_lawyer_assistance',
  description: 'Indica que a conversa requer assistência de um advogado especialista',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      category: {
        type: SchemaType.STRING,
        description: 'Categoria geral do caso (ex: Trabalhista, Civil, Penal, etc.)',
      },
      specialization_required: {
        type: SchemaType.STRING,
        description: 'Especialização jurídica necessária (opcional)',
      },
      case_summary: {
        type: SchemaType.STRING,
        description: 'Resumo conciso do caso para o advogado avaliar rapidamente',
      },
      required_specialties: {
        type: SchemaType.STRING,
        description: 'Especialidades jurídicas específicas requeridas para o caso (opcional)',
      },
    },
    required: ['case_summary'],
  },
};

export const detectConversationCompletionFunction = {
  name: 'detect_conversation_completion',
  description:
    'Detecta quando uma conversa deve ser finalizada e se deve solicitar feedback ao usuário',
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
