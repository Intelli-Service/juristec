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
  description:
    'Indica que a conversa requer assistência de um advogado especialista',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      category: {
        type: SchemaType.STRING,
        description:
          'Categoria geral do caso (ex: Trabalhista, Civil, Penal, etc.)',
      },
      specialization_required: {
        type: SchemaType.STRING,
        description: 'Especialização jurídica necessária (opcional)',
      },
      case_summary: {
        type: SchemaType.STRING,
        description:
          'Resumo conciso do caso para o advogado avaliar rapidamente',
      },
      required_specialties: {
        type: SchemaType.STRING,
        description:
          'Especialidades jurídicas específicas requeridas para o caso (opcional)',
      },
    },
    required: ['case_summary'],
  },
};

export const updateConversationStatusFunction = {
  name: 'update_conversation_status',
  description:
    'Atualiza o status de uma conversa baseada no progresso da triagem',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      status: {
        type: SchemaType.STRING,
        enum: [
          'open',
          'active',
          'resolved_by_ai',
          'assigned',
          'completed',
          'abandoned',
        ],
        description: 'Novo status da conversa',
      },
      reason: {
        type: SchemaType.STRING,
        description: 'Razão da mudança de status',
      },
    },
    required: ['status'],
  },
};
